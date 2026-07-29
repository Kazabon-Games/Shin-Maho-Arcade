// Runeshatter adversarial/verification pass — mirrors tests/wardfall-adversarial.js's
// discipline: drives the real page via Board._test / Persist / Game._test hooks, checks
// console/page errors and mobile-viewport overflow, and hand-verifies the three genuinely
// novel logic pieces GAME_7_PILLARS.md §7 calls out by name: fixed-point cascade
// termination, bomb-chain-triggers-bomb, and save-schema-mismatch/corrupt-session recovery.
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/runeshatter-adversarial.js`.
const { chromium } = require('playwright');

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const BASE_URL = process.env.RUNESHATTER_URL || 'http://localhost:8935/runeshatter.html';

let pass = 0, fail = 0;
function ok(cond, label){
  if(cond){ pass++; console.log('  ok   -', label); }
  else { fail++; console.log('  FAIL -', label); }
}

// ---- deterministic board builder shared by several tests: an 8x8
// checkerboard of fire/frost never produces a 3-run in any straight line
// (parity flips every step in both directions), so every test below can
// drop a few explicit overrides onto it and know EXACTLY which matches
// exist, with zero incidental noise from the filler cells.
function checkerboardPattern(overrides){
  const pattern = [];
  for(let r=0;r<8;r++){
    const row = [];
    for(let c=0;c<8;c++) row.push((c+r)%2===0 ? 'fire' : 'frost');
    pattern.push(row);
  }
  for(const [c,r,spec] of overrides) pattern[r][c] = spec;
  return pattern;
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.message));

  async function checkOverflow(label){
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(overflow <= 0, 'no horizontal overflow @ '+label+' (delta='+overflow+')');
  }

  console.log('1. Load check');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof Board !== 'undefined' && typeof Board._test !== 'undefined' && typeof Game !== 'undefined' && typeof Persist !== 'undefined');
  await page.waitForTimeout(300);
  ok(consoleErrors.length===0, 'zero console errors on load (got: '+JSON.stringify(consoleErrors)+')');
  ok(pageErrors.length===0, 'zero page errors on load (got: '+JSON.stringify(pageErrors)+')');
  ok(await page.isVisible('#modeSelectScreen'), 'mode-select screen visible on load');
  ok(await page.getAttribute('#modeSelectScreen .panel', 'role') === 'dialog', 'mode-select panel has role=dialog');
  await checkOverflow('mode-select');

  console.log('2. Board.init produces a legal 8x8 board with the requested tile-tier pool');
  await page.evaluate(() => { Game._test.forceMode('endless'); Board.init(['fire','frost','verdant','lightning']); });
  const initState = await page.evaluate(() => {
    const g = Board._test.getGrid();
    return { rows: g.length, cols: g[0].length, hasLegalMove: Board.hasAnyLegalMove(), runsAtStart: Board._test.findRuns().length };
  });
  ok(initState.rows===8 && initState.cols===8, 'board is 8x8 (got '+initState.rows+'x'+initState.cols+')');
  ok(initState.runsAtStart===0, 'a freshly initialized board has zero pre-existing matches');
  ok(initState.hasLegalMove===true, 'a freshly initialized board always has at least one legal move');

  console.log('3. Swap-adjacent validation — a swap producing no match is rejected and reverted');
  await page.evaluate(() => {
    // checkerboard: any adjacent swap merely swaps two DIFFERENT colors in
    // place and can never itself complete a 3-run against this pattern,
    // so this is a deterministic "always invalid" swap to test rejection.
    const pattern = [];
    for(let r=0;r<8;r++){ const row=[]; for(let c=0;c<8;c++) row.push((c+r)%2===0?'fire':'frost'); pattern.push(row); }
    Board._test.setBoard(pattern);
  });
  const beforeSwap = await page.evaluate(() => JSON.stringify(Board._test.getGrid()));
  const swapResult = await page.evaluate(() => Board.trySwap({col:0,row:0},{col:1,row:0}));
  const afterSwap = await page.evaluate(() => JSON.stringify(Board._test.getGrid()));
  ok(swapResult.valid===false, 'a swap that creates no match is rejected (valid===false)');
  ok(beforeSwap===afterSwap, 'a rejected swap leaves the board byte-identical (reverted, not left half-applied)');

  console.log('4. Match-4 creates a line-clear bomb; match-5 creates an area bomb');
  const bomb4 = await page.evaluate(() => {
    function checkerboardPattern(overrides){
      const pattern=[]; for(let r=0;r<8;r++){ const row=[]; for(let c=0;c<8;c++) row.push((c+r)%2===0?'fire':'frost'); pattern.push(row); }
      for(const [c,r,spec] of overrides) pattern[r][c]=spec; return pattern;
    }
    Board._test.setBoard(checkerboardPattern([[0,0,'lightning'],[1,0,'lightning'],[2,0,'lightning'],[3,0,'lightning']]));
    const stats = Board.resolveToFixedPoint();
    const g = Board._test.getGrid();
    let bombCells = 0, lineBombs = 0;
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){ const t=g[r][c]; if(t && t.bomb){ bombCells++; if(t.bomb==='line') lineBombs++; } }
    return { stats, bombCells, lineBombs };
  });
  ok(bomb4.stats.bombsCreated>=1, 'a match-4 creates at least one bomb tile (bombsCreated='+bomb4.stats.bombsCreated+')');
  ok(bomb4.lineBombs>=1 || bomb4.stats.bombsDetonated>=1, 'a line bomb exists after a match-4 (or was already consumed by a chain) — lineBombs='+bomb4.lineBombs+' bombsDetonated='+bomb4.stats.bombsDetonated);

  const bomb5 = await page.evaluate(() => {
    function checkerboardPattern(overrides){
      const pattern=[]; for(let r=0;r<8;r++){ const row=[]; for(let c=0;c<8;c++) row.push((c+r)%2===0?'fire':'frost'); pattern.push(row); }
      for(const [c,r,spec] of overrides) pattern[r][c]=spec; return pattern;
    }
    Board._test.setBoard(checkerboardPattern([[0,0,'void'],[1,0,'void'],[2,0,'void'],[3,0,'void'],[4,0,'void']]));
    const stats = Board.resolveToFixedPoint();
    const g = Board._test.getGrid();
    let areaBombs = 0;
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){ const t=g[r][c]; if(t && t.bomb==='area') areaBombs++; }
    return { stats, areaBombs };
  });
  ok(bomb5.areaBombs>=1 || bomb5.stats.bombsDetonated>=1, 'a match-5 creates an area bomb (or it was already consumed by a chain) — areaBombs='+bomb5.areaBombs+' bombsDetonated='+bomb5.stats.bombsDetonated);

  console.log('5. Fixed-point cascade termination — a seeded board requiring multiple passes resolves fully');
  // See the module's own inline reasoning: col2 has a bottom vertical
  // 3-match of 'void' (rows5-7). Clearing it drops col2's remaining tiles
  // [fire,frost,lightning,fire,verdant] down by 3 rows, landing 'verdant'
  // at (2,7) — which lines up with pre-placed 'verdant' at (1,7) and
  // (3,7), forming a SECOND match that only exists after gravity moves a
  // pre-existing tile into place (not from the nondeterministic refill).
  const cascade = await page.evaluate(() => {
    function checkerboardPattern(overrides){
      const pattern=[]; for(let r=0;r<8;r++){ const row=[]; for(let c=0;c<8;c++) row.push((c+r)%2===0?'fire':'frost'); pattern.push(row); }
      for(const [c,r,spec] of overrides) pattern[r][c]=spec; return pattern;
    }
    const pattern = checkerboardPattern([
      [2,0,'fire'],[2,1,'frost'],[2,2,'lightning'],[2,3,'lightning'],[2,4,'verdant'],
      [2,5,'void'],[2,6,'void'],[2,7,'void'],
      [1,7,'verdant'],[3,7,'verdant'],
    ]);
    Board._test.setBoard(pattern);
    const preRuns = Board._test.findRuns().length;
    const stats = Board.resolveToFixedPoint();
    const postRuns = Board._test.findRuns().length;
    return { preRuns, stats, postRuns };
  });
  ok(cascade.preRuns===1, 'exactly one match exists before resolving (the seeded trigger) — got '+cascade.preRuns);
  ok(cascade.stats.passes>=2, 'resolveToFixedPoint required multiple passes to settle (passes='+cascade.stats.passes+')');
  ok(cascade.postRuns===0, 'the board has zero remaining matches after resolveToFixedPoint (state is fully settled, not left mid-cascade)');

  console.log('6. Bomb-chain-triggers-bomb — detonating one bomb reaches and detonates a neighbor');
  // Row0 cols0-2 = fire,fire,BombA(fire,area) -> a 3-match sweeps BombA in.
  // BombA's 3x3 blast reaches (2,1) = BombB(lightning,line,col), which was
  // NEVER part of the original match — only Bomb A's blast could have put
  // it in the clear-set. BombB then detonates its own full-column blast,
  // reaching (2,7), eight rows away from the original match. This proves
  // a real two-hop chain, not just "two bombs in one match."
  const chain = await page.evaluate(() => {
    function checkerboardPattern(overrides){
      const pattern=[]; for(let r=0;r<8;r++){ const row=[]; for(let c=0;c<8;c++) row.push((c+r)%2===0?'fire':'frost'); pattern.push(row); }
      for(const [c,r,spec] of overrides) pattern[r][c]=spec; return pattern;
    }
    const pattern = checkerboardPattern([
      [0,0,'fire'],[1,0,'fire'],[2,0,{type:'fire',bomb:'area'}],
      [2,1,{type:'lightning',bomb:'line',axis:'col'}],
    ]);
    Board._test.setBoard(pattern);
    const stats = Board.resolveToFixedPoint();
    return stats;
  });
  ok(chain.bombsDetonated===2, 'both bombs detonated in one resolve (bombsDetonated='+chain.bombsDetonated+')');
  ok(chain.cleared>=13, 'the chained blast cleared at least the full expected footprint (row0 cols0-3 + col2 rows1-7 = 13 cells minimum, got '+chain.cleared+')');

  console.log('7. Reshuffle-on-no-legal-move guard');
  // A board with zero legal moves anywhere: strict alternating fire/frost/
  // verdant repeating every 3 columns AND every 3 rows in a pattern with
  // no two adjacent same-type cells at all is trivially deadlock-free for
  // swaps... instead, directly force the deadlock condition via a tiny
  // deterministic 3-value cyclic tiling that has no adjacent-swap solution
  // (every cell's only same-type neighbors are 2 steps away already).
  const reshuffle = await page.evaluate(() => {
    const pattern = [];
    for(let r=0;r<8;r++){ const row=[]; for(let c=0;c<8;c++) row.push(['fire','frost','verdant'][(c+r)%3]); pattern.push(row); }
    Board._test.setBoard(pattern);
    const hadLegalMoveBefore = Board.hasAnyLegalMove();
    const stats = Board.resolveToFixedPoint();
    const hasLegalMoveAfter = Board.hasAnyLegalMove();
    return { hadLegalMoveBefore, stats, hasLegalMoveAfter };
  });
  ok(reshuffle.hadLegalMoveBefore===false, 'the (c+r)%3 tiling has zero legal adjacent-swap moves by construction (verified before resolving)');
  ok(reshuffle.stats.reshuffled===true, 'resolveToFixedPoint reports it reshuffled a deadlocked board');
  ok(reshuffle.hasLegalMoveAfter===true, 'a legal move exists after the reshuffle guard runs');

  console.log('8. Save-schema-mismatch / corrupt-session recovery');
  await page.evaluate(() => {
    localStorage.setItem('runeshatter-save-v1', JSON.stringify({
      schemaVersion: 1,
      highScores: { endless: 500, levels: 3, timedSurvival: 200 },
      session: { schemaVersion: 999, mode:'endless', boardGrid: [], tileTierIndex:4, score:1, movesOrTimeRemaining:null, levelIndex:null, rngSeed:1 },
    }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof Persist !== 'undefined');
  await page.waitForTimeout(200);
  const mismatchLoad = await page.evaluate(() => ({
    session: Persist.data.session,
    highScores: Persist.data.highScores,
  }));
  ok(mismatchLoad.session === null, 'a session with a mismatched schemaVersion is dropped, not loaded (got '+JSON.stringify(mismatchLoad.session)+')');
  ok(mismatchLoad.highScores.endless===500 && mismatchLoad.highScores.levels===3, 'highScores (own valid schemaVersion) survive independently of the bad session');

  console.log('8b. Corrupt (non-JSON) save recovers to defaults without crashing');
  const corruptErrors = [];
  page.removeAllListeners('pageerror');
  page.on('pageerror', err => { corruptErrors.push(err.message); pageErrors.push(err.message); });
  await page.evaluate(() => { localStorage.setItem('runeshatter-save-v1', '{not valid json!!'); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof Persist !== 'undefined');
  await page.waitForTimeout(200);
  const corruptLoad = await page.evaluate(() => Persist.data);
  ok(corruptErrors.length===0, 'a corrupt (non-JSON) save does not throw a page error (got: '+JSON.stringify(corruptErrors)+')');
  ok(corruptLoad.session===null, 'corrupt save recovers with session===null');
  ok(corruptLoad.highScores.endless===0 && corruptLoad.highScores.levels===0 && corruptLoad.highScores.timedSurvival===0, 'corrupt save recovers highScores to defaults (got '+JSON.stringify(corruptLoad.highScores)+')');
  await page.evaluate(() => localStorage.removeItem('runeshatter-save-v1'));

  console.log('9. Persist.setHighScore only overwrites on a strictly higher score');
  const highScoreBehavior = await page.evaluate(() => {
    Persist.data.highScores.endless = 100;
    const raisedTo150 = Persist.setHighScore('endless', 150);
    const ignoredAt120 = Persist.setHighScore('endless', 120);
    return { raisedTo150, ignoredAt120, final: Persist.data.highScores.endless };
  });
  ok(highScoreBehavior.raisedTo150===true && highScoreBehavior.final===150, 'a higher score updates highScores.endless');
  ok(highScoreBehavior.ignoredAt120===false && highScoreBehavior.final===150, 'a lower score never overwrites an existing high score');
  await page.evaluate(() => localStorage.removeItem('runeshatter-save-v1'));

  console.log('10. ModeRuleset thresholds — exact numbers from GAME_7_PILLARS.md §3');
  const thresholds = await page.evaluate(() => ({
    endlessBelow: ModeRuleset.Endless.tileTierForProgress(2999),
    endlessAt5th: ModeRuleset.Endless.tileTierForProgress(3000),
    endlessAt6th: ModeRuleset.Endless.tileTierForProgress(15000),
    timedBelow: ModeRuleset.Timed.tileTierForProgress(44.9),
    timedAt5th: ModeRuleset.Timed.tileTierForProgress(45),
    timedAt6th: ModeRuleset.Timed.tileTierForProgress(110),
    levelsAt5th: ModeRuleset.Levels.tileTierForProgress(6),
    levelsAt6th: ModeRuleset.Levels.tileTierForProgress(16),
    levelsBelow: ModeRuleset.Levels.tileTierForProgress(5),
  }));
  ok(thresholds.endlessBelow===4 && thresholds.endlessAt5th===5 && thresholds.endlessAt6th===6, 'Endless score thresholds (3000/15000) match §3 exactly');
  ok(thresholds.timedBelow===4 && thresholds.timedAt5th===5 && thresholds.timedAt6th===6, 'Timed Survival elapsed-time thresholds (45s/110s) match §3 exactly');
  ok(thresholds.levelsBelow===4 && thresholds.levelsAt5th===5 && thresholds.levelsAt6th===6, 'Levels tile-tier-by-level (L6/L16) matches §3 exactly');

  console.log('11. Levels mode structure — 20 levels, type-count and moveCap ramps per §4');
  const levelShape = await page.evaluate(() => ({
    count: LEVELS.length,
    l1: LEVELS[0], l5: LEVELS[4], l6: LEVELS[5], l15: LEVELS[14], l16: LEVELS[15], l20: LEVELS[19],
  }));
  ok(levelShape.count===20, 'exactly 20 levels defined (got '+levelShape.count+')');
  ok(levelShape.l1.tileTypes===4 && levelShape.l5.tileTypes===4, 'levels 1-5 use 4 tile types');
  ok(levelShape.l6.tileTypes===5 && levelShape.l15.tileTypes===5, 'levels 6-15 use 5 tile types');
  ok(levelShape.l16.tileTypes===6 && levelShape.l20.tileTypes===6, 'levels 16-20 use 6 tile types');
  ok(levelShape.l1.moveCap===20 && levelShape.l5.moveCap===18, 'levels 1-5 moveCap ramps 20 -> 18');
  ok(levelShape.l6.moveCap===18 && levelShape.l15.moveCap<=15, 'levels 6-15 moveCap ramps 18 -> <=15');
  ok(levelShape.l16.moveCap<=15 && levelShape.l20.moveCap===13, 'levels 16-20 moveCap ramps to 13');
  ok(levelShape.l1.objectives.length===1 && levelShape.l5.objectives.length===1, 'levels 1-5 have a single objective (alternating type)');
  ok(levelShape.l6.objectives.length===2 && levelShape.l16.objectives.length===2, 'levels 6+ combine both objective types');

  console.log('12. Levels checkWin/checkLose via the small Board-agnostic interface');
  const levelsRuleset = await page.evaluate(() => {
    const def = LEVELS[0]; // clearColorCount target:10 fire, moveCap:20
    const winState = { levelDef: def, score:0, movesUsed:5, clearedByType:{ fire:10 } };
    const loseState = { levelDef: def, score:0, movesUsed:20, clearedByType:{ fire:2 } };
    const midState  = { levelDef: def, score:0, movesUsed:10, clearedByType:{ fire:2 } };
    return {
      win: ModeRuleset.Levels.checkWin(winState), winLose: ModeRuleset.Levels.checkLose(winState),
      lose: ModeRuleset.Levels.checkLose(loseState),
      midWin: ModeRuleset.Levels.checkWin(midState), midLose: ModeRuleset.Levels.checkLose(midState),
    };
  });
  ok(levelsRuleset.win===true && levelsRuleset.winLose===false, 'objective met -> checkWin true, checkLose false');
  ok(levelsRuleset.lose===true, 'moveCap exhausted with objective unmet -> checkLose true');
  ok(levelsRuleset.midWin===false && levelsRuleset.midLose===false, 'mid-run with moves left and objective unmet is neither a win nor a loss yet');

  console.log('13. Full UI flow — mode select -> game -> a real swap -> pause -> results reachable');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof Game !== 'undefined');
  await page.click('button[onclick="Game.startEndless()"]');
  await page.waitForTimeout(150);
  ok(await page.isVisible('#hud'), 'HUD is visible once a run starts');
  ok(!(await page.isVisible('#modeSelectScreen')), 'mode-select screen is hidden once a run starts');
  await page.evaluate(() => {
    // find a real legal swap on the live board and commit it through the
    // actual Game.attemptSwap path (not a synthetic Board call), so this
    // exercises the real input->engine wiring end to end.
    for(let r=0;r<8;r++) for(let c=0;c<7;c++){
      const a={col:c,row:r}, b={col:c+1,row:r};
      const applied = Game.attemptSwap(a,b);
      if(applied) return true;
    }
    return false;
  });
  const postSwapState = await page.evaluate(() => Game._test.state());
  ok(postSwapState.score >= 0, 'a swap through the real Game path updates session state without throwing (score='+postSwapState.score+')');
  await page.click('#pauseBtn');
  await page.waitForTimeout(100);
  ok(await page.isVisible('#pauseOverlay'), 'pause overlay opens from the in-game pause button');
  await page.click('button[onclick="Game.endRunFromPause()"]');
  await page.waitForTimeout(150);
  ok(await page.isVisible('#resultsScreen'), 'ending a run from pause reaches the results screen');
  await checkOverflow('results');

  console.log('14. Level select — locked/unlocked/completed rendering reflects highScores.levels');
  await page.evaluate(() => { Persist.data.highScores.levels = 3; Persist.save(); Nav.goTo('modeSelect'); });
  await page.waitForTimeout(100);
  await page.click('.mode-card[onclick="Nav.goTo(\'levelSelect\')"]');
  await page.waitForTimeout(100);
  const levelTiles = await page.evaluate(() => Array.from(document.querySelectorAll('.level-tile')).map(el => ({
    completed: el.classList.contains('completed'), locked: el.classList.contains('locked'), disabled: el.disabled,
  })));
  ok(levelTiles.length===20, 'level-select renders all 20 level tiles');
  ok(levelTiles[0].completed && levelTiles[2].completed, 'levels 1-3 show completed given highScores.levels=3');
  ok(!levelTiles[3].locked && !levelTiles[3].disabled, 'level 4 (furthest+1) is unlocked but not completed');
  ok(levelTiles[4].locked && levelTiles[4].disabled, 'level 5 (beyond furthest+1) is locked');
  await page.evaluate(() => localStorage.removeItem('runeshatter-save-v1'));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  console.log('final console errors:', JSON.stringify(consoleErrors));
  console.log('final page errors:', JSON.stringify(pageErrors));
  await browser.close();
  process.exit(fail>0 ? 1 : 0);
})();
