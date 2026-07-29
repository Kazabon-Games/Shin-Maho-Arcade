// Runeshatter Music module verification — drives the REAL page via the
// real Events bus (board:resolved/bomb:charge/bomb:detonate/match:plain/
// tier:up emitted from Game.attemptSwap/maybeUpdateTier) and reads live
// AudioParam/gain values, per STUDIO_BIBLE.md §14's "verify live, not by
// reading the code" discipline and the adaptive-game-audio skill's mandate
// to patch AudioContext node-creation rather than trust that correct-
// looking code produces the intended sound.
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/runeshatter-audio.js`.
const { chromium } = require('playwright');

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const BASE_URL = process.env.RUNESHATTER_URL || 'http://localhost:8935/runeshatter.html';

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  ok   -', label); }
  else { fail++; console.log('  FAIL -', label); }
}

// Same checkerboard-with-overrides builder as tests/runeshatter-adversarial.js
// (a c+r parity checkerboard has zero pre-existing runs anywhere, so every
// override list below produces EXACTLY the intended match, nothing else).
function checkerboardPattern(overrides) {
  const pattern = [];
  for (let r = 0; r < 8; r++) {
    const row = [];
    for (let c = 0; c < 8; c++) row.push((c + r) % 2 === 0 ? 'fire' : 'frost');
    pattern.push(row);
  }
  for (const [c, r, spec] of overrides) pattern[r][c] = spec;
  return pattern;
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.message));

  // Patch AudioContext node-creation before the page's own script runs —
  // same technique as tests/rig-audio.js, extended to BiquadFilterNode.type
  // and PannerNode.positionX (both genuinely new to this game per the
  // capability audit) and AudioParam.setValueCurveAtTime (also new).
  await page.addInitScript(() => {
    window.__audioCalls = { oscillators: [], biquads: [], panners: [], bufferSources: [], convolvers: [], curveSets: [] };
    const OrigOsc = window.AudioContext.prototype.createOscillator;
    window.AudioContext.prototype.createOscillator = function () {
      const node = OrigOsc.call(this);
      const rec = { type: null, freqSets: [], freqRamps: [] };
      let realType = node.type;
      Object.defineProperty(node, 'type', { get: () => realType, set: (v) => { realType = v; rec.type = v; } });
      const origSetVal = node.frequency.setValueAtTime.bind(node.frequency);
      node.frequency.setValueAtTime = (v, t) => { rec.freqSets.push(v); return origSetVal(v, t); };
      const origExpRamp = node.frequency.exponentialRampToValueAtTime.bind(node.frequency);
      node.frequency.exponentialRampToValueAtTime = (v, t) => { rec.freqRamps.push(v); return origExpRamp(v, t); };
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
    const OrigBiquad = window.AudioContext.prototype.createBiquadFilter;
    window.AudioContext.prototype.createBiquadFilter = function () {
      const node = OrigBiquad.call(this);
      const rec = { type: null };
      let realType = node.type;
      Object.defineProperty(node, 'type', { get: () => realType, set: (v) => { realType = v; rec.type = v; } });
      window.__audioCalls.biquads.push(rec);
      return node;
    };
    const OrigPanner = window.AudioContext.prototype.createPanner;
    window.AudioContext.prototype.createPanner = function () {
      const node = OrigPanner.call(this);
      const rec = { positionXValues: [] };
      if (node.positionX) {
        const origDesc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node.positionX), 'value')
          || Object.getOwnPropertyDescriptor(AudioParam.prototype, 'value');
        Object.defineProperty(node.positionX, 'value', {
          get: () => origDesc.get.call(node.positionX),
          set: (v) => { rec.positionXValues.push(v); origDesc.set.call(node.positionX, v); }
        });
      }
      window.__audioCalls.panners.push(rec);
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
    const OrigCurve = AudioParam.prototype.setValueCurveAtTime;
    AudioParam.prototype.setValueCurveAtTime = function (curve, t, dur) {
      window.__audioCalls.curveSets.push({ len: curve.length, dur, first: curve[0], peak: Math.max(...curve) });
      return OrigCurve.call(this, curve, t, dur);
    };
  });

  console.log('1. Load check');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof Music !== 'undefined' && typeof Music._test !== 'undefined' && typeof Game !== 'undefined' && typeof Board !== 'undefined');
  await page.waitForTimeout(300);
  ok(consoleErrors.length === 0, 'zero console errors on load (got: ' + JSON.stringify(consoleErrors) + ')');
  ok(pageErrors.length === 0, 'zero page errors on load (got: ' + JSON.stringify(pageErrors) + ')');
  ok(await page.isVisible('[aria-label="Mute"]'), 'mute icon-btn is present, matching every other shipped game\'s pattern');

  console.log('2. AudioContext lifecycle — created only from a real user gesture');
  let started = await page.evaluate(() => Music._test.isStarted());
  ok(started === false, 'audio not started before any input');
  await page.click('[aria-label="Endless mode"]'); // Game.startEndless() -> beginCommon() -> Music.ensureCtx()
  started = await page.evaluate(() => Music._test.isStarted());
  ok(started === true, 'audio starts on Endless mode-card click (a real user gesture)');
  const masterGain = await page.evaluate(() => Music._test.masterGainValue());
  ok(Math.abs(masterGain - 0.5) < 0.001, 'master gain is 0.5 unmuted (got ' + masterGain + ')');

  console.log('3. Drone baseline at tile-tier 4 — root+fifth audible, b7/tritone silent');
  await page.waitForTimeout(80); // let droneTick run a couple of frames
  const baseline = await page.evaluate(() => ({
    root: Music._test.droneVoiceGain('root'),
    fifth: Music._test.droneVoiceGain('fifth'),
    b7: Music._test.droneVoiceGain('b7'),
    tritone: Music._test.droneVoiceGain('tritone'),
    droneGain: Music._test.droneGain(),
    filterFreq: Music._test.droneFilterFreq(),
    heat: Music._test.heatValue(),
  }));
  ok(baseline.root > 0.5, 'root voice audible at tier 4 (got ' + baseline.root + ')');
  ok(baseline.fifth > 0.3, 'fifth voice audible at tier 4 (got ' + baseline.fifth + ')');
  ok(baseline.b7 === 0, 'b7 color-tone silent below tier 5 (got ' + baseline.b7 + ')');
  ok(baseline.tritone === 0, 'tritone color-tone silent below tier 6 (got ' + baseline.tritone + ')');
  ok(baseline.droneGain > 0, 'drone is audible while running (got ' + baseline.droneGain + ')');
  ok(baseline.heat === 0, 'chain heat starts at 0 with no bombs detonated yet');

  console.log('4. tier:up — Board.setProgress crossing the real 3,000-score Endless threshold, then Music reacts live');
  const tierResult = await page.evaluate(() => Board.setProgress(3000));
  ok(tierResult.changed === true && tierResult.tierCount === 5, 'Board.setProgress(3000) really does cross Endless\'s tier-5 threshold (GAME_7_PILLARS.md §3)');
  await page.evaluate(() => Events.emit('tier:up', { tierCount: 5 })); // the exact event Game.maybeUpdateTier() emits on this same condition
  await page.waitForTimeout(50);
  const midRamp = await page.evaluate(() => Music._test.droneVoiceGain('b7'));
  await page.waitForTimeout(1400);
  const afterRamp = await page.evaluate(() => Music._test.droneVoiceGain('b7'));
  ok(midRamp > 0 && midRamp < afterRamp, 'b7 gain is mid-ramp partway through the 1.3s tier-up transition (mid=' + midRamp + ', after=' + afterRamp + ')');
  ok(Math.abs(afterRamp - 0.30) < 0.02, 'b7 settles at its full baseGain 0.30 once the tier-up ramp completes (got ' + afterRamp + ')');
  const fanfareOscCount = await page.evaluate(() => window.__audioCalls.oscillators.filter(o => o.type === 'sine').length);
  ok(fanfareOscCount >= 8, 'tier-up fanfare actually scheduled real sine oscillators (4-note run + landing chord, got ' + fanfareOscCount + ' sine oscillators total incl. bell overtones)');

  console.log('5. bomb:charge + bomb:detonate — a real swap-triggered two-bomb chain via Game.attemptSwap');
  // Pre-swap board: row0 = frost,fire,fireBombA(area),frost — NO run yet.
  // BombB(lightning,line,col) sits at (2,1), inside BombA's 3x3 blast
  // footprint but untouched by the swap itself. Swapping (0,0)<->(0,1)
  // (vertical, adjacent) turns row0 cols0-2 into fire,fire,fireBombA — a
  // genuine NEW 3-run created BY THE SWAP, which sweeps BombA in, which
  // then chains into BombB. See this file's own comment above
  // checkerboardPattern() for why the checkerboard baseline guarantees no
  // other accidental runs exist anywhere else on the board.
  await page.evaluate(() => { window.__audioCalls.oscillators.length = 0; window.__audioCalls.biquads.length = 0; window.__audioCalls.panners.length = 0; window.__audioCalls.curveSets.length = 0; });
  const chainResult = await page.evaluate((pattern) => {
    Board._test.setBoard(pattern);
    const preRuns = Board._test.findRuns().length;
    const heatBefore = Music._test.heatValue();
    const swapOk = Game.attemptSwap({ col: 0, row: 0 }, { col: 0, row: 1 });
    const heatAfter = Music._test.heatValue();
    return { preRuns, swapOk, heatBefore, heatAfter };
  }, checkerboardPattern([
    [0, 0, 'frost'], [1, 0, 'fire'], [2, 0, { type: 'fire', bomb: 'area' }],
    [0, 1, 'fire'], [2, 1, { type: 'lightning', bomb: 'line', axis: 'col' }],
  ]));
  ok(chainResult.preRuns === 0, 'pre-swap board has zero existing runs (the match is genuinely created BY the swap, not already present)');
  ok(chainResult.swapOk === true, 'Game.attemptSwap accepts the vertical (0,0)<->(0,1) swap as valid');
  ok(chainResult.heatBefore === 0 && chainResult.heatAfter > 0, 'chain heat rises synchronously inside the bomb:detonate handler (before=' + chainResult.heatBefore + ', after=' + chainResult.heatAfter + ')');
  ok(Math.abs(chainResult.heatAfter - 0.44) < 0.02, 'heat increment matches 0.22*bombsDetonated for a real 2-bomb chain (got ' + chainResult.heatAfter + ', expected ~0.44)');

  await page.waitForTimeout(250); // let the staggered setTimeout-scheduled charge/detonation/escalation cues fire
  const audioAfterChain = await page.evaluate(() => window.__audioCalls);
  ok(audioAfterChain.panners.length >= 2, 'at least 2 spatial PannerNodes were created (one per detonation), the genuinely-unused-before-now technique (got ' + audioAfterChain.panners.length + ')');
  const pannedCols = audioAfterChain.panners.map(p => p.positionXValues[0]).filter(v => v !== undefined);
  ok(pannedCols.some(x => x !== 0), 'at least one detonation panner was positioned off-center, mapped to its actual grid column (values: ' + JSON.stringify(pannedCols) + ')');
  ok(audioAfterChain.biquads.some(b => b.type === 'notch'), 'a notch BiquadFilterNode was actually created (chain-escalation cue), the capability-audit technique — got types: ' + JSON.stringify(audioAfterChain.biquads.map(b => b.type)));
  ok(audioAfterChain.curveSets.length >= 1, 'setValueCurveAtTime was actually called for the shatter-impact envelope (count=' + audioAfterChain.curveSets.length + ')');
  if (audioAfterChain.curveSets.length) {
    const c = audioAfterChain.curveSets[0];
    // applyShatterEnvelope floors every curve sample at 0.00001 (never a
    // literal 0), so a crack that starts "from silence" reads as <0.001,
    // not ===0 — that floor is deliberate (see applyShatterEnvelope), not
    // a bug to assert against.
    ok(c.first < 0.001, 'shatter envelope starts effectively at silence (got ' + c.first + ')');
    ok(c.peak > 0.1, 'shatter envelope actually reaches an audible peak (got ' + c.peak + ')');
  }
  ok(audioAfterChain.biquads.some(b => b.type === 'lowpass') && audioAfterChain.biquads.some(b => b.type === 'bandpass'),
    'both the line-bomb fast-closing lowpass and the area-bomb bandpass burst fired (types: ' + JSON.stringify(audioAfterChain.biquads.map(b => b.type)) + ')');
  ok(audioAfterChain.oscillators.some(o => o.type === 'sine' && o.freqSets.includes(150) && o.freqRamps.includes(50)),
    'line-bomb pitch-swept thump actually scheduled 150Hz -> 50Hz');

  console.log('6. droneTick reacts to heat directly next frame (no re-ramp fighting the decay)');
  const filterAfterHeat = await page.evaluate(() => Music._test.droneFilterFreq());
  ok(filterAfterHeat > 500, 'drone filter opened well above its tier-5 baseline once heat is high (got ' + filterAfterHeat + 'Hz)');
  const distAfterHeat = await page.evaluate(() => Music._test.distortionAmount());
  ok(distAfterHeat > 0, 'distortion amount rose with heat (got ' + distAfterHeat + ')');
  await page.waitForTimeout(2200); // heat decay window (~1.8s to silence per HEAT_DECAY_PER_SEC)
  const heatDecayed = await page.evaluate(() => Music._test.heatValue());
  ok(heatDecayed === 0, 'heat fully decays back to 0 on its own without any new detonation (got ' + heatDecayed + ')');
  const distDecayed = await page.evaluate(() => Music._test.distortionAmount());
  // NOT asserting exactly 0: distortion = heat*0.42 + urgency*0.12, and
  // Endless's own urgency (elapsed-time-vs-tier, computeUrgency) is only
  // exactly 0 at elapsedSeconds===0 — by several seconds into this test
  // run it contributes a small nonzero amount by design (the whole point
  // of "elapsed-time escalation" is that it never resets to a hard zero).
  // Heat alone (already independently confirmed at exactly 0 above) is
  // what this stage is really checking.
  ok(distDecayed < 0.01, 'distortion is negligible once heat (the dominant term) has fully decayed (got ' + distDecayed + ')');

  console.log('7. match:plain — an ordinary match with no bomb involvement gets its own distinct cue');
  await page.evaluate(() => { window.__audioCalls.oscillators.length = 0; });
  const plainResult = await page.evaluate((pattern) => {
    Board._test.setBoard(pattern);
    return Game.attemptSwap({ col: 0, row: 0 }, { col: 0, row: 1 });
  }, checkerboardPattern([[0, 0, 'frost'], [1, 0, 'fire'], [2, 0, 'fire'], [0, 1, 'fire']]));
  ok(plainResult === true, 'the plain-match swap is accepted');
  await page.waitForTimeout(30);
  const plainOscCount = await page.evaluate(() => window.__audioCalls.oscillators.length);
  ok(plainOscCount > 0, 'a plainMatchClink bell fired for a non-bomb match (oscillators=' + plainOscCount + ')');

  console.log('8. Mute toggle — matches the studio-wide icon-btn pattern and actually silences master');
  const mutedNow = await page.evaluate(() => Music.toggleMute());
  ok(mutedNow === true, 'toggleMute() returns true (now muted)');
  await page.waitForTimeout(200);
  const mutedGain = await page.evaluate(() => Music._test.masterGainValue());
  ok(mutedGain < 0.01, 'master gain actually ramped to ~0 when muted (got ' + mutedGain + ')');
  const unmutedNow = await page.evaluate(() => Music.toggleMute());
  ok(unmutedNow === false, 'toggleMute() returns false (unmuted again)');
  await page.waitForTimeout(200);
  const restoredGain = await page.evaluate(() => Music._test.masterGainValue());
  ok(Math.abs(restoredGain - 0.5) < 0.01, 'master gain ramps back to 0.5 when unmuted (got ' + restoredGain + ')');

  console.log('9. Full playthrough sequence does not throw: swap -> match -> bomb -> chain -> tier-up -> game-over');
  await page.evaluate(() => { Game._test.forceMode('endless'); });
  const playthroughErrorsBefore = pageErrors.length;
  await page.evaluate((pattern) => {
    Board._test.setBoard(pattern);
    Game.attemptSwap({ col: 0, row: 0 }, { col: 0, row: 1 }); // match+bomb+chain again
    Events.emit('tier:up', { tierCount: 6 }); // exercise the tritone layer + a second fanfare
    Game.endRunFromPause(); // force a real game:over without waiting out a full run
  }, checkerboardPattern([
    [0, 0, 'frost'], [1, 0, 'fire'], [2, 0, { type: 'fire', bomb: 'area' }],
    [0, 1, 'fire'], [2, 1, { type: 'lightning', bomb: 'line', axis: 'col' }],
  ]));
  await page.waitForTimeout(300);
  ok(pageErrors.length === playthroughErrorsBefore, 'zero NEW page errors across the full swap->match->bomb->chain->tier-up->game-over sequence (got: ' + JSON.stringify(pageErrors.slice(playthroughErrorsBefore)) + ')');
  const postGameOverGain = await page.evaluate(() => Music._test.droneGain());
  ok(postGameOverGain === 0, 'drone silences itself once Game.isRunning() is false, next frame, with no error (got ' + postGameOverGain + ')');
  ok(consoleErrors.length === 0, 'still zero console errors after the full playthrough (got: ' + JSON.stringify(consoleErrors) + ')');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
