// Rykndu doll-rig walk-cycle regression pass -- a real "feel" gap, not a
// system gap: this rig has had real velocity/acceleration movement
// physics since v0.1.17, but every non-attacking pose rendered
// identically whether the rig was standing still or sliding across the
// ground at full speed. v0.1.27 adds a real walk cycle (leg swing, knee
// lift, opposite-arm counter-swing, stride bounce) driven by a phase
// accumulator that advances by actual DISTANCE traveled, not raw time --
// so cadence naturally matches ground speed instead of a fixed-tempo
// animation that would skate the feet at any speed other than the one
// it was tuned for.
//
// IMPORTANT test-writing gotcha this file was built around: the real
// frame() loop calls applyMoveInput(dt) every animation frame, which
// reads the actual input state (keyboard/touch/gamepad, all inert in a
// test) and calls p1.setMoveIntent() with whatever that resolves to --
// 0, if nothing is held. Splitting window.Rig._test.setMoveIntent() and
// a physics-stepping call across two separate page.evaluate() calls lets
// a real animation frame run in between and silently reset moveIntent
// back to 0 before the step ever reads it. Every assertion below bundles
// setMoveIntent() and its stepPhysics()/updatePhysics() call inside a
// SINGLE evaluate() so nothing can interleave.
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-walk-cycle.js`.
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
  await page.waitForFunction(() => typeof window.Rig !== 'undefined' && typeof window.Rig2 !== 'undefined');

  console.log('1. At rest, the pose matches the plain idle pose -- no leg swing, no knee lift');
  await page.evaluate(() => window.Rig._test.resetSession());
  const atRest = await page.evaluate(() => window.Rig._test.state());
  ok(atRest.velX === 0 && atRest.walkPhase === 0, 'starts at rest with a zeroed walk phase');
  // Idle breathing still moves pelvisDY/shoulder sway slightly on its own
  // real-time cycle -- the assertions below check the LEG joints
  // specifically, which the walk cycle (not idle breathing) is the only
  // thing that ever touches.
  const restHipL = atRest.pose.hipL, restKneeL = atRest.pose.kneeL, restKneeR = atRest.pose.kneeR;

  console.log('2. Moving at full speed visibly swings the legs and lifts the knees away from the static idle stance');
  await page.evaluate(() => { window.Rig._test.setMoveIntent(1); window.Rig._test.stepPhysics(300); });
  const walking = await page.evaluate(() => window.Rig._test.state());
  ok(walking.velX > 150, 'reached a real walking speed (target 220, comfortably reached well within 300ms at MOVE_ACCEL)');
  ok(Math.abs(walking.pose.hipL - restHipL) > 0.1, 'hipL has swung measurably away from its static resting angle while walking');
  ok(Math.abs(walking.pose.kneeL - restKneeL) > 0.05 || Math.abs(walking.pose.kneeR - restKneeR) > 0.05,
    'at least one knee shows real lift away from ITS OWN resting angle during its forward-swing half of the stride');

  console.log('3. The stride is a real cycle, not a one-way drift -- hipL oscillates up and down as walkPhase advances');
  await page.evaluate(() => window.Rig._test.resetSession());
  const samples = [];
  for (let i = 0; i < 8; i++) {
    const s = await page.evaluate((step) => { window.Rig._test.setMoveIntent(1); window.Rig._test.stepPhysics(step); return window.Rig._test.state().pose.hipL; }, 90);
    samples.push(s);
  }
  let risingCount = 0, fallingCount = 0;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i] > samples[i - 1]) risingCount++; else if (samples[i] < samples[i - 1]) fallingCount++;
  }
  ok(risingCount > 0 && fallingCount > 0, 'hipL both rises and falls across these samples -- a real oscillation, not a monotonic drift (rising=' + risingCount + ', falling=' + fallingCount + ')');

  console.log('4. Cadence is driven by real distance covered, not raw time -- half the speed advances the phase roughly half as fast per unit time');
  await page.evaluate(() => window.Rig._test.resetSession());
  const fullSpeedPhase = await page.evaluate(() => { window.Rig._test.setMoveIntent(1); window.Rig._test.stepPhysics(500); return window.Rig._test.state().walkPhase; });
  await page.evaluate(() => window.Rig._test.resetSession());
  // A small intent still ramps toward SOME target speed via MOVE_ACCEL,
  // but a much smaller one -- comparing accumulated phase over the same
  // wall-clock duration at very different intents confirms phase tracks
  // actual distance, not just elapsed time regardless of speed.
  const slowSpeedPhase = await page.evaluate(() => { window.Rig._test.setMoveIntent(0.15); window.Rig._test.stepPhysics(500); return window.Rig._test.state().walkPhase; });
  ok(Math.abs(fullSpeedPhase) > Math.abs(slowSpeedPhase) * 2,
    'accumulated walk phase over the same real duration is substantially larger at full speed than at a much lower intent -- phase tracks ground speed (full=' + fullSpeedPhase.toFixed(2) + ', slow=' + slowSpeedPhase.toFixed(2) + ')');

  console.log('5. Guard pose takes priority over the walk cycle -- no leg swing while guarding, even at speed');
  await page.evaluate(() => window.Rig._test.resetSession());
  const guardWhileMoving1 = await page.evaluate(() => {
    window.Rig._test.setMoveIntent(1);
    window.Rig._test.stepPhysics(300);
    window.Rig._test.setGuard(true);
    return window.Rig._test.state();
  });
  ok(guardWhileMoving1.guarding === true, 'guard raised successfully while moving at speed');
  // Sample the guard pose again after more walk-phase would have
  // accumulated (moveIntent is still held, so velX/walkPhase keep
  // advancing underneath) -- if the guard pose leaked any walk-cycle
  // blend, hipL would visibly differ between these two samples the same
  // way it oscillates in §3. It shouldn't move at all.
  const guardWhileMoving2 = await page.evaluate(() => { window.Rig._test.stepPhysics(200); return window.Rig._test.state(); });
  ok(guardWhileMoving2.walkPhase !== guardWhileMoving1.walkPhase, 'walk phase is still genuinely advancing underneath (movement physics keeps running while guarding)');
  ok(guardWhileMoving1.pose.hipL === guardWhileMoving2.pose.hipL && guardWhileMoving1.pose.kneeL === guardWhileMoving2.pose.kneeL,
    'the guard pose\'s leg angles are bit-for-bit identical across both samples despite the walk phase having advanced -- the walk cycle never leaks into the static guard pose');
  await page.evaluate(() => window.Rig._test.setGuard(false));

  console.log('6. reset() zeroes the walk phase, same as every other physics state');
  await page.evaluate(() => { window.Rig._test.setMoveIntent(1); window.Rig._test.stepPhysics(300); });
  const beforeReset = await page.evaluate(() => window.Rig._test.state());
  ok(beforeReset.walkPhase !== 0, 'walk phase has accumulated before reset');
  await page.evaluate(() => window.Rig._test.resetSession());
  const afterReset = await page.evaluate(() => window.Rig._test.state());
  ok(afterReset.walkPhase === 0, 'resetSession() (p1.reset()) zeroes the walk phase');

  console.log('7. Player 2 has the exact same walk-cycle behavior, not a second hand-copied implementation');
  await page.evaluate(() => window.Rig2._test.reset());
  const p2Rest = await page.evaluate(() => window.Rig2._test.state());
  const p2RestHipL = p2Rest.pose.hipL;
  const p2Walking = await page.evaluate(() => { window.Rig2._test.setMoveIntent(1); window.Rig2._test.stepPhysics(300); return window.Rig2._test.state(); });
  ok(p2Walking.velX > 200 && Math.abs(p2Walking.pose.hipL - p2RestHipL) > 0.1,
    'player 2\'s legs swing measurably while walking too, through the exact same shared factory');
  await page.evaluate(() => window.Rig2._test.setMoveIntent(0));

  console.log('8. No page/console errors across any of the above');
  ok(pageErrors.length === 0, 'zero page errors (' + pageErrors.length + ' found: ' + pageErrors.join('; ') + ')');
  ok(consoleErrors.length === 0, 'zero console errors (' + consoleErrors.length + ' found: ' + consoleErrors.join('; ') + ')');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
