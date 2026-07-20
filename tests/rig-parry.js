// Rykndu doll-rig parry regression pass -- the precision-timing reward
// guard never had, closed in v0.1.25. checkPvpHit()/resolveDuelHit() are
// still the same shared, called-both-directions pair tests/rig-combat.js
// already covers; this file drives the NEW parry branch specifically --
// a hit landing within PARRY_WINDOW_MS of the moment guard was raised is
// a full negation-plus-punish, not a block, and driving both directions
// (p1 parrying p2, and p2 parrying p1) proves that symmetry the same way
// tests/rig-combat.js already proved it for a normal hit.
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-parry.js`.
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

  async function freshDuel() {
    await page.evaluate(() => {
      window.Rig._test.resetSession();
      window.Rig._test.freezeSpawns();
      window.Rig._test.clearEnemies();
      window.Rig2._test.reset();
    });
  }

  console.log('1. A hit landing right after guard is raised (within the parry window) is a full negation, not a block');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); });
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(100); // still in windup (110ms) -- raise guard right before the strike lands
  const guardMeterBefore = (await page.evaluate(() => window.Rig2._test.state())).guardMeter;
  await page.evaluate(() => window.Rig2._test.setGuard(true));
  ok((await page.evaluate(() => window.Rig2._test.state())).isInParryWindow === true, 'the defender is inside its own parry window immediately after raising guard');
  await page.waitForTimeout(40); // now into the strike phase (past 110ms), guard raised only ~40ms ago -- well within the 120ms window
  const afterParry1 = await page.evaluate(() => ({ p1: window.Rig._test.state(), p2: window.Rig2._test.state() }));
  ok(afterParry1.p2.velX === 0, 'the defender (who parried) takes zero knockback -- a full negation, not reduced chip knockback');
  // Some natural continuous drain still applies from simply holding guard
  // for the ~140ms between the raise and this check (see
  // updateGuardMeter()) -- what a parry skips is the EXTRA flat
  // GUARD_BLOCK_HIT_DRAIN (20) a normal blocked hit costs on top of
  // that, so this checks the total drop stayed well under that amount,
  // not that the meter is bit-for-bit unchanged.
  ok(guardMeterBefore - afterParry1.p2.guardMeter < 10,
    'the defender\'s guard meter only shows ordinary continuous drain from holding guard, not the extra flat cost a blocked hit would add (before=' + guardMeterBefore.toFixed(1) + ', after=' + afterParry1.p2.guardMeter.toFixed(1) + ')');
  ok(afterParry1.p2.guarding === true, 'the defender is still guarding after landing a parry');
  ok(afterParry1.p1.velX !== 0, 'the ATTACKER is the one who takes real knockback from a parried hit');
  ok(afterParry1.p1.idle === true, 'the attacker\'s own attack sequence was interrupted by the parry punish, the same way applyKnockback() already interrupts an unblocked hit');
  await page.evaluate(() => window.Rig2._test.setGuard(false));

  console.log('2. A hit landing well after the parry window has elapsed is a normal block, not a parry');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); });
  await page.evaluate(() => window.Rig2._test.setGuard(true));
  await page.waitForTimeout(300); // hold guard well past the 120ms parry window before the attack even starts
  ok((await page.evaluate(() => window.Rig2._test.state())).isInParryWindow === false, 'the defender is no longer in its parry window after holding guard this long');
  const guardMeterBeforeBlock = (await page.evaluate(() => window.Rig2._test.state())).guardMeter;
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(150); // strike lands on the long-held guard
  const afterBlock = await page.evaluate(() => ({ p1: window.Rig._test.state(), p2: window.Rig2._test.state() }));
  ok(afterBlock.p2.velX > 0, 'a hit landing outside the parry window still produces normal (reduced) chip knockback on the defender, not zero');
  ok(afterBlock.p2.guardMeter < guardMeterBeforeBlock, 'a normal block still costs real guard meter, unlike a parry');
  ok(afterBlock.p1.velX === 0, 'the attacker is unaffected by a normal block -- only a parry punishes the attacker');
  await page.evaluate(() => window.Rig2._test.setGuard(false));

  console.log('3. Re-raising guard opens a genuinely fresh parry window each time, not a one-time flag');
  await freshDuel();
  await page.evaluate(() => window.Rig2._test.setGuard(true));
  await page.waitForTimeout(200); // let the first window expire
  ok((await page.evaluate(() => window.Rig2._test.state())).isInParryWindow === false, 'the first parry window has expired');
  await page.evaluate(() => window.Rig2._test.setGuard(false));
  await page.waitForTimeout(30);
  await page.evaluate(() => window.Rig2._test.setGuard(true)); // a fresh raise
  ok((await page.evaluate(() => window.Rig2._test.state())).isInParryWindow === true, 'raising guard again opens a genuinely new parry window, not reusing stale state from the first raise');
  await page.evaluate(() => window.Rig2._test.setGuard(false));

  console.log('4. The shared parry check works in the reverse direction too (p2 parrying p1), not just p1\'s side');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(30); window.Rig2._test.teleportTo(0); });
  await page.evaluate(() => { window.Rig2._test.setMoveIntent(1); window.Rig2._test.updatePhysics(0.05); window.Rig2._test.setMoveIntent(0); });
  await page.waitForTimeout(10);
  await page.evaluate(() => window.Rig2._test.trigger('R')); // player 2 attacks player 1
  await page.waitForTimeout(100);
  await page.evaluate(() => window.Rig._test.setGuard(true)); // player 1 parries
  await page.waitForTimeout(40);
  const reverseParry = await page.evaluate(() => ({ p1: window.Rig._test.state(), p2: window.Rig2._test.state() }));
  ok(reverseParry.p1.velX === 0, 'player 1 (the defender this time) takes zero knockback from parrying player 2\'s attack');
  ok(reverseParry.p2.velX !== 0, 'player 2 (the attacker this time) is the one punished, through the exact same shared resolveDuelHit() function');
  await page.evaluate(() => window.Rig._test.setGuard(false));

  console.log('5. No page/console errors across any of the above');
  ok(pageErrors.length === 0, 'zero page errors (' + pageErrors.length + ' found: ' + pageErrors.join('; ') + ')');
  ok(consoleErrors.length === 0, 'zero console errors (' + consoleErrors.length + ' found: ' + consoleErrors.join('; ') + ')');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
