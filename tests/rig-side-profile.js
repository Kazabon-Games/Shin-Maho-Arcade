// Rykndu doll-rig side-profile regression pass -- v0.1.28 replaced the
// front-on rig (hips/shoulders spread symmetrically left-right, "facing
// the camera" regardless of movement direction -- a real producer
// complaint: "facing forward while moving sideways... doesn't look like
// the reference images at all") with a genuine profile stance: every
// POSES entry authored once in canonical facing-right space, with
// solveRig()'s own facing parameter mirroring the whole solved joint set
// around pelvis.x for facing 'L'. This file verifies the two structural
// claims that make that true: the mirror is geometrically exact, and the
// poses themselves are genuinely asymmetric (fore/aft), not still a
// symmetric shape that would mirror to itself and look unchanged.
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-side-profile.js`.
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

  console.log('1. The idle pose is genuinely asymmetric fore/aft, not a symmetric shape that would mirror to itself');
  await page.evaluate(() => window.Rig._test.resetSession());
  const idle = await page.evaluate(() => window.Rig._test.state().pose);
  // A front-on straddle pose has hipL/hipR (and shoulderL/shoulderR)
  // equal in magnitude and opposite in sign around DOWN -- symmetric. A
  // genuine profile stance has no such relationship; front and back legs
  // lean by different, unrelated amounts.
  const DOWN = Math.PI / 2;
  const oldSymmetricHip = Math.abs((idle.hipL - DOWN) + (idle.hipR - DOWN)) < 0.01;
  ok(!oldSymmetricHip, 'hipL/hipR are NOT mirror-symmetric around DOWN -- this is a real fore/aft stance, not the old front-on straddle (hipL-DOWN=' + (idle.hipL - DOWN).toFixed(3) + ', hipR-DOWN=' + (idle.hipR - DOWN).toFixed(3) + ')');

  console.log('2. solveRig()\'s facing mirror is geometrically exact -- facing \'L\' reflects every joint around pelvis.x');
  // solveRig() isn't exposed as a standalone test hook, so this drives it
  // the same way the real game does, comparing the ACTUAL state().joints
  // for facing 'R' against facing 'L' at the same posX. Uses the GUARD
  // pose specifically (not idle) for this comparison -- idle's breathing
  // overlay (Math.sin(performance.now()/1400)) is real, deliberate,
  // time-varying motion (see its own comment), so two idle samples taken
  // at genuinely different wall-clock moments would show a real Y
  // difference from breathing ALONE, unrelated to the facing mirror
  // itself. Guard is a fixed, non-animated pose, so any Y difference
  // between these two samples can only come from the mirror -- and it
  // should be none, since the mirror only ever touches x.
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig._test.setGuard(true); });
  const facingR = await page.evaluate(() => window.Rig._test.state());
  ok(facingR.facing === 'R', 'player 1 spawns facing R by default');
  await page.evaluate(() => window.Rig._test.setGuard(false));
  await page.evaluate(() => { window.Rig._test.setMoveIntent(-1); window.Rig._test.stepPhysics(200); window.Rig._test.setMoveIntent(0); window.Rig._test.stepPhysics(400); window.Rig._test.teleportTo(0); window.Rig._test.setGuard(true); });
  const facingL = await page.evaluate(() => window.Rig._test.state());
  ok(facingL.facing === 'L', 'moving left flips facing to L');
  ok(Math.abs(facingL.posX - facingR.posX) < 0.01, 'both samples are at the same posX (0), so only facing differs between them');
  await page.evaluate(() => window.Rig._test.setGuard(false));
  const pelvisX = facingR.joints.pelvis.x;
  let maxMirrorError = 0;
  for (const k of ['hipL', 'kneeL', 'footL', 'hipR', 'kneeR', 'footR', 'shoulderL', 'elbowL', 'handL', 'shoulderR', 'elbowR', 'handR', 'head', 'chest']) {
    const expectedMirroredX = 2 * pelvisX - facingR.joints[k].x;
    const actualX = facingL.joints[k].x;
    maxMirrorError = Math.max(maxMirrorError, Math.abs(expectedMirroredX - actualX));
    // y must be untouched by the mirror -- only x reflects
    ok(Math.abs(facingR.joints[k].y - facingL.joints[k].y) < 0.01, k + '\'s y-coordinate is untouched by the facing mirror (only x reflects)');
  }
  ok(maxMirrorError < 0.5, 'every joint\'s x-coordinate under facing L is an exact reflection of facing R around pelvis.x (max error ' + maxMirrorError.toFixed(3) + 'px)');

  console.log('3. The kick, guard, and flinch poses are also genuinely asymmetric, not just the idle pose');
  await page.evaluate(() => window.Rig._test.resetSession());
  await page.evaluate(() => window.Rig._test.setGuard(true));
  const guard = await page.evaluate(() => window.Rig._test.state().pose);
  await page.evaluate(() => window.Rig._test.setGuard(false));
  const guardSymmetric = Math.abs((guard.hipL - DOWN) + (guard.hipR - DOWN)) < 0.01;
  ok(!guardSymmetric, 'the guard pose\'s legs are also fore/aft asymmetric, not a symmetric brace stance');

  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(140); // mid-strike
  const strike = await page.evaluate(() => window.Rig._test.state().pose);
  const strikeSymmetric = Math.abs((strike.hipL - DOWN) + (strike.hipR - DOWN)) < 0.01;
  ok(!strikeSymmetric, 'the strike pose\'s legs are asymmetric (expected -- a kick was never symmetric even in the old rig, but confirms the pose data still carries real asymmetry through the new convention)');

  console.log('4. Player 2 gets the exact same mirror treatment through the same solveRig(), not a second implementation');
  await page.evaluate(() => window.Rig2._test.reset());
  await page.evaluate(() => window.Rig2._test.teleportTo(0));
  const p2FacingDefault = await page.evaluate(() => window.Rig2._test.state());
  ok(p2FacingDefault.facing === 'L', 'player 2 spawns facing L by default (toward player 1)');
  const p2PelvisX = p2FacingDefault.joints.pelvis.x;
  await page.evaluate(() => { window.Rig2._test.setMoveIntent(1); window.Rig2._test.stepPhysics(200); window.Rig2._test.setMoveIntent(0); window.Rig2._test.stepPhysics(400); window.Rig2._test.teleportTo(0); });
  const p2FacingR = await page.evaluate(() => window.Rig2._test.state());
  ok(p2FacingR.facing === 'R', 'player 2 can flip to facing R the same way player 1 does');
  let p2MaxMirrorError = 0;
  for (const k of ['hipL', 'footL', 'hipR', 'footR', 'head']) {
    p2MaxMirrorError = Math.max(p2MaxMirrorError, Math.abs((2 * p2PelvisX - p2FacingDefault.joints[k].x) - p2FacingR.joints[k].x));
  }
  ok(p2MaxMirrorError < 0.5, 'player 2\'s facing mirror is exact too, through the same shared solveRig() function');

  console.log('5. No page/console errors across any of the above');
  ok(pageErrors.length === 0, 'zero page errors (' + pageErrors.length + ' found: ' + pageErrors.join('; ') + ')');
  ok(consoleErrors.length === 0, 'zero console errors (' + consoleErrors.length + ' found: ' + consoleErrors.join('; ') + ')');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
