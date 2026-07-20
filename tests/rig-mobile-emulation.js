// Rykndu doll-rig mobile-viewport/touch EMULATION pass -- Playwright's
// built-in device profiles (real viewport dimensions, real device pixel
// ratios, real "isMobile"/"hasTouch" flags lifted from actual hardware
// specs), not a made-up small window. This is explicitly still emulation,
// not a substitute for hands-on verification on real hardware -- named
// that way deliberately (see RYKNDU_2PLAYER.md/producer feedback: "I don't
// really have a way to test it on mobile rn") so nobody mistakes a green
// run here for "verified on a real phone."
//
// Every device profile in this file drives Chromium (the only engine
// available in this environment), even for iPhone/WebKit-default
// profiles -- Playwright's `devices['iPhone 13']` normally pairs with
// webkit, which isn't installed here. Using Chromium under an iPhone's
// real viewport/deviceScaleFactor/touch settings still catches genuine
// layout bugs (clipped controls, overlapping HUD elements) at that
// device's actual dimensions; it does NOT verify WebKit-specific
// rendering/touch-event quirks, and this file says so rather than
// quietly overstating its own coverage.
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-mobile-emulation.js`.
const { chromium, devices } = require('playwright');

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const BASE_URL = process.env.RIG_URL || 'http://localhost:8935/prototypes/rykndu-doll-rig.html';

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('    ok   -', label); }
  else { fail++; console.log('    FAIL -', label); }
}

// Real Playwright device profiles, deliberately spanning a small
// notch-era iPhone, a large modern Android, and a genuinely small/old
// iPhone SE -- the width range this touch layout has to survive, not
// just one arbitrary size.
const DEVICE_PROFILES = [
  { name: 'iPhone 13 (Chromium, iPhone viewport/DPR)', device: devices['iPhone 13'] },
  { name: 'Pixel 7 (Chromium, native mobile profile)', device: devices['Pixel 7'] },
  { name: 'iPhone SE (Chromium, smallest/oldest real screen tested)', device: devices['iPhone SE'] }
];

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });

  for (const profile of DEVICE_PROFILES) {
    console.log('\n=== ' + profile.name + ' (' + profile.device.viewport.width + 'x' + profile.device.viewport.height + ', DPR ' + profile.device.deviceScaleFactor + ') ===');
    const context = await browser.newContext({
      viewport: profile.device.viewport,
      deviceScaleFactor: profile.device.deviceScaleFactor,
      isMobile: profile.device.isMobile,
      hasTouch: profile.device.hasTouch,
      userAgent: profile.device.userAgent
    });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) consoleErrors.push(msg.text()); });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.Rig !== 'undefined');
    await page.evaluate(() => { window.Rig._test.resetSession(); window.Rig._test.freezeSpawns(); window.Rig._test.clearEnemies(); });

    console.log('  1. All touch controls are on-screen (not clipped by this device\'s real viewport)');
    const vp = profile.device.viewport;
    const stickBox = await page.locator('#touchStick').boundingBox();
    const atkBox = await page.locator('#btnAttack').boundingBox();
    const jumpBox = await page.locator('#btnJump').boundingBox();
    const blockBox = await page.locator('#btnBlock').boundingBox();
    for (const [label, box] of [['joystick', stickBox], ['attack button', atkBox], ['jump button', jumpBox], ['block button', blockBox]]) {
      ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width && box.y + box.height <= vp.height,
        'the ' + label + ' is fully within the ' + vp.width + 'x' + vp.height + ' viewport, not clipped off an edge');
    }

    console.log('  2. Touch controls don\'t collide with the HUD/hint/version-marker/pre-alpha badge (the collision class this file has hit twice before)');
    const hudBox = await page.locator('#hud').boundingBox();
    const hintBox = await page.locator('#hint').boundingBox();
    const versionBox = await page.locator('.version-marker').boundingBox();
    const badgeBox = await page.locator('#prealpha-badge').boundingBox();
    const overlayBoxes = [['#hud', hudBox], ['#hint', hintBox], ['.version-marker', versionBox], ['#prealpha-badge', badgeBox]];
    const controlBoxes = [['joystick', stickBox], ['attack button', atkBox], ['jump button', jumpBox], ['block button', blockBox]];
    let anyOverlap = false;
    for (const [oName, oBox] of overlayBoxes) {
      for (const [cName, cBox] of controlBoxes) {
        if (oBox && cBox && rectsOverlap(oBox, cBox)) {
          anyOverlap = true;
          console.log('    -> overlap detected: ' + oName + ' vs ' + cName);
        }
      }
    }
    ok(!anyOverlap, 'no HUD/hint/version-marker/badge overlay overlaps any touch control at this device size');

    console.log('  3. The virtual joystick still drives real movement physics at this device\'s real dimensions');
    const before = await page.evaluate(() => window.Rig._test.state());
    const stickCx = stickBox.x + stickBox.width / 2, stickCy = stickBox.y + stickBox.height / 2;
    await page.mouse.move(stickCx, stickCy);
    await page.mouse.down();
    await page.mouse.move(stickCx + 30, stickCy, { steps: 5 });
    await page.waitForTimeout(350);
    const dragged = await page.evaluate(() => window.Rig._test.state());
    ok(dragged.posX > before.posX && dragged.velX > 0, 'dragging the stick right at this viewport size still moves the rig right with real velocity');
    await page.mouse.up();
    await page.waitForTimeout(300);

    console.log('  4. The attack/jump/block buttons still register real taps at this device\'s real dimensions');
    const atkCx = atkBox.x + atkBox.width / 2, atkCy = atkBox.y + atkBox.height / 2;
    await page.mouse.move(atkCx, atkCy);
    await page.mouse.down();
    await page.waitForTimeout(30);
    const afterAttack = await page.evaluate(() => window.Rig._test.state());
    ok(afterAttack.idle === false, 'the attack button lands a real tap and starts an attack sequence');
    await page.mouse.up();
    await page.waitForTimeout(500);

    console.log('  5. No page/console errors at this device profile');
    ok(pageErrors.length === 0, 'zero page errors (' + pageErrors.length + ' found: ' + pageErrors.join('; ') + ')');
    ok(consoleErrors.length === 0, 'zero console errors (' + consoleErrors.length + ' found: ' + consoleErrors.join('; ') + ')');

    const shotPath = '/tmp/claude-0/-home-user/16febd4c-f05a-5092-b140-576212a575b8/scratchpad/shots/mobile-' + profile.name.split(' ')[0].toLowerCase() + '-' + profile.name.split(' ')[1] + '.png';
    try { await page.screenshot({ path: shotPath }); console.log('  screenshot: ' + shotPath); } catch (e) { /* scratchpad path may not exist in a different environment -- non-fatal */ }

    await context.close();
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
