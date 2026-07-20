// Rykndu doll-rig touch-control regression pass -- drives the real virtual
// joystick and action buttons via page.mouse (which generates real pointer
// events with an actual active pointer, unlike a synthetic dispatchEvent()
// call, which fails setPointerCapture() and would give a false read on
// whether these controls work). Added alongside the v0.1.19 touch-control
// rework, which replaced the old zoneL/zoneR full-screen-half tap zones
// (an explicit left/right kick, orphaned by the movement/facing rework)
// with a drag joystick plus attack/jump/block buttons mirroring the
// keyboard/gamepad scheme exactly.
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-touch-controls.js`.
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
  const context = await browser.newContext({ viewport: { width: 480, height: 800 }, hasTouch: true });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) consoleErrors.push(msg.text()); });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.Rig !== 'undefined');

  console.log('1. Virtual joystick drives real movement physics, same as keyboard/gamepad');
  await page.evaluate(() => window.Rig._test.resetSession());
  const before = await page.evaluate(() => window.Rig._test.state());
  ok(before.posX === 0 && before.velX === 0, 'starts at rest');

  const stickBox = await page.locator('#touchStick').boundingBox();
  const stickCx = stickBox.x + stickBox.width / 2, stickCy = stickBox.y + stickBox.height / 2;
  await page.mouse.move(stickCx, stickCy);
  await page.mouse.down();
  await page.mouse.move(stickCx + 30, stickCy, { steps: 5 }); // drag right, well within MAX_RADIUS (34px)
  await page.waitForTimeout(350);
  const dragged = await page.evaluate(() => window.Rig._test.state());
  ok(dragged.posX > 0 && dragged.velX > 0, 'dragging the stick right moves the rig right with real velocity, not a teleport');
  ok(dragged.facing === 'R', 'facing tracks the drag direction');

  await page.mouse.up();
  await page.waitForTimeout(30);
  const releasedImmediately = await page.evaluate(() => window.Rig._test.state());
  ok(releasedImmediately.velX > 0 && releasedImmediately.velX < dragged.velX,
    'releasing the stick decelerates via the same real friction as keyboard/gamepad release, not an instant stop');
  await page.waitForTimeout(300);
  const releasedSettled = await page.evaluate(() => window.Rig._test.state());
  ok(releasedSettled.velX === 0, 'velocity fully decays once the stick is released and left alone');

  console.log('2. Attack button throws the kick matching current facing (not an explicit side)');
  // Drag left this time, so facing flips, and confirm the attack button
  // reads that -- proving it isn't hardcoded to one side the way the old
  // zoneL/zoneR tap zones were.
  await page.mouse.move(stickCx, stickCy);
  await page.mouse.down();
  await page.mouse.move(stickCx - 30, stickCy, { steps: 5 });
  await page.waitForTimeout(350);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const facingL = await page.evaluate(() => window.Rig._test.state());
  ok(facingL.facing === 'L', 'stick drag left flipped facing to L');

  const atkBox = await page.locator('#btnAttack').boundingBox();
  await page.mouse.move(atkBox.x + atkBox.width / 2, atkBox.y + atkBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(30);
  const afterAttack = await page.evaluate(() => window.Rig._test.state());
  ok(afterAttack.idle === false && afterAttack.attackSide === 'L', 'attack button throws the L-side kick while facing L');
  await page.mouse.up();
  await page.waitForTimeout(500);

  console.log('3. Jump button triggers the same gated jump physics as the keyboard/gamepad path');
  const jumpBox = await page.locator('#btnJump').boundingBox();
  await page.mouse.move(jumpBox.x + jumpBox.width / 2, jumpBox.y + jumpBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(30);
  const afterJump = await page.evaluate(() => window.Rig._test.state());
  ok(afterJump.jumping === true && afterJump.velY > 0, 'jump button sets jumping true with real takeoff velocity');
  await page.mouse.up();
  await page.waitForTimeout(500);

  console.log('4. Block button is a real hold, not a tap -- guards while pressed, releases on lift');
  const blockBox = await page.locator('#btnBlock').boundingBox();
  await page.mouse.move(blockBox.x + blockBox.width / 2, blockBox.y + blockBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(30);
  const blockDown = await page.evaluate(() => window.Rig._test.state());
  ok(blockDown.guarding === true, 'pressing block sets guarding true');
  await page.mouse.up();
  await page.waitForTimeout(30);
  const blockUp = await page.evaluate(() => window.Rig._test.state());
  ok(blockUp.guarding === false, 'releasing block drops guarding, same as releasing the keyboard/gamepad guard input');

  console.log('5. The old zoneL/zoneR tap zones are gone, not just superseded');
  const oldZonesGone = await page.evaluate(() => document.getElementById('zoneL') === null && document.getElementById('zoneR') === null);
  ok(oldZonesGone, 'zoneL/zoneR no longer exist in the DOM');

  console.log('6. No page/console errors across any of the above');
  ok(pageErrors.length === 0, 'zero page errors (' + pageErrors.length + ' found: ' + pageErrors.join('; ') + ')');
  ok(consoleErrors.length === 0, 'zero console errors (' + consoleErrors.length + ' found)');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
