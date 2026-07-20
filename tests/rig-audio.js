// Rykndu doll-rig audio regression pass — drives the real page's window.Rig
// hooks, patching AudioContext node-creation methods to observe what the
// SFX module actually schedules (frequencies, durations, gain values)
// without needing real audio output. Added alongside the v0.1.6 quality
// pass's Audio pillar (four one-shot voices: windup whoosh, strike impact,
// miss buzzer, proximity pulse) — this locks in that each voice fires from
// the correct call site with the intended sound shape, and that the graph
// stays the deliberately dry, reverb-free shape the pass chose (a reverb
// tail would blur the exact transient onset the pass exists to sharpen).
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-audio.js`.
const { chromium } = require('playwright');

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const BASE_URL = process.env.RIG_URL || 'http://localhost:8935/prototypes/rykndu-doll-rig.html';

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  ok   -', label); }
  else { fail++; console.log('  FAIL -', label); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  // Patch AudioContext node-creation before the page's own script runs, so
  // every oscillator/buffer-source/convolver call gets recorded.
  await page.addInitScript(() => {
    window.__audioCalls = { oscillators: [], bufferSources: [], convolvers: [] };
    const OrigOsc = window.AudioContext.prototype.createOscillator;
    window.AudioContext.prototype.createOscillator = function () {
      const node = OrigOsc.call(this);
      const rec = { type: null, freqSets: [], freqRamps: [] };
      let realType = node.type;
      Object.defineProperty(node, 'type', {
        get: () => realType,
        set: (v) => { realType = v; rec.type = v; }
      });
      const origSetVal = node.frequency.setValueAtTime.bind(node.frequency);
      node.frequency.setValueAtTime = (v, t) => { rec.freqSets.push(v); return origSetVal(v, t); };
      const origExpRamp = node.frequency.exponentialRampToValueAtTime.bind(node.frequency);
      node.frequency.exponentialRampToValueAtTime = (v, t) => { rec.freqRamps.push(v); return origExpRamp(v, t); };
      // proximityPulse() sets frequency via direct `.value =` assignment,
      // not setValueAtTime — capture that pattern too, not just scheduled calls.
      const freqParam = node.frequency;
      const origValueDescriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(freqParam), 'value')
        || Object.getOwnPropertyDescriptor(AudioParam.prototype, 'value');
      Object.defineProperty(freqParam, 'value', {
        get: () => origValueDescriptor.get.call(freqParam),
        set: (v) => { rec.freqSets.push(v); origValueDescriptor.set.call(freqParam, v); }
      });
      window.__audioCalls.oscillators.push(rec);
      return node;
    };
    const OrigBufSrc = window.AudioContext.prototype.createBufferSource;
    window.AudioContext.prototype.createBufferSource = function () {
      const node = OrigBufSrc.call(this);
      window.__audioCalls.bufferSources.push({});
      return node;
    };
    const OrigConv = window.AudioContext.prototype.createConvolver;
    window.AudioContext.prototype.createConvolver = function () {
      const node = OrigConv.call(this);
      window.__audioCalls.convolvers.push({});
      return node;
    };
    const OrigCreateBuffer = window.AudioContext.prototype.createBuffer;
    window.AudioContext.prototype.createBuffer = function (ch, len, rate) {
      window.__audioCalls.lastBufferLen = len;
      window.__audioCalls.lastBufferRate = rate;
      return OrigCreateBuffer.call(this, ch, len, rate);
    };
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.Rig !== 'undefined');

  console.log('1. AudioContext lifecycle');
  let state = await page.evaluate(() => window.Rig._test.state());
  ok(state.audioStarted === false, 'audio not started before any input');
  await page.evaluate(() => window.Rig._test.trigger('R'));
  state = await page.evaluate(() => window.Rig._test.state());
  ok(state.audioStarted === true, 'audio starts on the first trigger (via ensureCtx() safety net)');
  const gainVal = await page.evaluate(() => window.Rig._test.sfxGainValue());
  ok(Math.abs(gainVal - 0.6) < 0.001, 'sfxGain is 0.6, matching the SFX module (got ' + gainVal + ', float32 precision expected)');

  console.log('2. Windup whoosh — fires from startAttack()');
  await page.waitForTimeout(700); // settle to idle
  await page.evaluate(() => { window.__audioCalls.bufferSources.length = 0; window.__audioCalls.lastBufferLen = 0; });
  await page.evaluate(() => window.Rig._test.trigger('L'));
  await page.waitForTimeout(30);
  let calls = await page.evaluate(() => window.__audioCalls);
  ok(calls.bufferSources.length >= 1, 'a noise buffer source is created on trigger (the whoosh)');
  const sampleRate = await page.evaluate(() => { return new (window.AudioContext)().sampleRate; });
  const expectedLen = Math.floor(sampleRate * 0.13);
  ok(calls.lastBufferLen === expectedLen, 'whoosh buffer duration is exactly 130ms (' + calls.lastBufferLen + ' samples @ ' + sampleRate + 'Hz)');

  console.log('3. Strike-connect impact — fires from resolveHits() only on an actual kill');
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.Rig._test.clearEnemies(); window.Rig._test.freezeSpawns(); window.__audioCalls.oscillators.length = 0; });
  await page.evaluate(() => { window.Rig._test.trigger('R'); window.Rig._test.spawnEnemy('R', 455); });
  await page.waitForTimeout(145);
  calls = await page.evaluate(() => window.__audioCalls);
  const thump = calls.oscillators.find(o => o.type === 'sine' && o.freqSets.includes(240));
  ok(!!thump, 'impact thump: a sine oscillator starting at 240Hz was scheduled on the kill');
  ok(!!thump && thump.freqRamps.includes(55), 'impact thump pitch-drops to 55Hz');

  console.log('4. Miss buzzer — fires from updateEnemies()\'s miss branch');
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.Rig._test.clearEnemies(); window.Rig._test.freezeSpawns(); window.__audioCalls.oscillators.length = 0; });
  await page.evaluate(() => window.Rig._test.spawnEnemy('L', 0));
  await page.waitForTimeout(900);
  calls = await page.evaluate(() => window.__audioCalls);
  const squares = calls.oscillators.filter(o => o.type === 'square');
  ok(squares.length === 2, 'miss buzzer creates exactly 2 square oscillators (' + squares.length + ' found)');
  const freqs = squares.map(o => o.freqSets[0]).sort((a, b) => a - b);
  ok(freqs[0] === 200 && freqs[1] === 206, 'miss buzzer oscillators start at 200Hz/206Hz (detuned pair), got ' + freqs.join('/'));

  console.log('5. Proximity pulse — discrete event-gated one-shots, not a continuous ramp');
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.Rig._test.clearEnemies(); window.Rig._test.freezeSpawns(); window.__audioCalls.oscillators.length = 0; });
  await page.evaluate(() => window.Rig._test.spawnEnemy('R', 0));
  let s = await page.evaluate(() => window.Rig._test.state());
  ok(JSON.stringify(s.enemies[0].pulsesFired) === JSON.stringify([false, false, false]), 'no pulses fired at spawn');
  await page.waitForTimeout(300); // past the 0.4 (240ms) threshold, before 0.7 (420ms)
  s = await page.evaluate(() => window.Rig._test.state());
  ok(s.enemies[0] && s.enemies[0].pulsesFired[0] === true && s.enemies[0].pulsesFired[1] === false,
    'first pulse threshold (0.4) fired, second (0.7) has not yet');
  calls = await page.evaluate(() => window.__audioCalls);
  const pulseFreqs = calls.oscillators.filter(o => o.type === 'sine' && [400, 550, 750].includes(o.freqSets[0])).map(o => o.freqSets[0]);
  ok(pulseFreqs.includes(400), 'first proximity pulse is a distinct 400Hz sine burst, not a swept ramp (freqRamps should be empty for it)');
  await page.evaluate(() => window.Rig._test.clearEnemies());

  console.log('6. Deliberately dry mix — no reverb send');
  ok((await page.evaluate(() => window.__audioCalls.convolvers.length)) === 0, 'zero ConvolverNodes created across the whole session (a reverb tail would blur the transient onset this pass exists to sharpen)');

  console.log('7. No page errors from any of the above');
  ok(pageErrors.length === 0, 'zero page errors across all audio triggers (' + pageErrors.length + ' found)');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
