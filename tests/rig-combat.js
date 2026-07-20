// Rykndu doll-rig rig-vs-rig combat resolution regression pass -- drives
// the real page through window.Rig._test/window.Rig2._test/window.Duel._test,
// never a duplicated copy of the game's own hit-detection math. Added
// alongside v0.1.21's checkPvpHit()/resolveDuelHit()/resolveCombatHits(),
// which is deliberately ONE shared pairwise function called twice (once
// per direction) rather than two hand-copied blocks -- this suite drives
// BOTH directions (p1 attacking p2, and p2 attacking p1) specifically to
// prove that symmetry holds, not just assume it from reading the source.
//
// teleportTo() bypasses movement physics for deterministic positioning --
// the same test-only convenience window.Rig._test.spawnEnemy() already
// gets for enemy placement (backdating spawnAt instead of waiting out a
// real travel time).
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-combat.js`.
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
  await page.waitForFunction(() => typeof window.Rig !== 'undefined' && typeof window.Rig2 !== 'undefined' && typeof window.Duel !== 'undefined');

  async function freshDuel() {
    await page.evaluate(() => {
      window.Rig._test.resetSession();
      window.Rig._test.freezeSpawns();
      window.Rig._test.clearEnemies();
      window.Rig2._test.reset();
    });
  }

  console.log('1. A clean strike-phase hit lands, applies real knockback, and flinches the defender');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); });
  const before1 = await page.evaluate(() => window.Rig2._test.state());
  ok(before1.velX === 0, 'defender starts at rest');
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(140); // past the 110ms windup, into the 70ms strike
  const mid1p1 = await page.evaluate(() => window.Rig._test.state());
  const mid1p2 = await page.evaluate(() => window.Rig2._test.state());
  ok(mid1p1.seqIdx === 1, 'attacker is in its strike phase (seqIdx 1) at this point');
  ok(mid1p1.hasHitThisSwing === true, 'the attack marked itself as having landed a hit this swing');
  ok(mid1p2.velX > 0 && mid1p2.knockbackTimer > 0, 'defender was knocked back with real velocity and is in the knockback-lock window');
  ok(mid1p2.idle === true && !mid1p2.guarding, 'a clean (unblocked) hit interrupts whatever the defender was doing -- here, idle with no guard');
  await page.waitForTimeout(400);
  const settled1 = await page.evaluate(() => window.Rig2._test.state());
  ok(settled1.posX > before1.posX + 30, 'the defender was carried a real, substantial distance by the knockback, not a token nudge');
  ok(settled1.velX === 0, 'knockback velocity fully decays via the same friction real movement uses');

  console.log('2. Attacking away from the opponent does not hit them (facing/direction check)');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(30); window.Rig2._test.teleportTo(0); }); // p2 is to p1's LEFT now
  await page.evaluate(() => window.Rig._test.trigger('R')); // p1 kicks right, away from p2
  await page.waitForTimeout(140);
  const wrongSide = await page.evaluate(() => ({ p1: window.Rig._test.state(), p2: window.Rig2._test.state() }));
  ok(wrongSide.p1.hasHitThisSwing === false, 'kicking away from the opponent does not register as a landed hit');
  ok(wrongSide.p2.velX === 0, 'the opponent standing on the wrong side for this kick received no knockback');

  console.log('3. A guarded hit chips through with reduced knockback and does not break guard');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); window.Rig2._test.setGuard(true); });
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(140);
  const guardedMid = await page.evaluate(() => window.Rig2._test.state());
  ok(guardedMid.guarding === true, 'the defender is still guarding immediately after being hit -- a block does not break guard');
  ok(guardedMid.velX > 0 && guardedMid.velX < 66.5, 'a guarded hit still chips through a small amount of knockback, well under an unguarded hit\'s velocity');
  await page.waitForTimeout(400);
  const guardedSettled = await page.evaluate(() => window.Rig2._test.state());
  ok(guardedSettled.posX < 30 + 15, 'the guarded chip-push moves the defender only a small distance, nothing like the unguarded knockback\'s reach');
  await page.evaluate(() => window.Rig2._test.setGuard(false));

  console.log('4. One landed hit per swing -- lingering in range for the rest of the strike does not re-trigger knockback');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); });
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(140);
  const firstHit = await page.evaluate(() => window.Rig2._test.state());
  await page.waitForTimeout(120); // now well past the 180ms strike/recover boundary -- if a second knockback had (incorrectly) fired while the defender lingered nearby, velocity would spike back up instead of continuing to decay
  const later = await page.evaluate(() => window.Rig2._test.state());
  await page.waitForTimeout(300); // further still, well after the attacker has returned to idle
  const muchLater = await page.evaluate(() => window.Rig2._test.state());
  ok(firstHit.velX > 0, 'the first knockback sample shows real velocity');
  ok(Math.abs(later.velX) <= Math.abs(firstHit.velX) + 1,
    'velocity only ever decays between samples, never spikes back up from a second knockback application');
  ok(Math.abs(muchLater.velX) <= Math.abs(later.velX) + 1,
    'still true all the way through, including after the attacker has returned to idle and could attack again');

  console.log('5. The shared hit-check works in the reverse direction too (p2 attacking p1), not just p1 attacking p2');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(30); window.Rig2._test.teleportTo(0); }); // p1 to p2's right, p2 faces right by spawn default only -- force facing via a move first
  await page.evaluate(() => { window.Rig2._test.setMoveIntent(1); window.Rig2._test.updatePhysics(0.05); window.Rig2._test.setMoveIntent(0); });
  await page.waitForTimeout(10);
  await page.evaluate(() => window.Rig2._test.trigger('R'));
  await page.waitForTimeout(140);
  const reverseHit = await page.evaluate(() => ({ p2: window.Rig2._test.state(), p1: window.Rig._test.state() }));
  ok(reverseHit.p2.hasHitThisSwing === true, 'player 2 attacking player 1 lands a hit through the exact same shared function');
  ok(reverseHit.p1.velX !== 0, 'player 1 (the defender this time) received real knockback');

  console.log('6. A ring-out (knockback carrying a rig past the arena bound) scores a point and resets both positions');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(120); window.Rig2._test.teleportTo(150); }); // p2 already close to the 170 wall
  const scoreBefore = await page.evaluate(() => window.Duel._test.state());
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(700); // strike lands, knockback carries p2 out, ring-out resets positions
  const scoreAfter = await page.evaluate(() => window.Duel._test.state());
  const postRingOut = await page.evaluate(() => ({ p1: window.Rig._test.state(), p2: window.Rig2._test.state() }));
  ok(scoreAfter.p1Score === scoreBefore.p1Score + 1 && scoreAfter.p2Score === scoreBefore.p2Score,
    'player 1 (the attacker who knocked the other player out) is credited the point, not the other way around');
  ok(postRingOut.p1.posX === -80 && postRingOut.p2.posX === 80,
    'both rigs are reset back to their real duel spawn points after a ring-out, not left wherever they ended up');

  console.log('7. No page/console errors across any of the above');
  ok(pageErrors.length === 0, 'zero page errors (' + pageErrors.length + ' found: ' + pageErrors.join('; ') + ')');
  ok(consoleErrors.length === 0, 'zero console errors (' + consoleErrors.length + ' found: ' + consoleErrors.join('; ') + ')');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
