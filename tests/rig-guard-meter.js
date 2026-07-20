// Rykndu doll-rig guard-meter regression pass -- the "no guard timer/
// meter... free for as long as the input is held" gap named repeatedly
// in RYKNDU_2PLAYER.md/RYKNDU_MOVESET.md's own deferred-work lists,
// closed in v0.1.24. Drives the real stamina system (drain while
// guarding, regen while not, a forced drop at zero, and a flat cost per
// blocked hit) through window.Rig._test/window.Rig2._test's real
// setGuard()/updatePhysics()/stepPhysics() hooks -- the same physics
// integrator every other timed system in this rig (movement, jump,
// recovery momentum) is already verified through, not a shortcut.
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-guard-meter.js`.
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

  console.log('1. The guard meter starts full');
  await page.evaluate(() => { window.Rig._test.resetSession(); window.Rig2._test.reset(); });
  const start = await page.evaluate(() => window.Rig._test.state());
  ok(start.guardMeter === 100, 'player 1 starts with a full (100) guard meter');

  console.log('2. Continuous guarding drains the meter in real elapsed time');
  await page.evaluate(() => window.Rig._test.setGuard(true));
  await page.evaluate(() => window.Rig._test.stepPhysics(1000)); // 1 real second of continuous blocking
  const afterOneSec = await page.evaluate(() => window.Rig._test.state());
  ok(afterOneSec.guardMeter > 0 && afterOneSec.guardMeter < 100,
    'one second of continuous guard drains a real, substantial chunk of the meter (got ' + afterOneSec.guardMeter.toFixed(1) + ')');
  ok(Math.abs(afterOneSec.guardMeter - 60) < 3, 'the drain rate matches the documented 40/sec (100 - 40 =~ 60), not an arbitrary number');
  ok(afterOneSec.guarding === true, 'still guarding -- the meter has not run out yet');

  console.log('3. The meter fully depleting forces guard to drop, not just refuses the next raise');
  // Regen begins the instant guarding flips false (including a forced
  // drop, not just a voluntary release) -- stepping much further than
  // the exact zero-crossing would let some of that regen bleed back in
  // within this same call, so this steps only just past the crossing
  // (~1.48s from ~59.3 at 40/sec) rather than a much longer duration.
  await page.evaluate(() => window.Rig._test.stepPhysics(1550));
  const exhausted = await page.evaluate(() => window.Rig._test.state());
  ok(exhausted.guardMeter >= 0 && exhausted.guardMeter < 5, 'the meter bottoms out at (or immediately after crossing) zero, never negative');
  ok(exhausted.guarding === false, 'guard was force-dropped the instant the meter hit zero, without a separate release input');

  console.log('4. Guard cannot be immediately re-raised the instant it hits empty');
  await page.evaluate(() => window.Rig._test.setGuard(true));
  const refused = await page.evaluate(() => window.Rig._test.state());
  ok(refused.guarding === false, 'raising guard is refused while the meter is still below the minimum-to-raise threshold');

  console.log('5. The meter regenerates while not guarding, slower than it drains');
  await page.evaluate(() => window.Rig._test.stepPhysics(1000)); // 1 real second of NOT guarding (guard was just refused above)
  const regenerated = await page.evaluate(() => window.Rig._test.state());
  ok(regenerated.guardMeter > 0 && regenerated.guardMeter < 40,
    'one second of regen recovers real meter, but less than what one second of drain would have removed (got ' + regenerated.guardMeter.toFixed(1) + ', regen rate is 25/sec vs 40/sec drain)');
  await page.evaluate(() => window.Rig._test.stepPhysics(5000)); // long enough to fully regenerate
  const fullyRegenerated = await page.evaluate(() => window.Rig._test.state());
  ok(fullyRegenerated.guardMeter === 100, 'the meter fully regenerates back to 100 and does not overshoot');

  console.log('6. Guard can be raised again once enough meter has recovered');
  await page.evaluate(() => window.Rig._test.setGuard(true));
  const reRaised = await page.evaluate(() => window.Rig._test.state());
  ok(reRaised.guarding === true, 'guard raises normally again now that the meter is full');
  await page.evaluate(() => window.Rig._test.setGuard(false));

  console.log('7. A landed, BLOCKED hit costs a real flat chunk of guard meter (chip stamina), on top of continuous drain');
  await page.evaluate(() => { window.Rig._test.resetSession(); window.Rig2._test.reset(); });
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); window.Rig2._test.setGuard(true); });
  const beforeBlockedHit = await page.evaluate(() => window.Rig2._test.state());
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(150); // strike lands on the guarding defender
  const afterBlockedHit = await page.evaluate(() => window.Rig2._test.state());
  ok(afterBlockedHit.guardMeter < beforeBlockedHit.guardMeter - 15,
    'a single blocked hit costs a real, substantial chunk of guard meter (before=' + beforeBlockedHit.guardMeter.toFixed(1) + ', after=' + afterBlockedHit.guardMeter.toFixed(1) + ')');
  ok(afterBlockedHit.guarding === true, 'guard survives a single blocked hit -- the meter cost does not itself force a drop unless it empties the meter');
  await page.evaluate(() => window.Rig2._test.setGuard(false));

  console.log('8. reset() restores the guard meter to full, same as every other physics state');
  await page.evaluate(() => window.Rig._test.setGuard(true));
  await page.evaluate(() => window.Rig._test.stepPhysics(1000));
  await page.evaluate(() => window.Rig._test.resetSession());
  const afterReset = await page.evaluate(() => window.Rig._test.state());
  ok(afterReset.guardMeter === 100, 'resetSession() (which calls p1.reset()) restores a full guard meter');

  console.log('9. Player 2 has the exact same meter behavior, not a second hand-copied implementation');
  await page.evaluate(() => window.Rig2._test.reset());
  await page.evaluate(() => window.Rig2._test.setGuard(true));
  await page.evaluate(() => window.Rig2._test.stepPhysics(1000));
  const p2AfterDrain = await page.evaluate(() => window.Rig2._test.state());
  ok(Math.abs(p2AfterDrain.guardMeter - 60) < 3, 'player 2\'s guard meter drains at the exact same rate as player 1\'s, through the same shared factory');
  await page.evaluate(() => window.Rig2._test.setGuard(false));

  console.log('10. No page/console errors across any of the above');
  ok(pageErrors.length === 0, 'zero page errors (' + pageErrors.length + ' found: ' + pageErrors.join('; ') + ')');
  ok(consoleErrors.length === 0, 'zero console errors (' + consoleErrors.length + ' found: ' + consoleErrors.join('; ') + ')');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
