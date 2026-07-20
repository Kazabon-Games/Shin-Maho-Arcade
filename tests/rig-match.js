// Rykndu doll-rig MATCH structure regression pass -- a running ring-out
// score with no endpoint was never a finished match (named directly by
// producer feedback after v0.1.21/v0.1.22 landed combat resolution and
// mobile emulation: "a round/match structure beyond a running score" was
// the one concrete gap left on the table). v0.1.23 adds an actual best-
// of-MATCH_TARGET_SCORE win condition, a match-over freeze, a result
// overlay, and a rematch path from EITHER player's attack input -- this
// file drives all of that through window.Duel._test/window.Rig._test/
// window.Rig2._test, never a duplicated copy of resetMatch()/tryRematch().
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-match.js`.
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
      window.Duel._test.resetMatch();
    });
  }

  // Lands one clean ring-out from p1 onto p2 (p1 is the attacker/winner
  // of the point). Reuses teleportTo() the same way tests/rig-combat.js
  // does -- deterministic positioning, not waiting out real movement.
  async function landOneRingOut() {
    await page.evaluate(() => { window.Rig._test.teleportTo(120); window.Rig2._test.teleportTo(150); });
    await page.evaluate(() => window.Rig._test.trigger('R'));
    await page.waitForTimeout(700); // strike lands, knockback carries p2 out, ring-out resolves
  }

  console.log('1. A match starts undecided, with a real target score');
  await freshDuel();
  const start = await page.evaluate(() => window.Duel._test.state());
  ok(start.p1Score === 0 && start.p2Score === 0, 'both scores start at zero');
  ok(start.matchOver === false && start.matchWinner === null, 'the match starts undecided');

  console.log('2. Ring-outs accumulate toward the target without ending the match early');
  await landOneRingOut();
  const afterOne = await page.evaluate(() => window.Duel._test.state());
  ok(afterOne.p1Score === 1 && afterOne.matchOver === false, 'one ring-out scores a point but does not end the match (target is higher than 1)');
  await landOneRingOut();
  const afterTwo = await page.evaluate(() => window.Duel._test.state());
  ok(afterTwo.p1Score === 2 && afterTwo.matchOver === false, 'still undecided short of the target');

  console.log('3. Reaching the target score ends the match and freezes both rigs');
  await landOneRingOut();
  const decided = await page.evaluate(() => window.Duel._test.state());
  ok(decided.p1Score === 3 && decided.matchOver === true && decided.matchWinner === 'P1',
    'reaching the target score (3) ends the match and credits the correct winner');
  const beforeFreeze = await page.evaluate(() => ({ p1: window.Rig._test.state(), p2: window.Rig2._test.state() }));
  await page.evaluate(() => { window.Rig._test.setMoveIntent(1); window.Rig2._test.setMoveIntent(-1); });
  await page.waitForTimeout(200);
  const afterAttemptedMove = await page.evaluate(() => ({ p1: window.Rig._test.state(), p2: window.Rig2._test.state() }));
  ok(afterAttemptedMove.p1.posX === beforeFreeze.p1.posX && afterAttemptedMove.p2.posX === beforeFreeze.p2.posX,
    'neither rig moves anymore once the match is decided, even with movement intent actively held');

  console.log('4. A decided match blocks further combat resolution (no more hits/ring-outs register)');
  // rawAttack() bypasses handleInput()'s tryRematch() check specifically
  // to verify resolveCombatHits()'s OWN internal matchOver guard directly
  // -- every REAL input path already refuses to reach this state (see
  // §5/§6 below), so this is testing defense-in-depth, not a realistic
  // player action.
  await page.evaluate(() => { window.Rig._test.teleportTo(120); window.Rig2._test.teleportTo(150); });
  await page.evaluate(() => window.Rig._test.rawAttack('R'));
  await page.waitForTimeout(700);
  const scoreStillDecided = await page.evaluate(() => window.Duel._test.state());
  ok(scoreStillDecided.p1Score === 3 && scoreStillDecided.p2Score === 0,
    'score is frozen at the decided result -- teleporting/attacking post-match-over does not change it');

  console.log('5. Either player\'s attack input restarts the match (not just player 1\'s)');
  await page.evaluate(() => window.Rig2._test.trigger('L')); // player 2's own attack input, not player 1's
  await page.waitForTimeout(30);
  const afterP2Rematch = await page.evaluate(() => window.Duel._test.state());
  ok(afterP2Rematch.matchOver === false && afterP2Rematch.p1Score === 0 && afterP2Rematch.p2Score === 0,
    'player 2\'s attack input alone restarted the match and reset both scores to zero');
  const afterRematchPositions = await page.evaluate(() => ({ p1: window.Rig._test.state(), p2: window.Rig2._test.state() }));
  ok(afterRematchPositions.p1.posX === -80 && afterRematchPositions.p2.posX === 80,
    'both rigs are back at their real duel spawn points after the rematch, not left wherever they were');

  console.log('6. The rematch-triggering input itself is consumed as a rematch, not also thrown as an attack');
  // afterP2Rematch above already confirms p2 didn't stay idle=false from
  // an attack landing -- check directly that p2 is idle right after.
  const p2StateAfterRematch = await page.evaluate(() => window.Rig2._test.state());
  ok(p2StateAfterRematch.idle === true, 'the attack input that triggered the rematch was consumed by it, not also thrown as a real kick');

  console.log('7. A full second match plays out correctly after a rematch (the reset is a genuine restart, not a one-time fluke)');
  await landOneRingOut(); await landOneRingOut(); await landOneRingOut();
  const secondMatchDecided = await page.evaluate(() => window.Duel._test.state());
  ok(secondMatchDecided.matchOver === true && secondMatchDecided.matchWinner === 'P1' && secondMatchDecided.p1Score === 3,
    'a second full match plays out and resolves correctly after a rematch');
  await page.evaluate(() => window.Duel._test.resetMatch());

  console.log('8. No page/console errors across any of the above');
  ok(pageErrors.length === 0, 'zero page errors (' + pageErrors.length + ' found: ' + pageErrors.join('; ') + ')');
  ok(consoleErrors.length === 0, 'zero console errors (' + consoleErrors.length + ' found: ' + consoleErrors.join('; ') + ')');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
