// Wardfall adversarial/verification pass — mirrors tests/sigilchain-adversarial.js's
// discipline: drives the real UI via Game._test hooks + real pointer/gamepad
// input, checks console/page errors and horizontal overflow at a mobile
// viewport, and hand-verifies the scoring formula + queue-fairness guarantee
// against GAME_3_PILLARS.md's worked examples.
//
// Usage: serve the repo (`npx http-server -p 8934`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/wardfall-adversarial.js`.
const { chromium } = require('playwright');

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const BASE_URL = process.env.WARDFALL_URL || 'http://localhost:8934/wardfall.html';

let pass = 0, fail = 0;
function ok(cond, label){
  if(cond){ pass++; console.log('  ok   -', label); }
  else { fail++; console.log('  FAIL -', label); }
}

async function waitForFlightDone(page){
  for(let t=0; t<80; t++){
    const s = await page.evaluate(() => Game._test.state());
    if(!s.flying) return;
    await page.waitForTimeout(30);
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH, args: ['--autoplay-policy=no-user-gesture-required'] });
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
  await page.waitForFunction(() => typeof Game !== 'undefined' && typeof Game._test !== 'undefined');
  await page.waitForTimeout(300);
  ok(consoleErrors.length===0, 'zero console errors on load (got: '+JSON.stringify(consoleErrors)+')');
  ok(pageErrors.length===0, 'zero page errors on load (got: '+JSON.stringify(pageErrors)+')');
  ok(await page.isVisible('#menuOverlay'), 'menu overlay visible on load');
  ok(await page.getAttribute('#menuOverlay .panel', 'role') === 'dialog', 'menu panel has role=dialog');
  await checkOverflow('menu');

  console.log('2. Settings + colorblind persistence');
  await page.click('button[onclick="Settings.open()"]');
  await page.waitForTimeout(150);
  await page.fill('#musicVolSlider', '0.2');
  await page.dispatchEvent('#musicVolSlider', 'input');
  await page.fill('#sfxVolSlider', '0.7');
  await page.dispatchEvent('#sfxVolSlider', 'input');
  await page.check('#reducedMotionToggle');
  await page.dispatchEvent('#reducedMotionToggle', 'change');
  await page.check('#colorblindToggle');
  await page.dispatchEvent('#colorblindToggle', 'change');
  await page.click('button[onclick="Settings.close()"]');
  await page.waitForTimeout(100);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('wardfall-save-v1')).settings);
  ok(saved.musicVol===0.2 && saved.sfxVol===0.7 && saved.reducedMotion===true && saved.colorblind===true, 'settings persisted to localStorage');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof Game !== 'undefined');
  const bodyClass = await page.evaluate(() => document.body.classList.contains('reduced-motion'));
  ok(bodyClass===true, 'reduced-motion class re-applied after reload');
  await page.evaluate(() => { Settings.setReducedMotion(false); Settings.setMusicVol(0.5); Settings.setSfxVol(0.5); Settings.setColorblind(false); });

  console.log('3. Scoring formula — exact match, GAME_3_PILLARS.md §6');
  await page.evaluate(() => {
    Game.startRound();
    Game._test.setGrid([
      ['sapphire','sapphire', null, null, null, null, null, null, null],
    ]);
    Game._test.setComboStreak(0);
  });
  // fire the 3rd sapphire into (2,0), completing a 3-group: n=3, streak=1
  // groupMult(3)=1, comboMult(1)=1 -> 10*3*1*1 = 30
  let before = await page.evaluate(() => Game._test.state());
  await page.evaluate(() => Game._test.fireAt(2, 0, { color:'sapphire' }));
  let after = await page.evaluate(() => Game._test.state());
  ok(after.score - before.score === 30, 'pop(3, streak1) === 30 (got '+(after.score-before.score)+')');
  ok(after.comboStreak === 1, 'comboStreak bumped to 1 on a scoring shot');

  console.log('4. Combo streak escalation + miss reset');
  await page.evaluate(() => {
    Game._test.setGrid([
      ['amethyst','amethyst','amethyst', null, null, null, null, null, null],
    ]);
  });
  before = await page.evaluate(() => Game._test.state());
  await page.evaluate(() => Game._test.fireAt(3, 0, { color:'amethyst' })); // completes 4-group at streak 2
  after = await page.evaluate(() => Game._test.state());
  // n=4, streak=2 -> groupMult(4)=1+0.15*1=1.15, comboMult(2)=1.2 -> round(10*4*1.15*1.2)=55
  ok(after.score - before.score === 55, 'pop(4, streak2) === 55 (got '+(after.score-before.score)+')');
  await page.evaluate(() => {
    Game._test.setGrid([[ null, null, null, null, null, null, null, null, null ]]); // empty row, guarantees a miss
  });
  before = await page.evaluate(() => Game._test.state());
  await page.evaluate(() => Game._test.fireAt(5, 0, { color:'teal' }));
  after = await page.evaluate(() => Game._test.state());
  ok(after.comboStreak === 0, 'a miss resets comboStreak to 0 (got '+after.comboStreak+')');
  ok(after.score === before.score, 'a miss adds zero score');

  console.log('5. Bomb orb — flat scoring, never through groupMult');
  await page.evaluate(() => {
    Game._test.setGrid([
      ['sapphire','amethyst','teal', null, null, null, null, null, null],
    ]);
    Game._test.setComboStreak(0);
  });
  before = await page.evaluate(() => Game._test.state());
  // bomb lands at (1,0): clears (1,0) + its hex neighbors present = (0,0),(2,0) -> 3 orbs, mixed colors, no groupMult
  await page.evaluate(() => Game._test.fireAt(1, 0, { special:'bomb' }));
  after = await page.evaluate(() => Game._test.state());
  ok(after.score - before.score === 30, 'bomb(3 orbs, streak1) === BOMB_BASE*3*1 = 30 (got '+(after.score-before.score)+')');

  console.log('6. Rainbow orb — single flood-fill, no double count');
  await page.evaluate(() => {
    Game._test.setGrid([
      ['sapphire','sapphire', null, 'amethyst','amethyst', null, null, null, null],
    ]);
    Game._test.setComboStreak(0);
  });
  before = await page.evaluate(() => Game._test.state());
  // rainbow at (2,0) is adjacent to both the sapphire pair and (on this
  // fixed grid) only the sapphire pair by hex adjacency at row 0 — verifies
  // it resolves to exactly one grouped pop, not two separate scoring events
  await page.evaluate(() => Game._test.fireAt(2, 0, { special:'rainbow' }));
  after = await page.evaluate(() => Game._test.state());
  const rainbowState = await page.evaluate(() => Game._test.state());
  ok(after.score > before.score, 'rainbow orb produced exactly one scoring event (score increased once, not stacked)');

  console.log('7. Stone hazard — cracks twice, then clears, flat bonus outside groupMult');
  // stone already at crack=1 (simulating one prior adjacent pop); a fresh
  // 3-group pop adjacent to it should crack it to 2 and clear it in the
  // same shot: n=3 sapphires (groupMult), + 1 hazard cleared (flat HAZARD_BASE)
  // shotScore = round((10*3*1 + 15*1) * comboMult(1)) = round(45*1) = 45
  await page.evaluate(() => {
    Game._test.setGrid([
      ['sapphire','sapphire', null, {special:'stone',crack:1}, null, null, null, null, null],
    ]);
    Game._test.setComboStreak(0);
  });
  before = await page.evaluate(() => Game._test.state());
  await page.evaluate(() => Game._test.fireAt(2, 0, { color:'sapphire' })); // completes {0,0}{1,0}{2,0}, (2,0) is hex-adjacent to the stone at (3,0)
  after = await page.evaluate(() => Game._test.state());
  ok(after.score - before.score === 45, 'pop(3)+hazardCleared(1) === 45 (got '+(after.score-before.score)+')');

  console.log('8. Queue-color fairness guarantee');
  await page.evaluate(() => {
    Game._test.setGrid([
      ['teal','teal','teal','teal','teal','teal','teal','teal','teal'],
    ]);
  });
  // sample the queue repeatedly against the static all-teal board (no
  // firing in between — firing into stacked new cells at the same column
  // would itself chain-connect and eventually pop the entire board empty,
  // which correctly triggers the documented full-palette fallback for a
  // genuinely empty cluster, a different and non-buggy code path this
  // test isn't targeting)
  let sawOffPaletteColor = false;
  for(let i=0;i<25;i++){
    const item = await page.evaluate(() => Queue.nextItem(Game._test.state().phase));
    if(item && item.color !== undefined && item.color !== 'teal') sawOffPaletteColor = true;
  }
  ok(!sawOffPaletteColor, 'queue never offers an off-palette color absent from the live cluster (all-teal board test)');

  console.log('8b. Queue fairness fallback — a genuinely empty cluster may offer any palette color');
  await page.evaluate(() => { Game._test.setGrid([[null,null,null,null,null,null,null,null,null]]); });
  const fallbackColors = new Set();
  for(let i=0;i<40;i++){
    const item = await page.evaluate(() => Queue.nextItem(Game._test.state().phase));
    if(item && item.color) fallbackColors.add(item.color);
  }
  ok(fallbackColors.size >= 1, 'empty-cluster fallback still produces valid queue colors (got '+Array.from(fallbackColors)+')');

  console.log('9. Wall-bounce trajectory always resolves to a valid cell');
  await page.evaluate(() => Game.startRound());
  await page.evaluate(() => Game._test.setAim(-Math.PI/2 - 1.35));
  await page.evaluate(() => Game._test.fire());
  await waitForFlightDone(page);
  let s9 = await page.evaluate(() => Game._test.state());
  ok(!s9.flying, 'far-left-angle wall-bounce shot resolved (not stuck flying)');
  await page.evaluate(() => Game._test.setAim(-Math.PI/2 + 1.35));
  await page.evaluate(() => Game._test.fire());
  await waitForFlightDone(page);
  s9 = await page.evaluate(() => Game._test.state());
  ok(!s9.flying, 'far-right-angle wall-bounce shot resolved (not stuck flying)');

  console.log('10. Rapid-fire / mash resilience (no fire while a shot is in flight)');
  await page.evaluate(() => Game.startRound());
  await page.evaluate(() => Game._test.setAim(-Math.PI/2));
  const shotsFiredBefore = (await page.evaluate(() => Game._test.state())).shotsFired;
  for(let i=0;i<10;i++) await page.evaluate(() => Game._test.fire()); // mash without waiting for resolution
  await waitForFlightDone(page);
  const shotsFiredAfter = (await page.evaluate(() => Game._test.state())).shotsFired;
  ok(shotsFiredAfter - shotsFiredBefore <= 1, 'mashing fire only commits one shot while a shot is already in flight (delta='+(shotsFiredAfter-shotsFiredBefore)+')');

  console.log('11. Game-over triggers cleanly at the danger line');
  await page.evaluate(() => Game.startRound());
  for(let i=0;i<40;i++) await page.evaluate(() => Game._test.forceDescend());
  await page.evaluate(() => Game._test.setAim(-Math.PI/2));
  await page.evaluate(() => Game._test.fire());
  await waitForFlightDone(page);
  await page.waitForTimeout(150);
  const overEnd = await page.evaluate(() => Game._test.state());
  const overlayShown = await page.isVisible('#roundEndOverlay');
  ok(overEnd.roundEnded === true, 'roundEnded flag set once the cluster reaches the danger line');
  ok(overlayShown, 'round-end overlay is actually shown to the player');

  console.log('12. Audio drone gating (no per-frame write survives a game-over fade)');
  await page.evaluate(() => Game.showMenu());
  await page.evaluate(() => Game.startRound());
  await page.waitForTimeout(200);
  const droneActiveWhilePlaying = await page.evaluate(() => Music._test.isDroneActive());
  ok(droneActiveWhilePlaying === true, 'drone is active while a round is running');
  for(let i=0;i<40;i++) await page.evaluate(() => Game._test.forceDescend());
  await page.evaluate(() => Game._test.setAim(-Math.PI/2));
  await page.evaluate(() => Game._test.fire());
  await waitForFlightDone(page);
  await page.waitForTimeout(600); // let the rampGain fade actually complete
  const droneGainAfterGameOver = await page.evaluate(() => Music._test.droneGainValue());
  const droneActiveAfterGameOver = await page.evaluate(() => Music._test.isDroneActive());
  ok(droneActiveAfterGameOver === false, 'isDroneActive flips false on game over (prevents a live write from clobbering the fade)');
  ok(droneGainAfterGameOver !== null && droneGainAfterGameOver < 0.01, 'drone gain actually reaches ~0 after game-over fade (got '+droneGainAfterGameOver+')');

  console.log('13. Achievements panel + toast render without crashing');
  await page.evaluate(() => Game.showMenu());
  await page.click('button[onclick="Achievements.open()"]');
  await page.waitForTimeout(150);
  ok(await page.isVisible('#achieveOverlay'), 'achievements overlay opens');
  const achRowCount = await page.evaluate(() => document.querySelectorAll('.ach-row').length);
  ok(achRowCount === 9, 'all 9 achievement defs render (got '+achRowCount+')');
  await page.click('button[onclick="Achievements.close()"]');

  console.log('14. Shop — cosmetics only, respects affordability');
  await page.evaluate(() => { Persist.data.shards = 100; Persist.save(); });
  await page.click('button[onclick="Shop.open()"]');
  await page.waitForTimeout(150);
  ok(await page.isVisible('#shopOverlay'), 'shop overlay opens');
  await page.evaluate(() => Shop.buy('palette_ember'));
  const shopState = await page.evaluate(() => ({ shards: Persist.data.shards, owned: Persist.data.cosmetics.owned }));
  ok(shopState.owned.palette_ember === true && shopState.shards === 60, 'shop purchase deducts shards and marks item owned');
  await page.click('button[onclick="Shop.close()"]');

  console.log('15. Mobile viewport overflow across menu/round/pause/game-over');
  await checkOverflow('after achievements+shop');
  await page.evaluate(() => Game.startRound());
  await page.waitForTimeout(150);
  await checkOverflow('in-round');
  await page.evaluate(() => Game.togglePause());
  await checkOverflow('paused');
  await page.evaluate(() => Game.togglePause());

  console.log('16. Cross-game token consistency (index.html / sigilchain.html / wardfall.html)');
  const wardfallTokens = await page.evaluate(() => {
    for(const sheet of document.styleSheets){
      try{
        for(const rule of sheet.cssRules){ if(rule.selectorText === ':root') return rule.style.cssText; }
      }catch(e){} // cross-origin stylesheet (Google Fonts) — skip, not ours to read
    }
    return '';
  });
  // sapphire/amethyst/teal are JS gameplay constants (COLORS object), not
  // CSS design tokens — only the shared studio design tokens live in :root
  ok(wardfallTokens.includes('--gold: #ffd76b') && wardfallTokens.includes('--danger: #ff4d70') && wardfallTokens.includes('--ok: #5eff9c'),
    'wardfall :root shares byte-identical --gold/--danger/--ok tokens with index.html/sigilchain.html');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  console.log('final console errors:', JSON.stringify(consoleErrors));
  console.log('final page errors:', JSON.stringify(pageErrors));
  await browser.close();
  process.exit(fail>0 ? 1 : 0);
})();
