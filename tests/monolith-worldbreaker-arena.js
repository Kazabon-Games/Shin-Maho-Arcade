// Monolith Arena worldbreaker pass — companion to tests/monolith-
// adversarial.js, using the `worldbreaker` skill's discipline: UI-driven
// only (no state injection for the INTERACTIONS being tested — _test-
// style fast setup for hand/position/stats is used only to reach a
// scenario quickly, the same convention monolith-adversarial.js already
// follows; every actual attack — clicking, mashing, choosing — goes
// through the real UI). Written as the pre-alpha "last gate" pass: it
// targets interactions BETWEEN mechanics that individually pass their own
// feature tests but were never stress-tested together, not re-proof of
// anything monolith-adversarial.js or the operator-by-operator scratch
// suites already cover.
//
// Scope: direct-damage-aggressive's Wonderland bonus + Aggressive-
// flavored Ultimates (found and fixed this pass — see MONOLITH_RULESET.md),
// multi-effect Ultimates (Defeat→Exhaust) applied to the same target in
// sequence including the Auto-Win accept/decline branches, Spear's
// two-cell Strike when the near target is Defeated mid-sequence, the
// Defensive/Reactive system under real pressure (duplicate-operator
// readying, rapid double-clicks on the response overlay), general UI
// mashing across turn actions, empty-roster/deployment edge cases, and a
// mobile-viewport pass.
//
// Usage: serve the repo (`npx http-server -p 8123`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/monolith-worldbreaker-arena.js`.
const { chromium } = require('playwright');
const CODEX = process.env.MONOLITH_CODEX_URL || 'http://localhost:8123/prototypes/monolith-codex.html';
const ARENA = process.env.MONOLITH_ARENA_URL || 'http://localhost:8123/prototypes/monolith-arena.html';
const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

let pass = 0, fail = 0;
const findings = [];
function ok(cond, label, note) {
  if (cond) { pass++; console.log('  ✓', label); }
  else { fail++; findings.push({ label, note: note || '' }); console.log('  ✗', label, note ? '— ' + note : ''); }
}

