// Rykndu doll-rig 2-player extension regression pass -- drives the real
// page through window.Rig._test (player 1) and window.Rig2._test (player
// 2), never a duplicated copy of either rig's logic. Added alongside the
// v0.1.11 2-player extension to verify the two rigs are genuinely
// independent state objects (not two references sharing one pose array --
// the exact "duplicated logic silently drifts apart" trap this file has
// already hit twice before) and that the gamepad pad-to-player assignment
// algorithm behaves correctly. Real gamepad hardware can't be driven from
// Playwright, so the assignment tests call window.Rig2._test.simulateGamepadConnect(),
// which invokes the exact same assignPad() function a real
// 'gamepadconnected' event would -- not a separate test-only copy of the rule.
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-2player.js`.
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

  console.log('1. Both rigs exist and start independent/idle');
  await page.evaluate(() => { window.Rig._test.resetSession(); window.Rig._test.freezeSpawns(); window.Rig._test.clearEnemies(); window.Rig2._test.reset(); });
  let s1 = await page.evaluate(() => window.Rig._test.state());
  let s2 = await page.evaluate(() => window.Rig2._test.state());
  ok(s1.idle === true && s2.idle === true, 'both player 1 and player 2 start idle');
  ok(s2.sockets && Number.isFinite(s2.sockets.foot_r.x), 'player 2 exposes its own sockets, resolved from its own solveRig() output');

  console.log('2. Player 2 renders at a distinct screen position from player 1');
  ok(s2.joints.pelvis.x !== s1.joints.pelvis.x, 'player 2\'s pelvis is not at the same x as player 1\'s (standOffset applied)');
  ok(Math.abs(s2.joints.pelvis.x - s1.joints.pelvis.x - 130) < 0.01,
    'the offset is exactly P2_STAND_OFFSET (130px), not an approximation');

  console.log('3. Triggering player 2 does not affect player 1 (genuinely separate state)');
  const before1 = await page.evaluate(() => window.Rig._test.state());
  await page.evaluate(() => window.Rig2._test.trigger('R'));
  await page.waitForTimeout(30);
  const afterP2Trigger1 = await page.evaluate(() => window.Rig._test.state());
  const afterP2Trigger2 = await page.evaluate(() => window.Rig2._test.state());
  ok(afterP2Trigger1.idle === before1.idle && afterP2Trigger1.seqIdx === before1.seqIdx,
    'player 1 is completely unaffected by triggering player 2\'s attack');
  ok(afterP2Trigger2.idle === false, 'player 2 itself did start its attack sequence');

  console.log('4. Triggering player 1 does not affect player 2 (the reverse direction)');
  await page.waitForTimeout(500); // let p2's attack fully finish
  const beforeP1Trigger2 = await page.evaluate(() => window.Rig2._test.state());
  await page.evaluate(() => window.Rig._test.trigger('L'));
  await page.waitForTimeout(30);
  const afterP1Trigger1 = await page.evaluate(() => window.Rig._test.state());
  const afterP1Trigger2 = await page.evaluate(() => window.Rig2._test.state());
  ok(afterP1Trigger1.idle === false, 'player 1 did start its own attack sequence');
  ok(afterP1Trigger2.idle === beforeP1Trigger2.idle && afterP1Trigger2.seqIdx === beforeP1Trigger2.seqIdx,
    'player 2 is completely unaffected by triggering player 1\'s attack');

  console.log('5. Player 2 guard gating mirrors player 1\'s three rules (§12), independently');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.Rig2._test.setGuard(true));
  await page.waitForTimeout(30);
  let p2Guard = await page.evaluate(() => window.Rig2._test.state());
  ok(p2Guard.guarding === true, 'player 2 setGuard(true) from idle succeeds');
  await page.evaluate(() => window.Rig2._test.trigger('L'));
  await page.waitForTimeout(30);
  let p2GuardBlocks = await page.evaluate(() => window.Rig2._test.state());
  ok(p2GuardBlocks.idle === true && p2GuardBlocks.guarding === true, 'player 2 attack input refused while guarding');
  await page.evaluate(() => window.Rig2._test.setGuard(false));

  await page.evaluate(() => window.Rig2._test.trigger('R'));
  await page.waitForTimeout(30);
  await page.evaluate(() => window.Rig2._test.setGuard(true));
  let p2MidCommitted = await page.evaluate(() => window.Rig2._test.state());
  ok(p2MidCommitted.guarding === false && p2MidCommitted.committed === true,
    'player 2 setGuard(true) refused during its own committed windup/strike phase');
  await page.waitForTimeout(250); // ~280ms total, same stable margin as §12/§4
  await page.evaluate(() => window.Rig2._test.setGuard(true));
  let p2Recovery = await page.evaluate(() => window.Rig2._test.state());
  ok(p2Recovery.guarding === true && p2Recovery.idle === true,
    'player 2 setGuard(true) during its own interruptible recovery phase succeeds');
  await page.evaluate(() => window.Rig2._test.setGuard(false));

  console.log('6. Gamepad pad-to-player assignment (connection-order, fixed, never re-arbitrated)');
  let padState = await page.evaluate(() => window.Rig2._test.padAssignment());
  ok(padState.p1PadIndex === null && padState.p2PadIndex === null, 'no pads assigned before any connect');

  await page.evaluate(() => window.Rig2._test.simulateGamepadConnect(3));
  padState = await page.evaluate(() => window.Rig2._test.padAssignment());
  ok(padState.p1PadIndex === 3 && padState.p2PadIndex === null,
    'first pad to connect (index 3, an arbitrary real-world index) is assigned to player 1, not necessarily index 0');

  await page.evaluate(() => window.Rig2._test.simulateGamepadConnect(0));
  padState = await page.evaluate(() => window.Rig2._test.padAssignment());
  ok(padState.p1PadIndex === 3 && padState.p2PadIndex === 0,
    'second pad to connect is assigned to player 2, and does NOT re-arbitrate player 1\'s already-assigned pad');

  await page.evaluate(() => window.Rig2._test.simulateGamepadConnect(1));
  padState = await page.evaluate(() => window.Rig2._test.padAssignment());
  ok(padState.p1PadIndex === 3 && padState.p2PadIndex === 0,
    'a third pad connecting has nowhere to go (both slots taken) and does not steal either player\'s assignment');

  await page.evaluate(() => window.Rig2._test.simulateGamepadDisconnect(3));
  padState = await page.evaluate(() => window.Rig2._test.padAssignment());
  ok(padState.p1PadIndex === null && padState.p2PadIndex === 0,
    'disconnecting player 1\'s pad clears only that slot, leaving player 2\'s untouched');

  await page.evaluate(() => window.Rig2._test.simulateGamepadConnect(1));
  padState = await page.evaluate(() => window.Rig2._test.padAssignment());
  ok(padState.p1PadIndex === 1 && padState.p2PadIndex === 0,
    'a new pad fills the now-open player 1 slot without disturbing player 2\'s pad');

  console.log('7. No page/console errors across any of the above');
  ok(pageErrors.length === 0, 'zero page errors (' + pageErrors.length + ' found)');
  ok(consoleErrors.length === 0, 'zero console errors (' + consoleErrors.length + ' found)');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
