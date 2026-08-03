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
  // Dismiss the title/mode-select overlay (GAME_5_PILLARS.md §3/§4) --
  // mirrors wardfall.html's tests calling Game.startRound() directly.
  await page.evaluate(() => window.startDuel());

  // Shared helpers for the Music v2 (Duel differentiation) sections below --
  // same shape as tests/rig-match.js's own freshDuel()/landOneRingOut().
  async function freshDuel() {
    await page.evaluate(() => {
      window.Rig._test.resetSession();
      window.Rig._test.freezeSpawns();
      window.Rig._test.clearEnemies();
      window.Rig2._test.reset();
      window.Duel._test.resetMatch();
    });
  }
  async function landOneRingOut() {
    await page.evaluate(() => { window.Rig._test.teleportTo(120); window.Rig2._test.teleportTo(150); });
    await page.evaluate(() => window.Rig._test.trigger('R'));
    await page.waitForTimeout(700); // strike lands, knockback carries p2 out, ring-out resolves
  }

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

  console.log('7. Music v2 — mode tracking and per-mode drone-filter Q differentiation');
  await page.evaluate(() => window.startGauntlet());
  await page.waitForTimeout(80); // a few rAF ticks so tick() applies the new mode
  let musicMode = await page.evaluate(() => window.Music._test.modeValue());
  ok(musicMode === 'gauntlet', 'mode tracks the visible Gauntlet mode');
  let q1 = await page.evaluate(() => window.Music._test.droneFilterQ());
  ok(Math.abs(q1 - 0.7) < 0.01, 'drone filter Q is the calmer Gauntlet value (0.7), got ' + q1);
  await page.evaluate(() => window.startDuel());
  await page.waitForTimeout(80);
  musicMode = await page.evaluate(() => window.Music._test.modeValue());
  ok(musicMode === 'duel', 'mode tracks the visible Duel mode');
  let q2 = await page.evaluate(() => window.Music._test.droneFilterQ());
  ok(Math.abs(q2 - 2.2) < 0.01, 'drone filter Q is the tenser Duel value (2.2), distinct from Gauntlet\'s 0.7, got ' + q2);

  console.log('8. Duel clash-voice gain rises as the fighters close distance (proximity signal)');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(-160); window.Rig2._test.teleportTo(160); });
  await page.waitForTimeout(600); // let duelProximity settle low (0.03/frame smoothing)
  const gainFar = await page.evaluate(() => window.Music._test.clashVoiceGain());
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(10); });
  await page.waitForTimeout(600); // let duelProximity settle high
  const gainClose = await page.evaluate(() => window.Music._test.clashVoiceGain());
  ok(gainClose > gainFar, 'clash-voice gain is higher when the fighters are close than when walled apart (far=' + gainFar.toFixed(4) + ', close=' + gainClose.toFixed(4) + ')');

  console.log('9. Guard-break risk raises Duel intensity when a fighter is low on guard meter while guarding');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(-160); window.Rig2._test.teleportTo(160); window.Rig._test.setGuard(false); });
  await page.waitForTimeout(600);
  const intensityCalm = await page.evaluate(() => window.Music._test.intensityValue());
  await page.evaluate(() => { window.Rig._test.setGuard(true); window.Rig._test.damageGuardMeter(90); });
  await page.waitForTimeout(250); // enough for the target bump to register before natural drain (40/sec) forces guard down
  const intensityGuardRisk = await page.evaluate(() => window.Music._test.intensityValue());
  ok(intensityGuardRisk > intensityCalm, 'intensity rises once a guarding fighter drops below the guard-break risk threshold (calm=' + intensityCalm.toFixed(3) + ', guardRisk=' + intensityGuardRisk.toFixed(3) + ')');
  await page.evaluate(() => window.Rig._test.setGuard(false));

  console.log('10. Reaching match point (one score from winning) raises Duel intensity by itself');
  await freshDuel();
  await page.waitForTimeout(600);
  const intensityFresh = await page.evaluate(() => window.Music._test.intensityValue());
  await landOneRingOut();
  await landOneRingOut(); // p1Score now 2 -- one away from MATCH_TARGET_SCORE (3)
  const scoreState = await page.evaluate(() => window.Duel._test.state());
  ok(scoreState.p1Score === 2 && scoreState.matchOver === false, 'match point reached (2 of 3), not yet decided');
  await page.waitForTimeout(600);
  const intensityMatchPoint = await page.evaluate(() => window.Music._test.intensityValue());
  ok(intensityMatchPoint > intensityFresh, 'intensity is higher at match point than at a fresh, scoreless match reset to the same distance (fresh=' + intensityFresh.toFixed(3) + ', matchPoint=' + intensityMatchPoint.toFixed(3) + ')');

  console.log('11. Reduced-motion preference caps Duel intensity at 0.5, even with every term stacked');
  await freshDuel();
  await landOneRingOut();
  await landOneRingOut(); // p1Score now 2 -- match point, same as §10
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(5); window.Rig._test.setGuard(true); window.Rig._test.damageGuardMeter(90); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // The cap clamps the TARGET every frame, not the smoothed value directly
  // -- intensity was already elevated from the stacked setup above, so it
  // needs real convergence time (0.03/frame EMA) to settle back down to
  // the new capped target rather than snapping to it instantly.
  await page.waitForTimeout(3000);
  const cappedIntensity = await page.evaluate(() => window.Music._test.intensityValue());
  ok(cappedIntensity <= 0.505, 'intensity converges back down to the 0.5 cap under a reduced-motion preference even with proximity+guardRisk+matchPoint all stacked (got ' + cappedIntensity.toFixed(3) + ')');
  await page.evaluate(() => window.Rig._test.setGuard(false));
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  console.log('12. A parried connect fires a bell stinger (Music.parryStinger), not just the SFX chime');
  await freshDuel();
  await page.evaluate(() => { window.__audioCalls.oscillators.length = 0; });
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); });
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(100); // still in windup -- raise guard right before the strike lands
  await page.evaluate(() => window.Rig2._test.setGuard(true));
  await page.waitForTimeout(40); // now in the strike phase, well within the parry window
  calls = await page.evaluate(() => window.__audioCalls);
  const parryBell = calls.oscillators.find(o => o.type === 'sine' && o.freqSets.some(f => Math.abs(f - 1567.98) < 0.01));
  ok(!!parryBell, 'a sine bell voice at the parry stinger\'s fifth (1567.98Hz) fires on a parried connect');
  await page.evaluate(() => window.Rig2._test.setGuard(false));

  console.log('13. A ring-out fires a two-note stinger; winning the match fires the fuller four-note sequence');
  await freshDuel();
  await page.evaluate(() => { window.__audioCalls.oscillators.length = 0; });
  await landOneRingOut();
  await page.waitForTimeout(150); // let the ringOutStinger's 70ms-delayed second bell fire
  calls = await page.evaluate(() => window.__audioCalls);
  const bellRoot1 = calls.oscillators.filter(o => o.type === 'sine' && o.freqSets.some(f => Math.abs(f - 1046.50) < 0.01));
  const bellFifth1 = calls.oscillators.filter(o => o.type === 'sine' && o.freqSets.some(f => Math.abs(f - 1567.98) < 0.01));
  ok(bellRoot1.length >= 1 && bellFifth1.length >= 1, 'ringOutStinger fires both the root (1046.50Hz) and fifth (1567.98Hz) bell voices');

  await page.evaluate(() => { window.__audioCalls.oscillators.length = 0; });
  await landOneRingOut(); // p1Score now 2
  await landOneRingOut(); // p1Score now 3 -- decides the match
  const decided = await page.evaluate(() => window.Duel._test.state());
  ok(decided.matchOver === true && decided.matchWinner === 'P1', 'the match is decided after the third ring-out');
  await page.waitForTimeout(700); // matchWinStinger's last bell fires at +500ms, plus its own decay tail
  calls = await page.evaluate(() => window.__audioCalls);
  const rootBells = calls.oscillators.filter(o => o.type === 'sine' && o.freqSets.some(f => Math.abs(f - 1046.50) < 0.01)).length;
  const fifthBells = calls.oscillators.filter(o => o.type === 'sine' && o.freqSets.some(f => Math.abs(f - 1567.98) < 0.01)).length;
  ok(rootBells >= 2 && fifthBells >= 2, 'the decisive point fires a fuller root/fifth sequence than a plain ring-out alone (ringOutStinger + matchWinStinger both fire), got ' + rootBells + ' root + ' + fifthBells + ' fifth bells');

  console.log('14. The Gauntlet-only heartbeat pulse fires in Gauntlet mode and stays silent in Duel');
  await page.evaluate(() => window.startGauntlet());
  await page.evaluate(() => { window.Rig._test.resetSession(); window.Rig._test.freezeSpawns(); window.Rig._test.clearEnemies(); window.__audioCalls.oscillators.length = 0; });
  await page.waitForTimeout(500); // nextHeartbeatAt starts at 0, so the first pulse fires on the very next tick
  calls = await page.evaluate(() => window.__audioCalls);
  const heartbeat = calls.oscillators.find(o => o.type === 'sine' && o.freqSets.includes(90) && o.freqRamps.includes(42));
  ok(!!heartbeat, 'a heartbeat pulse (sine, 90Hz dropping to 42Hz) fires in Gauntlet mode with no enemies present');
  await page.evaluate(() => window.startDuel());
  await page.evaluate(() => { window.Duel._test.resetMatch(); window.__audioCalls.oscillators.length = 0; });
  await page.waitForTimeout(1400); // longer than Gauntlet's own worst-case heartbeat interval (1.15s at zero intensity)
  calls = await page.evaluate(() => window.__audioCalls);
  const heartbeatInDuel = calls.oscillators.find(o => o.type === 'sine' && o.freqSets.includes(90) && o.freqRamps.includes(42));
  ok(!heartbeatInDuel, 'no heartbeat pulse fires while Duel is the visible mode (mode-gated, not just a lower rate)');

  console.log('15. No page errors from any of the above');
  ok(pageErrors.length === 0, 'zero page errors across all audio triggers (' + pageErrors.length + ' found)');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
