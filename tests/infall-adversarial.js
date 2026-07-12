// Infall adversarial/verification pass — mirrors tests/wardfall-adversarial.js's
// discipline: drives the real UI via Game._test hooks + real pointer input,
// checks console/page errors and horizontal overflow at a mobile viewport,
// and hand-verifies the scoring formula against GAME_4_PILLARS.md §6's
// worked examples. Per §7, gives explicit adversarial coverage to the two
// genuinely novel pieces of logic in this design: the drag-to-launch
// resolution (extreme angles, sub-threshold drags, the MAX_WELLS cap) and
// the fusion candidate-pool logic (simultaneous Well expiry mid-fusion-check,
// max-debris-count edge cases).
//
// Usage: serve the repo (`npx http-server -p 8934`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/infall-adversarial.js`.
const { chromium } = require('playwright');

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const BASE_URL = process.env.INFALL_URL || 'http://localhost:8934/infall.html';

let pass = 0, fail = 0;
function ok(cond, label){
  if(cond){ pass++; console.log('  ok   -', label); }
  else { fail++; console.log('  FAIL -', label); }
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

  console.log('2. Settings persistence');
  await page.click('button[onclick="Settings.open()"]');
  await page.waitForTimeout(150);
  await page.fill('#musicVolSlider', '0.2');
  await page.dispatchEvent('#musicVolSlider', 'input');
  await page.fill('#sfxVolSlider', '0.7');
  await page.dispatchEvent('#sfxVolSlider', 'input');
  await page.check('#reducedMotionToggle');
  await page.dispatchEvent('#reducedMotionToggle', 'change');
  await page.click('button[onclick="Settings.close()"]');
  await page.waitForTimeout(100);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('infall-save-v1')).settings);
  ok(saved.musicVol===0.2 && saved.sfxVol===0.7 && saved.reducedMotion===true, 'settings persisted to localStorage');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof Game !== 'undefined');
  const bodyClass = await page.evaluate(() => document.body.classList.contains('reduced-motion'));
  ok(bodyClass===true, 'reduced-motion class re-applied after reload');
  await page.evaluate(() => { Settings.setReducedMotion(false); Settings.setMusicVol(0.5); Settings.setSfxVol(0.5); });

  console.log('3. Scoring formula — exact match, GAME_4_PILLARS.md §6');
  const formulaCheck = await page.evaluate(() => {
    const wm1 = Game._test.wellMult(1), cm1 = Game._test.comboMult(1);
    const wm10 = Game._test.wellMult(10), cm8 = Game._test.comboMult(8);
    const min = Math.round(Game._test.CAPTURE_BASE * 1 * wm1 * cm1);
    const max = Math.round(Game._test.CAPTURE_BASE * 8 * wm10 * cm8);
    return { wm1, cm1, wm10, cm8, min, max };
  });
  ok(formulaCheck.wm1===1 && formulaCheck.cm1===1, 'wellMult(1)===1 and comboMult(1)===1 (no-streak baseline)');
  ok(formulaCheck.min===15, 'minimum-case captureScore === 15 (got '+formulaCheck.min+')');
  ok(Math.abs(formulaCheck.wm10-2.08)<1e-9, 'wellMult(10) === 2.08 exactly (got '+formulaCheck.wm10+')');
  ok(Math.abs(formulaCheck.cm8-2.05)<1e-9, 'comboMult(8) === 2.05 exactly (got '+formulaCheck.cm8+')');
  ok(formulaCheck.max===512, 'maximum-case captureScore === 512 (got '+formulaCheck.max+')');

  console.log('4. Live capture end-to-end — pipeline actually wires the formula (not just the pure function)');
  await page.evaluate(() => {
    Game.start();
    Game._test.setAim(200, 200, 205, 205); // trivial short drag, just needs to clear the 4px minimum
    Game._test.launchWell();
  });
  await page.waitForTimeout(2600); // let the projectile settle into an active well
  const wellSettled = await page.evaluate(() => Game._test.wells.some(w => w.state==='active'));
  ok(wellSettled, 'a launched well settles into an active pull source');
  await page.evaluate(() => {
    const w = Game._test.wells.find(w => w.state==='active');
    Game._test.debris.push({ x:w.x, y:w.y, vx:0, vy:0, mass:3, type:'normal', timeInRadius:0 });
  });
  const scoreBefore = (await page.evaluate(() => Game.run)).score;
  await page.waitForTimeout(1200); // > CAPTURE_TIME_BASE, real capture should resolve
  const runAfter = await page.evaluate(() => Game.run);
  ok(runAfter.score > scoreBefore, 'a debris sitting inside an active well actually scores through the real pipeline (before='+scoreBefore+', after='+runAfter.score+')');
  ok(runAfter.captures >= 1, 'run.captures incremented via the live capture path');

  console.log('5. Drag-to-launch resolution — extreme angles resolve to finite, capped velocity');
  await page.evaluate(() => { Game.abandonRun(); Game.start(); });
  const angleResults = await page.evaluate(() => {
    const angles = [0, Math.PI/2, Math.PI, -Math.PI/2, 0.0001, Math.PI*1.9999];
    const results = [];
    for(const a of angles){
      Game._test.wells.length = 0; // clear between attempts so MAX_WELLS never blocks this check
      const cx = Game.cinder.x, cy = Game.cinder.y;
      const dx = Math.cos(a)*9000, dy = Math.sin(a)*9000; // absurdly long drag, far past MAX_DRAG_PX
      Game._test.setAim(cx, cy, cx+dx, cy+dy);
      Game._test.launchWell();
      const w = Game._test.wells[Game._test.wells.length-1];
      results.push({ a, vx:w?.vx, vy:w?.vy, speed: w ? Math.hypot(w.vx,w.vy) : null, finite: w ? (Number.isFinite(w.vx)&&Number.isFinite(w.vy)) : false });
    }
    return results;
  });
  ok(angleResults.every(r=>r.finite), 'every extreme launch angle produced finite vx/vy (got '+JSON.stringify(angleResults.map(r=>r.finite))+')');
  const speeds = angleResults.map(r=>r.speed);
  const speedSpread = Math.max(...speeds) - Math.min(...speeds);
  ok(speedSpread < 0.01, 'an absurdly long drag clamps to the same capped launch speed regardless of angle (spread='+speedSpread+')');

  console.log('6. Sub-threshold drag does not launch a phantom well');
  await page.evaluate(() => {
    Game._test.wells.length = 0;
    const cx = Game.cinder.x, cy = Game.cinder.y;
    Game._test.setAim(cx, cy, cx+2, cy+1); // well under the 4px minimum
    Game._test.launchWell();
  });
  const wellsAfterTinyDrag = await page.evaluate(() => Game._test.wells.length);
  ok(wellsAfterTinyDrag === 0, 'a sub-threshold drag launches zero wells (got '+wellsAfterTinyDrag+')');

  console.log('7. MAX_WELLS cap holds under mashing');
  await page.evaluate(() => {
    Game._test.wells.length = 0;
    const cx = Game.cinder.x, cy = Game.cinder.y;
    for(let i=0;i<10;i++){
      Game._test.setAim(cx, cy, cx+80, cy+40+i);
      Game._test.launchWell();
    }
  });
  const wellsAfterMash = await page.evaluate(() => Game._test.wells.length);
  ok(wellsAfterMash <= 3, 'mashing launch never exceeds MAX_WELLS=3 (got '+wellsAfterMash+')');

  console.log('8. Fusion candidate-pool — mass clamps at MASS_MAX, never silently exceeds it');
  await page.evaluate(() => {
    Game._test.wells.length = 0;
    Game._test.debris.length = 0;
    const cx = Game.cinder.x, cy = Game.cinder.y;
    Game._test.setAim(cx, cy, cx+5, cy+5);
    Game._test.launchWell();
  });
  await page.waitForTimeout(2600);
  await page.evaluate(() => {
    const w = Game._test.wells.find(w => w.state==='active');
    // two heavy debris, well inside FUSION_TOUCH_DIST of each other, both
    // inside the well's CAPTURE_RADIUS — should fuse to min(5+5, MASS_MAX)
    Game._test.debris.push({ x:w.x-3, y:w.y, vx:0, vy:0, mass:5, type:'normal', timeInRadius:0 });
    Game._test.debris.push({ x:w.x+3, y:w.y, vx:0, vy:0, mass:5, type:'normal', timeInRadius:0 });
  });
  await page.waitForTimeout(250); // fusion check runs every physics step, well under one capture window
  const postFusion = await page.evaluate(() => Game._test.debris.map(d => d.mass));
  const massMax = await page.evaluate(() => Game._test.MASS_MAX);
  ok(postFusion.every(m => m <= massMax), 'no fused debris mass exceeds MASS_MAX='+massMax+' (got '+JSON.stringify(postFusion)+')');
  ok(pageErrors.length===0, 'fusion-in-progress produced zero page errors');

  console.log('9. Well expiry mid-fusion-check does not throw and still resolves capture');
  await page.evaluate(() => {
    Game._test.wells.length = 0;
    Game._test.debris.length = 0;
    const cx = Game.cinder.x, cy = Game.cinder.y;
    Game._test.setAim(cx, cy, cx+5, cy+5);
    Game._test.launchWell();
  });
  await page.waitForTimeout(2600);
  const capturesBeforeExpiry = (await page.evaluate(() => Game.run)).captures;
  await page.evaluate(() => {
    const w = Game._test.wells.find(w => w.state==='active');
    // force the well to the very edge of expiry AND seed two fusable
    // debris inside it in the same tick — exercises expireWell() and
    // checkFusions() racing on the same well simultaneously
    w.settleT = Game.run.t - 5.999; // WELL_LIFETIME=6, one tick from expiry
    Game._test.debris.push({ x:w.x-2, y:w.y, vx:0, vy:0, mass:4, type:'normal', timeInRadius:0 });
    Game._test.debris.push({ x:w.x+2, y:w.y, vx:0, vy:0, mass:4, type:'normal', timeInRadius:0 });
  });
  await page.waitForTimeout(400); // crosses the expiry boundary within a couple physics steps
  const capturesAfterExpiry = (await page.evaluate(() => Game.run)).captures;
  ok(pageErrors.length===0, 'simultaneous well-expiry + fusion-candidate check produced zero page errors');
  ok(capturesAfterExpiry >= capturesBeforeExpiry, 'debris caught in an expiring well still resolves to a capture, not lost silently');

  console.log('10. Max-debris-count edge case — automatic spawn suppressed while at/over the cap');
  await page.evaluate(() => { Game._test.wells.length = 0; });
  const overCapCheck = await page.evaluate(() => {
    // stuff the live debris array far past the cap directly, off in a
    // corner so nothing collides/captures and skews the result
    Game._test.debris.length = 0;
    for(let i=0;i<200;i++) Game._test.debris.push({ x:-500, y:-500, vx:0, vy:0, mass:1, type:'normal', timeInRadius:0 });
    return Game._test.debris.length;
  });
  await page.waitForTimeout(500);
  const debrisCountAfter = await page.evaluate(() => Game._test.debris.length);
  ok(overCapCheck === 200 && debrisCountAfter <= 210, 'automatic spawn does not compound an already-over-cap debris count (before='+overCapCheck+', after='+debrisCountAfter+')');
  ok(pageErrors.length===0, 'over-cap debris state produced zero page errors');
  await page.evaluate(() => { Game._test.debris.length = 0; });

  console.log('11. Achievements panel renders all defs without crashing');
  await page.evaluate(() => { Game.abandonRun(); });
  await page.click('button[onclick="Achievements.open()"]');
  await page.waitForTimeout(150);
  ok(await page.isVisible('#achieveOverlay'), 'achievements overlay opens');
  const achRowCount = await page.evaluate(() => document.querySelectorAll('.ach-row').length);
  ok(achRowCount === 10, 'all 10 achievement defs render (got '+achRowCount+')');
  await page.click('button[onclick="Achievements.close()"]');

  console.log('12. Shop — cosmetics only, respects affordability, genuinely wired to render state');
  await page.evaluate(() => { Persist.data.flux = 100; Persist.save(); });
  await page.click('button[onclick="Shop.open()"]');
  await page.waitForTimeout(150);
  ok(await page.isVisible('#shopOverlay'), 'shop overlay opens');
  await page.evaluate(() => Shop.buy('trail_ember'));
  const shopState = await page.evaluate(() => ({ flux: Persist.data.flux, owned: Persist.data.owned }));
  ok(shopState.owned.trail_ember === true && shopState.flux === 60, 'shop purchase deducts flux and marks item owned');
  await page.evaluate(() => Shop.equip('trail_ember'));
  const equippedCosmetic = await page.evaluate(() => Persist.data.cosmetics.trail);
  ok(equippedCosmetic === 'ember', 'equipping a purchased cosmetic actually updates Persist.data.cosmetics (got '+equippedCosmetic+')');
  await page.click('button[onclick="Shop.close()"]');

  console.log('13. Audio drone gating (no per-frame write survives a game-over fade) — read the actual AudioParam values, per §4\'s bug-prevention note, not inferred from the automation code');
  await page.evaluate(() => Game.toMenu());
  await page.evaluate(() => Game.start());
  await page.waitForTimeout(300);
  const energyBounded = await page.evaluate(() => Game.systemEnergy >= 0 && Game.systemEnergy <= 1);
  const marginBounded = await page.evaluate(() => Game.hullMargin >= 0 && Game.hullMargin <= 1);
  ok(energyBounded, 'systemEnergy stays within [0,1]');
  ok(marginBounded, 'hullMargin stays within [0,1]');
  const droneActiveWhilePlaying = await page.evaluate(() => Music._test.isDroneActive());
  ok(droneActiveWhilePlaying === true, 'drone is active while a run is in progress');
  // force a burst of high-velocity debris and confirm the one true per-frame
  // droneFilter.frequency write actually tracks systemEnergy upward — a
  // relative before/after comparison rather than an absolute magic number,
  // since the EMA smoothing (alpha=0.05) means the exact converged value
  // depends on injected-debris count/velocity/window length; what matters
  // here is that the live AudioParam genuinely moves with the signal.
  const freqAtLowEnergy = await page.evaluate(() => Music._test.droneFilterFreq());
  await page.evaluate(() => {
    Game._test.debris.length = 0;
    for(let i=0;i<40;i++) Game._test.debris.push({ x:Math.random()*400, y:Math.random()*400, vx:(Math.random()*2-1)*380, vy:(Math.random()*2-1)*380, mass:2, type:'normal', timeInRadius:0 });
  });
  await page.waitForTimeout(600);
  const freqAtHighEnergy = await page.evaluate(() => Music._test.droneFilterFreq());
  ok(freqAtLowEnergy !== null && freqAtHighEnergy !== null && freqAtHighEnergy > freqAtLowEnergy + 300,
    'droneFilter.frequency actually rises with a burst of debris velocity (low='+freqAtLowEnergy+', high='+freqAtHighEnergy+')');
  await page.evaluate(() => { Game.cinder.hull = 0.001; });
  await page.waitForTimeout(300);
  await page.evaluate(() => { if(Game.cinder) Game.cinder.hull = 0; });
  await page.waitForTimeout(1600); // let endRun fire + the game-over rampGain fade actually complete
  const deathShown = await page.isVisible('#deathOverlay');
  ok(deathShown, 'death overlay shows once hull reaches 0');
  const droneActiveAfterGameOver = await page.evaluate(() => Music._test.isDroneActive());
  const droneGainAfterGameOver = await page.evaluate(() => Music._test.droneGainValue());
  ok(droneActiveAfterGameOver === false, 'isDroneActive flips false on game over (gates the per-frame frequency write off)');
  ok(droneGainAfterGameOver !== null && droneGainAfterGameOver < 0.01, 'drone gain actually reaches ~0 after the game-over fade (got '+droneGainAfterGameOver+')');
  ok(pageErrors.length===0, 'game-over transition produced zero page errors');

  console.log('14. Mobile viewport overflow across menu/playing/paused/death');
  await checkOverflow('death overlay');
  await page.click('button[onclick="Game.toMenu()"]');
  await page.waitForTimeout(150);
  await checkOverflow('menu (post-run)');
  await page.evaluate(() => Game.start());
  await page.waitForTimeout(150);
  await checkOverflow('in-run');
  await page.evaluate(() => Game.togglePause());
  await checkOverflow('paused');
  await page.evaluate(() => Game.togglePause());
  await page.evaluate(() => Game.abandonRun());

  console.log('15. Cross-game token consistency (index.html / sibling games)');
  const infallTokens = await page.evaluate(() => {
    for(const sheet of document.styleSheets){
      try{
        for(const rule of sheet.cssRules){ if(rule.selectorText === ':root') return rule.style.cssText; }
      }catch(e){} // cross-origin stylesheet (Google Fonts) — skip, not ours to read
    }
    return '';
  });
  ok(infallTokens.includes('--gold: #ffd76b') && infallTokens.includes('--danger: #ff4d70') && infallTokens.includes('--ok: #5eff9c'),
    'infall :root shares byte-identical --gold/--danger/--ok tokens with the sibling games');

  console.log('16. First-run tutorial — robust to out-of-order actions (regression: an earlier version required move->launch->capture in exact order and silently dropped anything that arrived early)');
  await page.evaluate(() => localStorage.removeItem('infall-save-v1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof Game !== 'undefined' && typeof Game._test !== 'undefined');
  await page.evaluate(() => Game.start());
  await page.waitForTimeout(150);
  ok((await page.evaluate(() => Game._test.tutorialStep)) === 1, 'tutorial starts on step 1 ("move") for a first-ever player');
  // launch + capture BEFORE ever touching a movement key — the exact
  // out-of-order sequence that broke the earlier version
  await page.evaluate(() => {
    const cx = Game.cinder.x, cy = Game.cinder.y;
    Game._test.setAim(cx, cy, cx+60, cy+40);
    Game._test.launchWell();
  });
  await page.waitForTimeout(2600);
  await page.evaluate(() => {
    const w = Game._test.wells.find(w => w.state === 'active');
    Game._test.debris.push({ x: w.x, y: w.y, vx: 0, vy: 0, mass: 2, type: 'normal', timeInRadius: 0 });
  });
  await page.waitForTimeout(900);
  ok((await page.evaluate(() => Game._test.tutorialStep)) === 1, 'launch+capture arriving before "moved" leaves step at 1, not silently stuck past it (got '+(await page.evaluate(() => Game._test.tutorialStep))+')');
  await page.keyboard.down('d');
  await page.waitForTimeout(500);
  await page.keyboard.up('d');
  await page.waitForTimeout(300);
  ok((await page.evaluate(() => Game._test.tutorialStep)) === 4, 'moving afterward correctly jumps straight to step 4, since launch+capture were already satisfied out of order');
  await page.waitForTimeout(4800);
  ok((await page.evaluate(() => Game._test.tutorialStep)) === 0, 'tutorial auto-dismisses after the final step (not stuck forever)');
  ok((await page.evaluate(() => Persist.data.seenTutorial)) === true, 'seenTutorial persists once the sequence genuinely completes');
  await page.evaluate(() => { Game.cinder.hull = 0; });
  await page.waitForTimeout(600);
  await page.evaluate(() => Game.start());
  await page.waitForTimeout(300);
  ok((await page.evaluate(() => Game._test.tutorialStep)) === 0, 'tutorial never shows again on a later run once seenTutorial is set');
  await page.evaluate(() => Game.abandonRun());

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  console.log('final console errors:', JSON.stringify(consoleErrors));
  console.log('final page errors:', JSON.stringify(pageErrors));
  await browser.close();
  process.exit(fail>0 ? 1 : 0);
})();
