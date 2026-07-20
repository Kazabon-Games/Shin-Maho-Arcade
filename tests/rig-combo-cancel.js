// Rykndu doll-rig combo-cancel regression pass -- the last concrete gap
// named across multiple docs passes: "Combo-cancel candidate points...
// not built." The existing "buffered input fires immediately at
// recovery start" behavior was already a cancel window in everything
// but name; this extends it so a CONFIRMED hit (a clean, unblocked
// connect, not a whiff) fires a buffered follow-up immediately instead
// of making the attacker wait out the rest of strike plus the whole
// 220ms recovery tail. cancelIntoBufferedAttack() is called from
// resolveDuelHit() -- the same shared, both-directions function
// tests/rig-combat.js already covers -- so this file drives both
// directions too, plus the no-buffer/blocked/parried cases where a
// cancel should NOT happen.
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-combo-cancel.js`.
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

  console.log('1. A confirmed (unblocked) hit with a buffered follow-up cancels immediately into a fresh windup');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); });
  await page.evaluate(() => window.Rig._test.trigger('R')); // start the attack
  await page.waitForTimeout(30); // still in windup (110ms) -- a real committed phase
  await page.evaluate(() => window.Rig._test.trigger('R')); // buffer a follow-up -- queuedSide, doesn't interrupt
  const buffered = await page.evaluate(() => window.Rig._test.state());
  ok(buffered.queuedSide === 'R', 'the second trigger during the committed windup buffered a follow-up rather than interrupting');
  await page.waitForTimeout(130); // past windup (110ms) into strike (starts at 110ms) -- the hit should land and confirm-cancel should fire
  const afterConfirm = await page.evaluate(() => window.Rig._test.state());
  ok(afterConfirm.queuedSide === null, 'the buffered follow-up was consumed');
  ok(afterConfirm.seqIdx === 0, 'the attacker is already back in a FRESH windup (seqIdx 0) -- the cancel fired immediately on the confirmed hit, not after the full strike+recovery tail');
  ok(afterConfirm.idle === false, 'the attacker is mid-sequence again already, not sitting idle waiting out recovery');

  console.log('2. A confirmed hit with NO buffered follow-up behaves exactly as before -- no cancel, normal recovery');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); });
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(140); // strike lands, nothing buffered
  const noBufferMid = await page.evaluate(() => window.Rig._test.state());
  ok(noBufferMid.seqIdx === 1, 'with nothing buffered, the attacker is still in its own strike phase right after the hit lands -- unaffected by the new cancel path');
  await page.waitForTimeout(150); // comfortably past strike's 70ms duration (ends at 180ms total), same safe margin this suite's own §1 already uses elsewhere
  const noBufferRecover = await page.evaluate(() => window.Rig._test.state());
  ok(noBufferRecover.seqIdx === 2, 'the sequence advances into recovery on its own normal schedule when nothing was buffered to cancel into');

  console.log('3. A BLOCKED (but not parried) hit does not trigger a combo-cancel, even with a follow-up buffered');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); window.Rig2._test.setGuard(true); });
  await page.waitForTimeout(250); // well past the parry window -- this will be an ordinary block
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(30);
  await page.evaluate(() => window.Rig._test.trigger('R')); // buffer a follow-up
  await page.waitForTimeout(130); // the blocked hit lands
  const blockedNoCancel = await page.evaluate(() => window.Rig._test.state());
  ok(blockedNoCancel.seqIdx === 1 && blockedNoCancel.queuedSide === 'R',
    'a blocked hit leaves the attacker in its own strike phase with the follow-up still buffered, not yet fired -- combo-cancel is scoped to a clean, unblocked connect only');
  await page.evaluate(() => window.Rig2._test.setGuard(false));

  console.log('4. A PARRIED hit fully interrupts the attacker (not the combo-cancel path -- a real punish, same as any landed hit)');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); });
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(30);
  await page.evaluate(() => window.Rig._test.trigger('R')); // buffer a follow-up
  await page.waitForTimeout(70); // still in windup (110ms) -- raise guard right before the strike lands, inside the parry window
  await page.evaluate(() => window.Rig2._test.setGuard(true));
  await page.waitForTimeout(60); // strike lands within the 120ms parry window
  const parriedNoCancel = await page.evaluate(() => window.Rig._test.state());
  // A parry-punish is a real hit against the ATTACKER (applyKnockback()'s
  // unblocked branch), so it interrupts them exactly the way any landed
  // hit against a rig already does -- including clearing a buffered
  // follow-up, the same as getting hit while your own attack was queued
  // up already would. This isn't the combo-cancel path (cancelIntoBufferedAttack()
  // is never called on a parry), it's the pre-existing "a landed hit
  // interrupts you" rule, just confirming the parry branch doesn't leave
  // stale buffered state behind either.
  ok(parriedNoCancel.queuedSide === null && parriedNoCancel.idle === true,
    'being parried interrupts the attacker completely, clearing their buffered follow-up too -- not left queued for a sequence that no longer exists');
  await page.evaluate(() => window.Rig2._test.setGuard(false));

  console.log('5. The combo-cancel path works in the reverse direction too (p2 confirming on p1), not just p1\'s side');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(30); window.Rig2._test.teleportTo(0); });
  await page.evaluate(() => { window.Rig2._test.setMoveIntent(1); window.Rig2._test.updatePhysics(0.05); window.Rig2._test.setMoveIntent(0); });
  await page.waitForTimeout(10);
  await page.evaluate(() => window.Rig2._test.trigger('R'));
  await page.waitForTimeout(30);
  await page.evaluate(() => window.Rig2._test.trigger('R')); // buffer a follow-up on player 2
  await page.waitForTimeout(130);
  const reverseConfirm = await page.evaluate(() => window.Rig2._test.state());
  ok(reverseConfirm.seqIdx === 0 && reverseConfirm.queuedSide === null,
    'player 2\'s confirmed hit on player 1 also cancels immediately into its buffered follow-up, through the exact same shared resolveDuelHit() function');

  console.log('6. No page/console errors across any of the above');
  ok(pageErrors.length === 0, 'zero page errors (' + pageErrors.length + ' found: ' + pageErrors.join('; ') + ')');
  ok(consoleErrors.length === 0, 'zero console errors (' + consoleErrors.length + ' found: ' + consoleErrors.join('; ') + ')');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
