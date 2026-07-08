// Rykndu doll-rig attack-sequence regression pass — drives the real page
// through its own window.Rig._test hook (never a duplicated copy of the
// pose/sequence logic), so this never drifts from the shipped code. Added
// after two real bugs were found in prototypes/rykndu-doll-rig.html by
// simulating the pose math (a circular self-read in startAttack(), and a
// mirrored-angle wraparound), plus a structural fix making the recovery
// phase interruptible — this test locks in both the crash-safety and the
// committed-phase/recovery-interrupt timing contract going forward.
// Section 6 covers the v0.1.4 solveRig()/renderRig() split — the foot/hand
// world-positions that real hit detection will read from next.
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-sequence.js`.
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
  const consoleErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) consoleErrors.push(msg.text()); });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.Rig !== 'undefined');

  console.log('1. Crash safety under heavy mashing');
  await page.evaluate(() => {
    window.Rig._test.trigger('R');
    for (let i = 0; i < 500; i++) window.Rig._test.trigger(i % 2 === 0 ? 'L' : 'R');
  });
  await page.waitForTimeout(1500);
  ok(pageErrors.length === 0, 'zero page errors after 500 synchronous triggers');
  ok(consoleErrors.length === 0, 'zero console errors after 500 synchronous triggers');
  let state = await page.evaluate(() => window.Rig._test.state());
  // seqIdx is left stale (not reset) once a sequence ends and seq goes null —
  // startAttack() always resets it to 0 before it's read again, so it's only
  // meaningful to bounds-check while an attack is actually in progress.
  ok(state.idle || state.seqIdx < state.seqLen, 'seqIdx never exceeds seqLen while an attack is active (' + state.seqIdx + '/' + state.seqLen + ')');

  console.log('2. Committed phase (windup+strike) cannot be interrupted');
  await page.waitForTimeout(600); // let everything settle to idle
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(30); // still well inside the 110ms windup
  let mid = await page.evaluate(() => window.Rig._test.state());
  ok(!mid.idle && mid.committed === true, 'still in committed phase ~30ms into an attack');
  await page.evaluate(() => window.Rig._test.trigger('L'));
  let afterTrigger = await page.evaluate(() => window.Rig._test.state());
  ok(afterTrigger.queuedSide === 'L', 'input during committed phase buffers instead of interrupting');

  console.log('3. Buffered input fires at committed-phase end, not after full recovery');
  const startWait = Date.now();
  await page.waitForFunction(() => window.Rig._test.state().queuedSide === null, { timeout: 1000 });
  const firedAfterMs = Date.now() - startWait;
  ok(firedAfterMs < 350, 'buffered attack fired in ' + firedAfterMs + 'ms (must be well under the old 400ms full-sequence wait)');

  console.log('4. Recovery phase can be interrupted immediately');
  await page.waitForTimeout(700); // settle to idle
  await page.evaluate(() => window.Rig._test.trigger('R'));
  // The committed (windup+strike) window is ~180ms; wait comfortably past it
  // (but well short of recovery's own ~400ms end) so real event-loop/rAF
  // jitter can't make this flaky the way a tight ~190ms margin can.
  await page.waitForTimeout(280);
  let inRecovery = await page.evaluate(() => window.Rig._test.state());
  ok(!inRecovery.idle && inRecovery.committed === false, 'sitting in the interruptible recovery phase at ~280ms');
  await page.evaluate(() => window.Rig._test.trigger('L'));
  let afterInterrupt = await page.evaluate(() => window.Rig._test.state());
  ok(afterInterrupt.seqIdx === 0 && afterInterrupt.queuedSide === null, 'trigger during recovery starts the new attack immediately (seqIdx reset to 0), not buffered');

  console.log('5. Left-side kick spine does not windmill');
  await page.waitForTimeout(700);
  await page.evaluate(() => window.Rig._test.trigger('L'));
  const spineTrace = [];
  for (let i = 0; i < 6; i++) {
    spineTrace.push((await page.evaluate(() => window.Rig._test.state().pose.spineA)));
    await page.waitForTimeout(16);
  }
  let maxStep = 0;
  for (let i = 1; i < spineTrace.length; i++) maxStep = Math.max(maxStep, Math.abs(spineTrace[i] - spineTrace[i - 1]));
  ok(maxStep < 0.5, 'left-kick spineA moves smoothly frame-to-frame (max step ' + maxStep.toFixed(3) + ' rad), no ~2pi wraparound sweep');

  console.log('6. solveRig() exposes real joint world-positions (the v0.1.4 refactor)');
  await page.waitForTimeout(700); // settle to idle
  const idleJoints = (await page.evaluate(() => window.Rig._test.state())).joints;
  const expectedJoints = ['pelvis', 'hipL', 'kneeL', 'footL', 'hipR', 'kneeR', 'footR',
    'chest', 'shoulderL', 'elbowL', 'handL', 'shoulderR', 'elbowR', 'handR', 'head'];
  const hasAllFinite = expectedJoints.every(k => idleJoints[k] &&
    Number.isFinite(idleJoints[k].x) && Number.isFinite(idleJoints[k].y));
  ok(hasAllFinite, 'all ' + expectedJoints.length + ' joints present with finite x/y at idle');
  ok(idleJoints.footL.x < idleJoints.footR.x, 'idle stance: left foot sits left of right foot (sane spatial layout)');

  // The strike phase is exactly the window Phase 2 (real hit detection) will
  // read a foot position from — confirm it actually moves, not just exists.
  const idleFootRX = idleJoints.footR.x;
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(150); // inside the strike phase (110-180ms)
  const strikeJoints = (await page.evaluate(() => window.Rig._test.state())).joints;
  const kickReach = Math.abs(strikeJoints.footR.x - idleFootRX);
  ok(kickReach > 20, 'kicking foot (footR) has moved meaningfully from idle during strike (moved ' + kickReach.toFixed(1) + 'px)');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