async function setupBattle(page, { mobile } = {}) {
  await page.goto(CODEX);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => typeof Codex !== 'undefined');
  await page.evaluate(() => {
    Codex._test.quickCreateEsori({ name: 'Caster', class: 'knight', position: 'saboteur', weapon: 'spear' });
    Codex._test.quickCreateEsori({ name: 'Ally', class: 'bishop', position: 'vanguard', weapon: 'wand' });
    Codex._test.quickCreateEsori({ name: 'FillerA3', class: 'rook', position: 'infiltrator', weapon: 'dagger' });
    Codex._test.quickCreateEsori({ name: 'NearTarget', class: 'knight', position: 'saboteur', weapon: 'sword' });
    Codex._test.quickCreateEsori({ name: 'FarTarget', class: 'knight', position: 'vanguard', weapon: 'sword' });
    Codex._test.quickCreateEsori({ name: 'FillerB3', class: 'rook', position: 'infiltrator', weapon: 'dagger' });
  });
  await page.goto(ARENA);
  await page.click('#teamA-picker-vanguard .opt-btn:has-text("Ally")');
  await page.click('#teamA-picker-saboteur .opt-btn:has-text("Caster")');
  await page.click('#teamA-picker-infiltrator .opt-btn:has-text("FillerA3")');
  await page.click('#opponent-mode-group .opt-btn:has-text("Local Pass-and-Play")');
  await page.click('#teamB-picker-vanguard .opt-btn:has-text("FarTarget")');
  await page.click('#teamB-picker-saboteur .opt-btn:has-text("NearTarget")');
  await page.click('#teamB-picker-infiltrator .opt-btn:has-text("FillerB3")');
  await page.click('#begin-deploy-btn');
  await page.waitForSelector('#screen-deploy', { state: 'visible' });
  const deployA = [['Caster', 4, 1], ['Ally', 5, 1], ['FillerA3', 0, 0]];
  for (const [name, x, y] of deployA) {
    await page.click(`#deploy-token-row button:has-text("${name}")`);
    await page.click(`#deploy-board .cell[data-x="${x}"][data-y="${y}"]`);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(100);
  await page.click('text=Deploy Team B →');
  await page.waitForTimeout(100);
  const deployB = [['NearTarget', 4, 7], ['FarTarget', 0, 7], ['FillerB3', 8, 7]];
  for (const [name, x, y] of deployB) {
    await page.click(`#deploy-token-row button:has-text("${name}")`);
    await page.click(`#deploy-board .cell[data-x="${x}"][data-y="${y}"]`);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(100);
  await page.click('text=Start Battle');
  await page.waitForSelector('#screen-battle', { state: 'visible' });
}

async function cycleToUnitTurn(page, name, maxIter) {
  for (let i = 0; i < maxIter; i++) {
    const activeName = await page.evaluate(() => currentUnit()?.name);
    if (activeName === name) return true;
    await page.click('#action-end').catch(() => {});
    await page.waitForTimeout(150);
  }
  return false;
}

function checkPageHealth(page, label, errs) {
  return page.evaluate(() => document.body && document.body.innerText.length > 0)
    .then(healthy => ok(healthy, `[health] ${label} — page has real content`));
}
async function checkNoHorizontalOverflow(page, label, viewportWidth) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(overflow <= 2, `[overflow] ${label} — no horizontal scroll (delta ${overflow}px)`, overflow > 2 ? `scrollWidth exceeds viewport by ${overflow}px` : '');
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const globalErrors = [];
  page.on('pageerror', e => globalErrors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) globalErrors.push('CONSOLE: ' + msg.text()); });
  const snap = () => globalErrors.length;
  const newErrs = (s) => globalErrors.slice(s);

  console.log('\n=== STAGE 1: direct-damage-aggressive + Aggressive-flavored Ultimate ===');
  {
    const s = snap();
    await setupBattle(page);
    await cycleToUnitTurn(page, 'Caster', 20);
    await page.evaluate(() => {
      const u = currentUnit();
      u.hand = ['ult-devastate'];
      u.initiative = 100;
      u.x = 4; u.y = 1;
      u.openWonderlandActive = true;
      u.wonderlandEffectId = 'direct-damage-aggressive'; // Ala zyu Haad's Wonderland effect, forced open for this check
      const t = battle.units.find(x => x.name === 'NearTarget');
      t.x = 4; t.y = 3; t.life = 100; t.initiative = 60;
      renderBattle();
    });
    const before = await page.evaluate(() => battle.units.find(x => x.name === 'NearTarget').life);
    await page.click('#hand-card-group .opt-btn:has-text("Inflict + Afflict")');
    await page.waitForTimeout(80);
    await page.click(`#battle-board .cell[data-x="4"][data-y="3"]`);
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => battle.units.find(x => x.name === 'NearTarget').life);
    const log = await page.evaluate(() => battle.log.slice(0, 4).map(l => l.text));
    console.log('  ult-devastate (Aggressive-flavored) with direct-damage-aggressive open:', JSON.stringify({ before, after, dropped: before - after, log }));
    // Inflict alone (1:1 with 50 Ini cost) would drop life by 50. If the
    // Wonderland bonus (also 50, equal to cost) applied on top, it'd be 100.
    // FIXED post-worldbreaker: was `cardCategory(card) === 'aggressive'`
    // (never true for an Ultimate), now `isAggressiveFlavored(card)`.
    // Inflict's own 50 (1:1 with cost) + the Wonderland bonus's 50 = 100.
    ok(after === before - 100, "direct-damage-aggressive's bonus now correctly applies to Aggressive-flavored Ultimates — Inflict's 50 AND the Wonderland bonus's 50 both landed", `expected drop 100, saw drop ${before - after}`);
    ok(log.some(t => t.includes('direct damage')), 'the "direct damage" log line now appears for this Ultimate cast (confirms the bonus branch fires)');
    const aggInTurn = await page.evaluate(() => battle.units.find(x => x.name === 'Caster').wonderlandProgress.aggInTurn);
    ok(aggInTurn === 1, "the second fix (same root cause, found while auditing every other cardCategory(card)==='aggressive' check in the file): Wonderland's aggInTurn counter now correctly credits an Aggressive-flavored Ultimate play — used to silently undercount Rykndu's own agg-abilities-in-turn:3 activation condition whenever an Ultimate was one of the 3 plays", `aggInTurn=${aggInTurn}, expected 1`);
    await checkPageHealth(page, 'after Ultimate + Wonderland-bonus check', newErrs(s));
    const e = newErrs(s);
    ok(e.length === 0, 'no new JS errors during this stage', e.join(' | '));
  }

  console.log('\n=== STAGE 2: multi-effect Ultimate (Defeat + Exhaust) — second effect vs an already-defeated target ===');
  {
    const s = snap();
    await cycleToUnitTurn(page, 'Caster', 20);
    await page.evaluate(() => {
      const u = currentUnit();
      u.hand = ['ult-annihilate'];
      u.initiative = 100;
      u.x = 4; u.y = 1;
      const t = battle.units.find(x => x.name === 'FarTarget');
      t.x = 4; t.y = 3; t.life = 10; t.initiative = 60; t.rallied = false; t.defeated = false; t.removed = false; // low Life so Defeat's own state change is visible/plausible
      renderBattle();
    });
    // The Auto-Win confirm() fires the INSTANT the hand card is clicked
    // (playUltimateCard checks card.autoWin before any board targeting at
    // all) — the listener has to be registered before THAT click, not
    // before the board-cell click that follows it. DECLINE it here so
    // the card falls through to normal single-target resolution — that's
    // the ONLY path that actually applies Defeat+Exhaust's own operators
    // (the accepted-Auto-Win branch just ends the battle immediately and
    // never touches the target at all — see the dedicated check below).
    let dialogFired = false, dialogMessage = '';
    page.once('dialog', d => { dialogFired = true; dialogMessage = d.message(); d.dismiss(); });
    await page.click('#hand-card-group .opt-btn:has-text("Defeat + Exhaust")');
    await page.waitForTimeout(80);
    ok(dialogFired, 'the Auto-Win confirm() dialog fired immediately on clicking the hand card — BEFORE any board target was chosen (a real UX/ordering fact worth confirming, not assuming)');
    console.log('  Dialog text shown to the player:', JSON.stringify(dialogMessage));
    const modeAfterDecline = await page.evaluate(() => battle.interactionMode);
    ok(modeAfterDecline === 'cast', 'declining Auto-Win correctly falls through to normal targeting (interactionMode is "cast", not stuck or battle-ended)');
    await page.click(`#battle-board .cell[data-x="4"][data-y="3"]`);
    await page.waitForTimeout(150);
    const afterState = await page.evaluate(() => {
      const t = battle.units.find(x => x.name === 'FarTarget');
      return t ? { defeated: t.defeated, initiative: t.initiative, life: t.life } : { removed: true };
    });
    console.log('  FarTarget state after Defeat+Exhaust (Auto-Win DECLINED, normal resolution):', JSON.stringify(afterState));
    ok(afterState.defeated === true, 'Defeat (the first effect) actually flipped defeated=true');
    ok(afterState.initiative === 0, 'Exhaust (the second effect, applied to the SAME now-defeated target) still correctly zeroed Initiative — the mid-sequence state change from Defeat did not block or corrupt the second effect');
    const e = newErrs(s);
    ok(e.length === 0, 'Defeat followed immediately by Exhaust on the same target produced no JS errors', e.join(' | '));
    await checkPageHealth(page, 'after multi-effect Ultimate, Auto-Win declined', newErrs(s));
  }

  console.log('\n=== STAGE 2b: accepting Auto-Win — does it apply the card\'s own operators, or just end the battle? ===');
  {
    const s = snap();
    await page.goto(ARENA);
    await page.evaluate(() => localStorage.clear());
    await setupBattle(page);
    await cycleToUnitTurn(page, 'Caster', 20);
    await page.evaluate(() => {
      const u = currentUnit();
      u.hand = ['ult-annihilate'];
      u.initiative = 100;
      u.x = 4; u.y = 1;
      const t = battle.units.find(x => x.name === 'FarTarget');
      t.x = 4; t.y = 3; t.life = 77; t.initiative = 61; t.rallied = false; t.defeated = false; t.removed = false;
      renderBattle();
    });
    let dialogFired = false;
    page.once('dialog', d => { dialogFired = true; d.accept(); });
    await page.click('#hand-card-group .opt-btn:has-text("Defeat + Exhaust")');
    await page.waitForTimeout(150);
    ok(dialogFired, 'dialog fired for the accept path too');
    const finishedState = await page.evaluate(() => ({
      finished: battle.finished,
      farTargetLifeUnchanged: battle.units.find(x => x.name === 'FarTarget')?.life,
      farTargetIniUnchanged: battle.units.find(x => x.name === 'FarTarget')?.initiative,
      farTargetDefeated: battle.units.find(x => x.name === 'FarTarget')?.defeated,
      screenBattleVisible: document.getElementById('screen-battle')?.style.display,
    }));
    console.log('  State right after accepting Auto-Win:', JSON.stringify(finishedState));
    ok(finishedState.finished === true, 'accepting Auto-Win correctly ends the battle (battle.finished)');
    ok(finishedState.farTargetLifeUnchanged === 77 && finishedState.farTargetIniUnchanged === 61 && finishedState.farTargetDefeated === false, "FINDING: accepting Auto-Win does NOT apply the card's own listed operators (Defeat + Exhaust) to anyone at all — the target's Life/Initiative/defeated state are completely untouched. The battle just ends. Confirm this is the intended reading of \"self-declared Auto-Win condition\" and not an accidental gap — a player reading the card's face (\"Defeat + Exhaust\") could reasonably expect those to also apply.");
    const e = newErrs(s);
    ok(e.length === 0, 'accepting Auto-Win produced no JS errors', e.join(' | '));
    await checkPageHealth(page, 'after accepting Auto-Win', newErrs(s));
  }

  console.log('\n=== STAGE 3: Spear\'s two-cell Strike — near target DEFEATED by the first hit, does the far hit still resolve? ===');
  {
    const s = snap();
    await page.goto(ARENA); // fresh battle — Auto-Win from stage 2 may have ended the previous one
    await page.evaluate(() => localStorage.clear());
    await setupBattle(page);
    await cycleToUnitTurn(page, 'Caster', 20); // Caster is equipped with Spear
    await page.evaluate(() => {
      const u = currentUnit();
      u.x = 4; u.y = 1;
      u.hasStruckThisTurn = false;
      u.initiative = 100;
      const near = battle.units.find(x => x.name === 'NearTarget');
      const far = battle.units.find(x => x.name === 'FarTarget');
      near.x = 4; near.y = 2; near.life = 1; near.rallied = false; near.defeated = false; near.removed = false; // 1 HP — a normal Strike WILL defeat this one
      far.x = 4; far.y = 3; far.life = 100; far.rallied = false; far.defeated = false; far.removed = false;
      renderBattle();
    });
    await page.click('#action-strike');
    await page.waitForTimeout(80);
    await page.click(`#battle-board .cell[data-x="4"][data-y="3"]`); // declare the FAR cell — Spear auto-resolves the near cell first
    await page.waitForTimeout(200);
    const result = await page.evaluate(() => {
      const near = battle.units.find(x => x.name === 'NearTarget');
      const far = battle.units.find(x => x.name === 'FarTarget');
      return {
        near: near ? { life: near.life, defeated: near.defeated, removed: near.removed } : 'GONE FROM battle.units ENTIRELY',
        far: far ? { life: far.life, defeated: far.defeated, removed: far.removed } : 'GONE FROM battle.units ENTIRELY',
      };
    });
    const log = await page.evaluate(() => battle.log.slice(0, 3).map(l => l.text));
    console.log('  After Spear far-cell declaration (near target at 1 HP beforehand):', JSON.stringify({ result, log }));
    ok(result.near !== 'GONE FROM battle.units ENTIRELY' && (result.near.defeated || result.near.removed), 'the near-cell target was actually Defeated by the first hit (test setup validated)');
    ok(result.far !== 'GONE FROM battle.units ENTIRELY', 'the far-cell target still exists in battle.units after the near target was defeated mid-sequence');
    ok(typeof result.far === 'object' && result.far.life < 100, "the far-cell hit still resolved and dealt damage — defeating the near target mid-sequence didn't short-circuit the second hit");
    ok(log.some(t => t.includes('Critical')), "the far hit was forced to Critical (per the stated rule: 'the 1st cell was hit' is what forces it, independent of what then happened to that unit)");
    const e = newErrs(s);
    ok(e.length === 0, 'Spear\'s two-cell sequence with a mid-sequence Defeat produced no JS errors', e.join(' | '));
    await checkPageHealth(page, 'after Spear two-cell Strike with near-target Defeat', newErrs(s));
  }

  console.log('\n=== STAGE 4: Defensive system under real pressure — duplicate readies, rapid double-clicks on the response overlay ===');
  {
    const s = snap();
    await page.goto(ARENA);
    await page.evaluate(() => localStorage.clear());
    await setupBattle(page);
    // Give BOTH NearTarget and FarTarget (Team B) a readied Nullify AND a
    // readied Nullify Cost, simultaneously, against the same upcoming
    // Aggressive card — this should force the 2+-match human response
    // window, now from TWO DIFFERENT units at once (the newer team-wide-
    // scan shape), not just two operators on one unit.
    await cycleToUnitTurn(page, 'NearTarget', 20);
    await page.evaluate(() => { const u = currentUnit(); u.hand = ['card-nullify']; u.initiative = 100; renderBattle(); });
    await page.click('#hand-card-group .opt-btn:has-text("Nullify")');
    await page.waitForTimeout(60);
    await page.click('#action-end');
    await page.waitForTimeout(150);
    await cycleToUnitTurn(page, 'FarTarget', 20);
    await page.evaluate(() => { const u = currentUnit(); u.hand = ['card-nullifyCost']; u.initiative = 100; renderBattle(); });
    await page.click('#hand-card-group .opt-btn:has-text("Nullify Cost")');
    await page.waitForTimeout(60);
    await page.click('#pending-ward-any, .opt-btn:has-text("Any Aggressive Ability")').catch(() => {});
    await page.waitForTimeout(60);
    await page.click('#action-end');
    await page.waitForTimeout(150);
    // Force Caster next, then declare an Aggressive card at a target in
    // range of BOTH readied defenders' teams — actually only one of them
    // is the click-target (declareAction scans the single `target`
    // passed for 'aggressive-played', so put both readied units' esoriIds
    // on the SAME unit by targeting NearTarget specifically, since
    // 'aggressive-played' is still single-target scoped, not team-wide).
    await page.evaluate(() => {
      const u = battle.units.find(x => x.name === 'Caster');
      u.hand = ['card-inflict'];
      u.initiative = 100;
      u.x = 4; u.y = 1;
      const idx = battle.turnQueue.indexOf(u.esoriId);
      if (idx !== -1) battle.turnQueue.splice(idx, 1);
      battle.turnQueue.splice(battle.turnIndex + 1, 0, u.esoriId);
      const near = battle.units.find(x => x.name === 'NearTarget');
      near.x = 4; near.y = 2; near.life = 100;
      // give NearTarget BOTH a Nullify and stack a second Nullify readied
      // (duplicate of the same operator) to stress the "2+ matches" path
      // with a genuine duplicate, not just two different operators.
      near.readiedDefensives.push({ operatorId: 'nullify', cardId: 'card-nullify', warded: null, resistCategory: null });
      renderBattle();
    });
    await page.click('#action-end');
    await page.waitForTimeout(200);
    await page.evaluate(() => { const u = currentUnit(); u.x = 4; u.y = 1; renderBattle(); });
    await page.click('#hand-card-group .opt-btn:has-text("Inflict")');
    await page.waitForTimeout(80);
    await page.click(`#battle-board .cell[data-x="4"][data-y="2"]`);
    await page.waitForTimeout(150);
    const overlayVisible = await page.evaluate(() => {
      const el = document.getElementById('defensive-response-overlay');
      return el && el.style.display === 'flex';
    });
    console.log('  Response overlay open after duplicate-Nullify + Nullify readied on NearTarget:', overlayVisible);
    ok(overlayVisible, 'the 2+-readied-response overlay opened when NearTarget alone had 2 matching Defensives (a real duplicate-operator case, not just two different operators)');
    if (overlayVisible) {
      // RAPID DOUBLE-CLICK the same response button. Playwright's own
      // locator.click() auto-waits for the element to be visible/stable
      // before each click — so two separate locator.click() calls can't
      // land on the SAME still-present DOM node before the first click's
      // handler has already removed it (that's not a double-click, it's
      // two sequential clicks with a render in between). The real attack
      // — two click events landing on the SAME node before either
      // handler's synchronous work (chooseDefensiveResponse, hide the
      // overlay) has a chance to run twice — needs a raw DOM
      // double-dispatch inside one evaluate() call.
      await page.evaluate(() => {
        const btn = document.querySelector('#defensive-response-options .btn.secondary');
        btn.click();
        btn.click();
      });
      await page.waitForTimeout(150);
      const stillOpen = await page.evaluate(() => document.getElementById('defensive-response-overlay').style.display);
      const readiedLeft = await page.evaluate(() => battle.units.find(x => x.name === 'NearTarget').readiedDefensives.length);
      console.log('  After rapid double-click on the same response option:', JSON.stringify({ stillOpen, readiedLeft }));
      ok(stillOpen === 'none', 'the overlay closed cleanly after the double-click (no stuck-open modal)');
      ok(readiedLeft === 1, 'exactly ONE readied Defensive was consumed by the double-click, not both (no double-resolution from the rapid second click)', `readiedLeft=${readiedLeft}, expected 1`);
    }
    const e = newErrs(s);
    ok(e.length === 0, 'duplicate-Defensive + rapid double-click produced no JS errors', e.join(' | '));
    await checkPageHealth(page, 'after Defensive-overlay mashing', newErrs(s));
  }

  console.log('\n=== STAGE 5: general UI mashing — rapid action-button switching, double-clicking cast, end-turn spam ===');
  {
    const s = snap();
    await cycleToUnitTurn(page, 'Caster', 20);
    // Rapidly toggle between Move/Strike/Rally modes several times, then
    // spam End Turn — a real user tapping impatiently.
    for (let i = 0; i < 6; i++) {
      await page.click('#action-move').catch(() => {});
      await page.click('#action-strike').catch(() => {});
      await page.click('#action-rally').catch(() => {});
    }
    await page.waitForTimeout(100);
    const modeAfterMash = await page.evaluate(() => battle.interactionMode);
    console.log('  interactionMode after rapid mode-toggle mashing:', modeAfterMash);
    ok(['move', 'strike', 'rally', null].includes(modeAfterMash), 'interactionMode settled into a valid, expected state after rapid toggling (no corrupted mode string)');
    // Double-click End Turn back to back.
    const endBtn = page.locator('#action-end');
    await Promise.all([endBtn.click().catch(() => {}), endBtn.click({ force: true }).catch(() => {})]);
    await page.waitForTimeout(400);
    const roundAfterDoubleEnd = await page.evaluate(() => battle.round);
    console.log('  battle.round after double-clicking End Turn once:', roundAfterDoubleEnd);
    const e = newErrs(s);
    ok(e.length === 0, 'rapid action-mode toggling and double-clicked End Turn produced no JS errors', e.join(' | '));
    await checkPageHealth(page, 'after general UI mashing', newErrs(s));
  }

  console.log('\n=== STAGE 6: mobile viewport (390px) pass ===');
  {
    const s = snap();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);
    await checkNoHorizontalOverflow(page, 'Arena battle screen @390px mid-battle');
    await checkPageHealth(page, 'Arena @390px', newErrs(s));
    // Also check the deploy/setup screens at mobile width with a fresh battle.
    await page.goto(ARENA);
    await page.waitForTimeout(200);
    await checkNoHorizontalOverflow(page, 'Arena setup screen @390px');
    const e = newErrs(s);
    ok(e.length === 0, 'no new JS errors switching to mobile viewport', e.join(' | '));
    await page.setViewportSize({ width: 1280, height: 900 });
  }

  console.log('\n=== STAGE 7: empty/degenerate roster and deployment edge cases ===');
  {
    const s = snap();
    await page.goto(CODEX);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => typeof Codex !== 'undefined');
    await page.goto(ARENA);
    await page.waitForTimeout(200);
    await checkPageHealth(page, 'Arena with a completely empty roster (no Esori created at all)', newErrs(s));
    // Clicking Begin Deploy with nothing selected should be a safe no-op,
    // not a crash — mash it a few times.
    for (let i = 0; i < 3; i++) await page.click('#begin-deploy-btn').catch(() => {});
    await page.waitForTimeout(150);
    const stillOnSetup = await page.evaluate(() => document.getElementById('screen-setup')?.style.display !== 'none');
    console.log('  Still on setup screen after mashing Begin Deploy with an empty roster:', stillOnSetup);
    const e = newErrs(s);
    ok(e.length === 0, 'empty-roster Arena + mashed Begin Deploy produced no JS errors', e.join(' | '));
    await checkPageHealth(page, 'after empty-roster mashing', newErrs(s));
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (findings.length) {
    console.log('\n--- FINDINGS ---');
    findings.forEach(f => console.log(`  ✗ ${f.label}${f.note ? ' — ' + f.note : ''}`));
  }
  console.log('\nAll JS errors seen across the whole run:', globalErrors.length ? globalErrors : 'none');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('WORLDBREAKER SCRIPT FAILED TO COMPLETE:', e); process.exit(1); });
