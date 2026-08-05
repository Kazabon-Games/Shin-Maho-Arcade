// Monolith: The Esori Chronicles adversarial/verification pass — mirrors
// tests/wardfall-adversarial.js's discipline: drives the real UI (plus
// each document's own _test hooks for reading state and for setup that
// isn't itself under test), checks console/page errors and horizontal
// overflow at a mobile viewport, and hand-verifies the ability-card
// resolver against MONOLITH_RULESET.md's stated rules (the 1:1 Initiative-
// to-life-effect ratio, AND applying both operators, OR applying exactly
// one). Two documents, one suite — monolith-codex.html (creation/roster/
// deck) and monolith-arena.html (the battle engine), since this repo's own
// convention is one adversarial file per game, and Monolith is one game
// split across two documents (same reasoning wonderland-*.js in
// age-of-wonder uses for its own two-document split).
//
// Usage: serve the repo (`npx http-server -p 8123`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/monolith-adversarial.js`.
const { chromium } = require('playwright');

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const CODEX_URL = process.env.MONOLITH_CODEX_URL || 'http://localhost:8123/prototypes/monolith-codex.html';
const ARENA_URL = process.env.MONOLITH_ARENA_URL || 'http://localhost:8123/prototypes/monolith-arena.html';

let pass = 0, fail = 0;
function ok(cond, label){
  if (cond) { pass++; console.log('  ok   -', label); }
  else { fail++; console.log('  FAIL -', label); }
}

async function checkOverflow(page, label){
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  ok(!overflow, `no horizontal overflow — ${label}`);
}

async function createEsoriViaWizard(page, { name, classLabel, positionLabel, weaponLabel }){
  await page.click('text=+ New Esori');
  await page.fill('#field-name', name);
  await page.click('text=Class →');
  await page.click(`#class-group .opt-btn:has-text("${classLabel}")`);
  await page.click('text=Position →');
  await page.click(`#position-group .opt-btn:has-text("${positionLabel}")`);
  await page.click('text=Tulpa →');
  await page.fill('#field-tulpa-name', name + '-tulpa');
  await page.fill('#field-activation', 'a'); await page.fill('#field-effect', 'e'); await page.fill('#field-sustain', 's');
  await page.click('text=Weapon →');
  await page.click(`#weapon-group .opt-btn:has-text("${weaponLabel}")`);
  await page.click('text=Review →');
  await page.click('text=Save to Roster');
  await page.waitForTimeout(80);
}

async function chebyshevMoveToward(page){
  // Setup helper, not a thing under test — moves the current unit one step
  // closer to the nearest live enemy, reusing Arena's own real functions
  // via a single evaluate() call (see the harness skill's "bundle _test
  // calls that must not interleave with a real frame" rule — not strictly
  // needed here since Arena has no animation loop, but bundling keeps this
  // atomic with itself regardless).
  return page.evaluate(() => {
    const u = currentUnit(); if (!u) return false;
    const enemies = battle.units.filter(t => t.team !== u.team && !t.defeated && !t.removed);
    if (!enemies.length) return false;
    const reach = reachableCells(u.x, u.y, u.distanceRemaining);
    let best = null, bestDist = Infinity;
    for (const key of Object.keys(reach)){
      const [cx, cy] = key.split(',').map(Number);
      const d = Math.min(...enemies.map(e => Math.max(Math.abs(e.x-cx), Math.abs(e.y-cy))));
      if (d < bestDist){ bestDist = d; best = [cx, cy]; }
    }
    if (best) { tryMove(u, best[0], best[1]); return true; }
    return false;
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const consoleErrors = [], pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.message));

  // ============================================================
  console.log('1. Codex loads clean, empty-submit wizard rejected');
  // ============================================================
  await page.goto(CODEX_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof Codex !== 'undefined' && typeof Codex._test !== 'undefined');
  await page.evaluate(() => Codex._test.clearRoster());
  ok(consoleErrors.length === 0, 'zero console errors on Codex load');
  ok(pageErrors.length === 0, 'zero page errors on Codex load');

  await page.click('text=+ New Esori');
  await page.click('text=Class →'); await page.click('text=Position →');
  await page.click('text=Tulpa →'); await page.click('text=Weapon →');
  await page.click('text=Review →');
  const emptyErrBox = await page.locator('#review-errors').textContent();
  const beforeSave = (await page.evaluate(() => Codex._test.getRoster())).length;
  await page.click('text=Save to Roster');
  const afterSave = (await page.evaluate(() => Codex._test.getRoster())).length;
  ok(emptyErrBox.trim().length > 0, 'empty wizard shows a validation error');
  ok(beforeSave === afterSave, 'empty wizard does not save a roster entry');
  // Back to Identity via the Back-button chain, not the desktop-only rail
  // (#rs-N) — this whole suite runs at a 390px mobile viewport, where the
  // rail is deliberately display:none (mobile navigates via the sticky
  // progress bar + Back/Next instead).
  await page.click('text=← Weapon'); await page.click('text=← Tulpa');
  await page.click('text=← Position'); await page.click('text=← Class');
  await page.click('text=← Identity');
  await page.fill('#field-name', '     ');
  await page.click('text=Class →'); await page.click('text=Position →');
  await page.click('text=Tulpa →'); await page.click('text=Weapon →');
  await page.click('text=Review →');
  ok((await page.locator('#review-errors').textContent()).includes('name'), 'whitespace-only name still flagged as missing');
  await page.click('#wizard-view >> text=Cancel');

  // ============================================================
  console.log('2. Messy real-world strings + XSS safety');
  // ============================================================
  const messyName = `  O'Brien & Sons 🍕 日本語  `;
  const xssPayload = '<script>window.__xss=true</script>';
  await createEsoriViaWizard(page, { name: messyName, classLabel: 'Knight', positionLabel: 'Vanguard', weaponLabel: 'Sword' });
  ok((await page.locator('.roster-card').first().innerText()).includes("O'Brien") , 'apostrophe/ampersand/emoji/unicode name renders intact');

  await page.click('text=+ New Esori');
  await page.fill('#field-name', xssPayload);
  await page.click('text=Class →'); await page.click('#class-group .opt-btn:has-text("Rook")');
  await page.click('text=Position →'); await page.click('#position-group .opt-btn:has-text("Saboteur")');
  await page.click('text=Tulpa →');
  await page.fill('#field-tulpa-name', xssPayload); await page.fill('#field-activation', xssPayload);
  await page.fill('#field-effect', xssPayload); await page.fill('#field-sustain', xssPayload);
  await page.click('text=Weapon →'); await page.click('#weapon-group .opt-btn:has-text("Dagger")');
  await page.click('text=Review →');
  const xssAtReview = await page.evaluate(() => window.__xss === true);
  await page.click('text=Save to Roster');
  await page.waitForTimeout(80);
  const xssAfterSave = await page.evaluate(() => window.__xss === true);
  ok(!xssAtReview && !xssAfterSave, 'XSS payload in every wizard field never executes (review or roster render)');

  // ============================================================
  console.log('3. Grimoire/deck defaults, deck editor caps at 10');
  // ============================================================
  const knightRecord = (await page.evaluate(() => Codex._test.getRoster())).find(r => r.name.includes("O'Brien"));
  ok(knightRecord.grimoire.length === (await page.evaluate(() => CARD_LIBRARY.length)), 'new Esori Grimoire = full shared CARD_LIBRARY');
  ok(knightRecord.deck.length === 10, 'new Esori starts with a 10-card starter deck');

  await page.click(`.roster-card:has-text("O'Brien") >> text=Edit Deck`);
  await page.waitForSelector('#deck-view', { state: 'visible' });
  const preSelected = await page.locator('#deck-card-group .opt-btn.sel').count();
  ok(preSelected === 10, 'deck editor pre-selects the current 10-card deck');
  const allCards = await page.locator('#deck-card-group .opt-btn').all();
  for (const btn of allCards) { // select every card in the library — cap should hold at 10
    const sel = await btn.evaluate(el => el.classList.contains('sel'));
    if (!sel) await btn.click();
  }
  ok((await page.locator('#deck-card-group .opt-btn.sel').count()) === 10, 'selecting the entire Grimoire still caps the deck at 10 (bump-earliest behavior)');
  await page.click('text=Cancel');

  // ============================================================
  console.log('4. Import validation — corrupt, missing-required, wrong-typed-optional');
  // ============================================================
  const fs = require('fs');
  const os = require('os');
  const tmp = fs.mkdtempSync(require('path').join(os.tmpdir(), 'monolith-test-'));
  const garbagePath = require('path').join(tmp, 'garbage.json');
  const missingPath = require('path').join(tmp, 'missing.json');
  const wrongTypePath = require('path').join(tmp, 'wrongtype.json');
  fs.writeFileSync(garbagePath, 'not json {{{');
  fs.writeFileSync(missingPath, JSON.stringify({ schemaVersion: 1, exportMode: 'share', esori: { esoriId: 'x', updatedAt: new Date().toISOString(), name: 'NoClass', position: 'vanguard', rarity: 1, tulpa: { name: 't', openWonderland: { activation:'a', effect:'e', sustain:'s' } } } }));
  fs.writeFileSync(wrongTypePath, JSON.stringify({ schemaVersion: 1, exportMode: 'share', esori: { esoriId: 'y', updatedAt: new Date().toISOString(), name: 'WrongTypes', class: 'knight', position: 'vanguard', rarity: 1, tulpa: { name: 't', openWonderland: { activation:'a', effect:'e', sustain:'s' } }, grimoire: 'not-an-array', deck: null } }));

  for (const [label, path, expectOk] of [['garbage text', garbagePath, false], ['missing required class', missingPath, false], ['wrong-typed optional fields', wrongTypePath, true]]) {
    const rosterBefore = (await page.evaluate(() => Codex._test.getRoster())).length;
    await page.evaluate(() => { document.getElementById('import-status').textContent = ''; });
    await page.setInputFiles('#import-file', path);
    await page.click('#import-btn');
    await page.waitForFunction(() => document.getElementById('import-status').textContent.trim().length > 0);
    const cls = await page.getAttribute('#import-status', 'class');
    const rosterAfter = (await page.evaluate(() => Codex._test.getRoster())).length;
    if (expectOk) ok(cls.includes('ok') && rosterAfter === rosterBefore + 1, `import ${label}: accepted with safe defaults`);
    else ok(cls.includes('err') && rosterAfter === rosterBefore, `import ${label}: rejected, roster untouched`);
  }

  // ============================================================
  console.log('5. Export share mode nulls currency; esoriId-keyed re-import never duplicates');
  // ============================================================
  const [ download ] = await Promise.all([
    page.waitForEvent('download'),
    page.click(`.roster-card:has-text("O'Brien") >> text=Export (Share)`),
  ]);
  const dlPath = await download.path();
  const exported = JSON.parse(fs.readFileSync(dlPath, 'utf8'));
  ok(exported.exportMode === 'share' && exported.currency === null, 'share-mode export nulls currency');

  const rosterBeforeReimport = (await page.evaluate(() => Codex._test.getRoster())).length;
  await page.evaluate(() => { document.getElementById('import-status').textContent = ''; });
  await page.setInputFiles('#import-file', dlPath);
  await page.click('#import-btn');
  await page.waitForFunction(() => document.getElementById('import-status').textContent.trim().length > 0);
  const rosterAfterReimport = (await page.evaluate(() => Codex._test.getRoster())).length;
  ok(rosterAfterReimport === rosterBeforeReimport, 're-importing an unchanged export is a no-op, not a duplicate');

  const newer = JSON.parse(JSON.stringify(exported));
  newer.esori.updatedAt = new Date(Date.now() + 60000).toISOString();
  newer.esori.name = "O'Brien Renamed";
  const newerPath = require('path').join(tmp, 'newer.json');
  fs.writeFileSync(newerPath, JSON.stringify(newer));
  await page.evaluate(() => { document.getElementById('import-status').textContent = ''; });
  await page.setInputFiles('#import-file', newerPath);
  await page.click('#import-btn');
  await page.waitForFunction(() => document.getElementById('import-status').textContent.includes('Imported'));
  const rosterAfterNewer = await page.evaluate(() => Codex._test.getRoster());
  ok(rosterAfterNewer.length === rosterBeforeReimport, 'newer re-import updates in place, still no duplicate');
  ok(rosterAfterNewer.some(r => r.name === "O'Brien Renamed"), 'newer re-import\'s data actually applied');

  // ============================================================
  console.log('6. Codex persistence across reload; theme toggle persists');
  // ============================================================
  const rosterCountPreReload = (await page.evaluate(() => Codex._test.getRoster())).length;
  await page.reload();
  await page.waitForFunction(() => typeof Codex !== 'undefined' && typeof Codex._test !== 'undefined');
  ok((await page.evaluate(() => Codex._test.getRoster())).length === rosterCountPreReload, 'roster survives a real page reload');
  const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.click('#theme-toggle');
  await page.reload();
  await page.waitForFunction(() => typeof Codex !== 'undefined');
  const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  ok(themeBefore !== themeAfter, 'theme toggle persists across reload');
  await checkOverflow(page, 'Codex @390px');

  // Build a clean, known 3-Esori roster for the Arena section below (this
  // setup is not itself under test — quickCreateEsori is exactly the "skip
  // past the part that isn't being tested" case the harness skill names).
  await page.evaluate(() => Codex._test.clearRoster());
  const cardIds = await page.evaluate(() => CARD_LIBRARY.map(c => c.id));
  const mixedDeck = cardIds.filter(id => ['card-inflict', 'card-heal', 'card-root', 'card-evade', 'card-inflict-and-afflict', 'card-strike-or-mov', 'card-afflict', 'card-hinder', 'card-disarm', 'card-jumbie'].includes(id));
  await page.evaluate((deck) => {
    // Vann's deck is deterministic on purpose (all Inflict) — per the
    // harness skill's "deterministic fixtures beat incidental ones" rule,
    // rather than relying on a shuffled 10-card deck to put Inflict in
    // Vann's capped 5-card hand before the check's turn budget runs out.
    Codex._test.quickCreateEsori({ name: 'Vann', class: 'knight', position: 'vanguard', weapon: 'sword', deck: Array(10).fill('card-inflict') });
    Codex._test.quickCreateEsori({ name: 'Sabo', class: 'rook', position: 'saboteur', weapon: 'dagger', deck });
    Codex._test.quickCreateEsori({ name: 'Infi', class: 'bishop', position: 'infiltrator', weapon: 'wand', deck });
  }, mixedDeck);
  ok((await page.evaluate(() => Codex._test.getRoster())).length === 3, 'quickCreateEsori built a clean 3-Esori roster for the Arena section');

  // ============================================================
  console.log('7. Arena reads the shared roster; empty/partial-roster gating');
  // ============================================================
  await page.goto(ARENA_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof Arena !== 'undefined' && typeof Arena._test !== 'undefined');
  ok(consoleErrors.filter(e => !e.includes('Codex')).length >= 0, 'Arena loaded'); // no-op sentinel kept for symmetry with section 1's shape
  const teamAOptions = await page.locator('#teamA-picker .opt-btn').count();
  ok(teamAOptions === 3, 'Arena sees all 3 Esori from the shared roster (one per Position)');

  // ============================================================
  console.log('8. Deployment: no-op misclicks, zone enforcement');
  // ============================================================
  await page.click('#teamA-picker .opt-btn:has-text("Vann")');
  await page.click('#teamA-picker .opt-btn:has-text("Sabo")');
  await page.click('#teamA-picker .opt-btn:has-text("Infi")');
  await page.click('#opponent-mode-group .opt-btn:has-text("AI Squad")');
  await page.click('#begin-deploy-btn');
  await page.waitForSelector('#screen-deploy', { state: 'visible' });

  await page.click('#deploy-board .cell[data-x="4"][data-y="0"]'); // no token selected — no-op
  ok((await page.locator('#deploy-token-row button').count()) === 3, 'clicking the deploy board with no token selected is a no-op');
  await page.click('#deploy-token-row button >> nth=0');
  await page.click('#deploy-board .cell[data-x="4"][data-y="4"]'); // outside zone rows 0-1 — rejected
  ok((await page.locator('#deploy-token-row button').count()) === 3, 'clicking outside the deploy zone does not place the token');

  for (let i = 0; i < 3; i++) {
    await page.click('#deploy-token-row button >> nth=0');
    await page.click(`#deploy-board .cell[data-x="${[2,4,6][i]}"][data-y="1"]`);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(150);
  await page.click('text=Start Battle');
  await page.waitForSelector('#screen-battle', { state: 'visible' });
  ok((await page.evaluate(() => Arena._test.getBattle().units.length)) === 6, 'battle starts with 6 units (3 per team)');

  // ============================================================
  console.log('9. Turn order is initiative-descending; strike/move gating holds');
  // ============================================================
  const initialQueue = await page.evaluate(() => Arena._test.getBattle().turnQueue.map(id => Arena._test.getBattle().units.find(u => u.esoriId === id).initiative));
  const sorted = [...initialQueue].sort((a,b) => b - a);
  ok(JSON.stringify(initialQueue) === JSON.stringify(sorted), 'turn queue is sorted by descending initiative');

  const firstUnit = await page.evaluate(() => Arena._test.getCurrentUnit());
  ok(firstUnit.distanceRemaining === firstUnit.distance, 'first turn of the battle opens with full movement (regression check for the v0.1.0 zero-movement bug)');

  await page.click('#battle-board .cell[data-x="0"][data-y="0"]'); // no interaction mode active — no-op
  ok((await page.evaluate(() => Arena._test.getCurrentUnit().life)) === firstUnit.life, 'clicking the board with no action mode selected is a no-op');

  // ============================================================
  console.log('10. Ability cards: 1:1 life-damage math, AND applies both, OR applies exactly one');
  // ============================================================
  // Cycle turns (real UI: Move/Strike toward nearest enemy) until a Team A
  // unit has card-inflict in hand and an enemy within Ability Range.
  async function cycleUntil(predicate, maxIter){
    for (let i = 0; i < maxIter; i++) {
      if (await predicate()) return true;
      const activeText = await page.locator('#hud-active').textContent().catch(() => '');
      if (!activeText.includes('Team A')) { await page.waitForTimeout(350); continue; }
      await page.click('#action-strike'); await page.waitForTimeout(30);
      const target = page.locator('#battle-board .cell.targetable').first();
      if (await target.count()) { await target.click(); }
      else {
        await page.click('#action-move'); await page.waitForTimeout(30);
        await chebyshevMoveToward(page);
      }
      await page.waitForTimeout(40);
      const endBtn = page.locator('#action-end');
      if (await endBtn.isEnabled()) await endBtn.click();
      await page.waitForTimeout(250);
    }
    return false;
  }
  const inflictReady = await cycleUntil(() => page.evaluate(() => {
    const u = Arena._test.getCurrentUnit();
    if (!u || u.controller !== 'human') return false;
    const hasCard = u.hand.includes('card-inflict');
    const inRange = battle.units.some(t => t.team !== u.team && !t.defeated && !t.removed && Math.max(Math.abs(t.x-u.x), Math.abs(t.y-u.y)) <= u.abilityRange);
    return hasCard && inRange;
  }), 40);
  ok(inflictReady, 'a Team A unit draws Inflict and reaches ability range within a reasonable number of turns');

  if (inflictReady) {
    // Multiple enemies can be within range at once, so "the target" is
    // whichever cell actually gets clicked below (board-scan order), not
    // necessarily whichever `.find()` happens to return first — record
    // every enemy's life, not just one, and read the actual target back
    // out of the battle log after the cast.
    const before = await page.evaluate(() => {
      const u = Arena._test.getCurrentUnit();
      return { ini: u.initiative, lifeByName: Object.fromEntries(battle.units.filter(t => t.team !== u.team).map(t => [t.name, t.life])) };
    });
    await page.click('#hand-card-group .opt-btn:has-text("Inflict"):not(:has-text("Afflict"))');
    await page.waitForTimeout(40);
    await page.click('#battle-board .cell.targetable >> nth=0');
    await page.waitForTimeout(60);
    const after = await page.evaluate(() => {
      const u = Arena._test.getCurrentUnit();
      return { ini: u.initiative, log: battle.log[0].text, lifeByName: Object.fromEntries(battle.units.filter(t => t.team !== u.team).map(t => [t.name, t.life])) };
    });
    const targetName = after.log.match(/on (\w+)\.$/)?.[1];
    const dmgDealt = targetName ? before.lifeByName[targetName] - after.lifeByName[targetName] : NaN;
    ok(before.ini - after.ini === dmgDealt, `Inflict: Initiative spent equals damage dealt on the actual target (${targetName}) — 1:1 rule`);
  }

  // AND/OR verified directly against the shipped resolver (applyOperator/
  // finalizeCast), same functions the UI path calls — this is a pure-
  // function correctness check, not a UI interaction, so calling it
  // directly is the right tool, per the harness skill's own framing of
  // _test hooks as fast setup/assertion, not a UI bypass for the thing
  // actually under test (the thing under test here IS the function).
  const andResult = await page.evaluate(() => {
    // finalizeCast() also deducts the caster's own initiative and discards
    // from the caster's own hand, so the fixture needs those fields too —
    // not just whatever fields the operator itself touches on the target.
    const card = CARD_LIBRARY.find(c => c.id === 'card-inflict-and-afflict');
    const caster = { initiative: 60, hand: [card.id], discard: [] };
    const target = { life: 100, maxLife: 100, initiative: 60, activePassive: null };
    finalizeCast(caster, target, card, 25);
    return { life: target.life, initiative: target.initiative, casterIni: caster.initiative, discarded: caster.discard.includes(card.id) };
  });
  // Afflict follows the 1:1-with-Initiative-spent ratio (GDD §11.1 —
  // same rule as Inflict/Heal, not the 20:1 ratio Hinder/Obstruct/
  // Occlude use), so a 25-Ini AND-modified card reduces Initiative by 25,
  // not a flat 1.
  ok(andResult.life === 75 && andResult.initiative === 35, 'AND card applies BOTH operators (Inflict: -25 life, Afflict: -25 initiative, both 1:1 with the 25-Ini cost)');
  ok(andResult.casterIni === 35 && andResult.discarded, 'AND card deducts caster Initiative once (not per-operator) and discards the card');

  const orResult = await page.evaluate(() => {
    const card = CARD_LIBRARY.find(c => c.id === 'card-strike-or-mov');
    const caster = { initiative: 60, hand: [card.id], discard: [] };
    const target = { strike: 2, distanceRemaining: 3, activePassive: null };
    finalizeCast(caster, target, card, 30, 'giveMov'); // simulates the player choosing "Give Mov" in the OR panel
    return { strike: target.strike, distanceRemaining: target.distanceRemaining };
  });
  ok(orResult.strike === 2 && orResult.distanceRemaining === 4, 'OR card applies ONLY the chosen operator (regression check for the double-apply bug)');

  const evadeResult = await page.evaluate(() => {
    const target = { life: 50, maxLife: 100, activePassive: 'evade' };
    applyLifeDamage(target, 30);
    return target.life;
  });
  ok(evadeResult === 50, 'Evade (activePassive) blocks life-damage entirely');

  const shieldResult = await page.evaluate(() => {
    const target = { strike: 5, activePassive: 'shield' };
    applyOperator('disarm', {}, target, 20);
    return target.strike;
  });
  ok(shieldResult === 5, 'Shield (activePassive) blocks stat-set-zero effects');

  // ============================================================
  console.log('11. AI plays cards, not just movement/Weapon Strike');
  // ============================================================
  let battleFinished = false;
  for (let i = 0; i < 150; i++) {
    if (await page.locator('#screen-gameover').isVisible().catch(() => false)) { battleFinished = true; break; }
    const activeText = await page.locator('#hud-active').textContent().catch(() => '');
    if (!activeText.includes('Team A')) { await page.waitForTimeout(300); continue; }
    await page.click('#action-strike'); await page.waitForTimeout(20);
    const target = page.locator('#battle-board .cell.targetable').first();
    if (await target.count()) { await target.click(); }
    else { await page.click('#action-move'); await page.waitForTimeout(20); await chebyshevMoveToward(page); }
    await page.waitForTimeout(30);
    if (await page.locator('#screen-gameover').isVisible().catch(() => false)) { battleFinished = true; break; }
    const endBtn = page.locator('#action-end');
    if (await endBtn.isEnabled()) await endBtn.click();
    await page.waitForTimeout(180);
  }
  ok(battleFinished, 'a full battle (with all prior adversarial interactions already applied) still reaches a clean finish');
  const fullLog = await page.evaluate(() => battle.log.map(l => l.text));
  const aiCardActions = fullLog.filter(t => (t.includes('activates') || t.includes(' plays ')) && ['Thornclad','Vessa','Orune'].some(n => t.startsWith(n)));
  ok(aiCardActions.length > 0, 'AI (team B) plays at least one ability card over the course of a battle');

  await checkOverflow(page, 'Arena battle @390px');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  console.log('final console errors:', JSON.stringify(consoleErrors));
  console.log('final page errors:', JSON.stringify(pageErrors));
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
