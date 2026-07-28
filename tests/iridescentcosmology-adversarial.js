// Adversarial regression pass — drives IRIDESCENT COSMOLOGY through its real UI with
// deliberately edge-case input (rapid overlay toggling, mashed dash/pause,
// double-clicked level-up cards, a compressed boss fight, mocked gamepad
// input, a dense enemy wave) at a real mobile viewport, and checks for
// console/page errors, horizontal overflow, and the share-card download
// path. Never injects state directly except via the game's own exposed
// Game._test/Music._test hooks, same as the rest of this file's UI actions.
//
// Usage: serve the game (e.g. `npx http-server -p 8935` from the repo
// root), then `node iridescentcosmology-adversarial.js`. Set
// PLAYWRIGHT_CHROMIUM_PATH if Chromium isn't on Playwright's default
// discovery path, and IRIDESCENT_COSMOLOGY_URL if not serving on the
// default localhost:8935.
const { chromium } = require('playwright');

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const BASE_URL = process.env.IRIDESCENT_COSMOLOGY_URL || 'http://localhost:8935/iridescentcosmology.html';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const overflowHits = [];
  const downloads = [];
  // BUG FIX (found by a qa-playtest pass): this filter matched on
  // 'fonts.googleapis' appearing in the console message TEXT, but a failed
  // subresource load's console text in Chromium is the bare
  // "Failed to load resource: net::ERR_CONNECTION_RESET" with no URL — so
  // the filter never actually fired, and every run's "real" console-error
  // count included this expected, environment-only failure (no egress to
  // Google Fonts in this sandbox) undetected. Filtering on the actual
  // failed request's URL via `requestfailed` is the correct signal, and
  // means a genuinely new console error can no longer hide behind this one.
  let fontsRequestFailed = false;
  page.on('requestfailed', req => { if (req.url().includes('fonts.googleapis.com')) fontsRequestFailed = true; });
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('download', d => downloads.push(d.suggestedFilename()));

  async function checkOverflow(label) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) overflowHits.push({ label, overflow });
  }

  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await checkOverflow('menu');

  console.log('--- Settings: open from menu, drag both volume sliders, toggle reduced motion repeatedly, close ---');
  await page.click('[aria-label=Settings]', { timeout: 2000 });
  await page.waitForTimeout(200);
  await page.fill('#musicVolSlider', '0.2').catch(()=>{});
  await page.fill('#sfxVolSlider', '0.8').catch(()=>{});
  for (let i = 0; i < 6; i++) {
    await page.click('#reducedMotionToggle', { timeout: 1000 }).catch(()=>{});
    await page.waitForTimeout(20);
  }
  await checkOverflow('settings open');
  await page.click('#settingsOverlay .btn', { timeout: 2000 });
  await page.waitForTimeout(200);

  console.log('--- start a run, mash dash (keyboard + mocked gamepad), rapid pause/settings/resume ---');
  await page.click('text=OPEN THE COSMOLOGY', { timeout: 2000 });
  await page.waitForTimeout(200);
  for (let i = 0; i < 15; i++) await page.evaluate(() => Game.dash());
  await page.evaluate(() => {
    let held = true;
    navigator.getGamepads = () => [{ index: 0, connected: true, axes: [0.9, 0.9], buttons: [{ pressed: held }] }];
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => { navigator.getGamepads = () => [{ index:0, connected:true, axes:[0,0], buttons:[{pressed:false}] }]; });
  await checkOverflow('mid-run after dash mash');

  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => Game.togglePause());
    await page.waitForTimeout(15);
  }
  const stillPausedOdd = await page.evaluate(() => Game._test.state().paused);
  if (stillPausedOdd) await page.evaluate(() => Game.togglePause());
  await checkOverflow('after pause mash');

  console.log('--- rapid level-ups with double-clicks on cards (drain ALL queued level-ups, not just the first) ---');
  await page.evaluate(() => { Game._test.setSpellLevel('pulse', 5); Game._test.grantXP(120); });
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(60); // let a queued-but-not-yet-open next level-up actually open before checking
    const choosing = await page.evaluate(() => Game._test.state().levelChoosing);
    if (!choosing) break;
    const card = await page.$('.pick-card');
    if (card) { await card.click({ timeout: 1000 }).catch(()=>{}); await card.click({ timeout: 1000 }).catch(()=>{}); }
  }
  const finalChoosing = await page.evaluate(() => Game._test.state().levelChoosing);
  console.log('levelChoosing fully drained:', !finalChoosing, '(level reached:', await page.evaluate(() => Game._test.state().level), ')');
  await checkOverflow('after level-up spam');

  console.log('--- dense wave: spawn/kill many enemies to exercise oomph paths under load ---');
  await page.evaluate(() => {
    Game._test.setSpellLevel('nova', 5);
    for (let i = 0; i < 80; i++) {
      const ang = Math.random()*Math.PI*2, d = 60 + Math.random()*250;
      Game._test.spawnAt('husk', Math.cos(ang)*d, Math.sin(ang)*d);
    }
  });
  await page.waitForTimeout(3000);
  await checkOverflow('after dense wave');

  console.log('--- direct boss contact: player body overlapping Ramiel, then the Fracture (regression for a hard freeze found by the v2.11.0 real-browser playtest) ---');
  // v2.11.0: boss/boss2 are deliberately in the same spatial Grid as regular
  // enemies (so AoE spells can target them), and the player-contact-damage
  // query previously never excluded them — simply touching a boss's body
  // handed the boss object to that query as if it were a regular enemy.
  // Boss objects have no .dmg/.color, which threw inside update()'s call
  // stack BEFORE loop()'s own requestAnimationFrame call — a 100%-
  // reproducible permanent freeze, not just a bad frame. Nothing above this
  // point in the suite ever put the player's body on top of a boss, which
  // is exactly why this shipped undetected through every prior check here.
  // drain any level-up the preceding dense-wave kills queued up first — by
  // design (see update()'s own `if(...levelChoosing...) return;` gate),
  // elapsed correctly does NOT advance while one is pending, which would
  // otherwise be indistinguishable from the exact freeze this section
  // exists to catch.
  async function drainPendingLevelUp() {
    for (let i = 0; i < 20; i++) {
      const choosing = await page.evaluate(() => Game._test.state().levelChoosing);
      if (!choosing) break;
      const card = await page.$('.pick-card');
      if (card) await card.click({ timeout: 1000 }).catch(()=>{});
      await page.waitForTimeout(60);
    }
  }
  await drainPendingLevelUp();
  {
    const elapsedBefore = await page.evaluate(() => {
      Game._test.forceSpawnBossNow(0, 0); // Ramiel directly on the player
      Game._test.clearIframes();
      return Game._test.state().elapsed;
    });
    await page.waitForTimeout(1500); // real wall-clock time -- a frozen loop will not advance `elapsed` at all
    await drainPendingLevelUp(); // real kills from equipped weapons during the wait above can legitimately queue one
    const afterRamiel = await page.evaluate(() => Game._test.state());
    const ramielLoopAlive = (afterRamiel.elapsed - elapsedBefore) > 0.8;
    console.log('Ramiel contact: elapsed advanced', (afterRamiel.elapsed - elapsedBefore).toFixed(2) + 's, hp =', afterRamiel.hp, '(loop alive:', ramielLoopAlive + ')');
    await page.evaluate(() => { Game._test.damageBoss(999999); });
    await page.waitForTimeout(300);
    await drainPendingLevelUp();
  }
  {
    const before2 = await page.evaluate(() => {
      if (Game._test.state().stage !== 2) Game._test.forceEnterStage2();
      Game._test.forceSpawnBoss2Now(0, 0); // the Fracture directly on the player
      Game._test.clearIframes();
      return Game._test.state().elapsed;
    });
    await page.waitForTimeout(1500);
    await drainPendingLevelUp();
    const afterFracture = await page.evaluate(() => Game._test.state());
    const fractureLoopAlive = (afterFracture.elapsed - before2) > 0.8;
    console.log('Fracture contact: elapsed advanced', (afterFracture.elapsed - before2).toFixed(2) + 's, hp =', afterFracture.hp, '(loop alive:', fractureLoopAlive + ')');
    await page.evaluate(() => { if (Game._test.state().boss2) Game._test.damageBoss2(999999); });
    await page.waitForTimeout(300);
    await drainPendingLevelUp();
  }
  await checkOverflow('after direct boss contact');

  console.log('--- compressed boss fight, then Share on stage-clear ---');
  // defensive: ongoing gameplay (equipped weapons still killing enemies)
  // can legitimately queue another level-up between here and the last
  // drain — the game correctly freezes all simulation, including boss
  // updates, while one is pending (by design), so drain once more first.
  for (let i = 0; i < 20; i++) {
    const choosing = await page.evaluate(() => Game._test.state().levelChoosing);
    if (!choosing) break;
    const card = await page.$('.pick-card');
    if (card) await card.click({ timeout: 1000 }).catch(()=>{});
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => { Game._test.forceSpawnBossNow(20,-80); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { Game._test.setBossPhase('beamTelegraph', 0.1); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { Game._test.damageBoss(999999); });
  await page.waitForTimeout(300);
  // ongoing kills from equipped weapons can queue yet another level-up in
  // this exact window — drain again right before checking so a genuinely
  // pending (by-design) level-up screen isn't mistaken for a stuck state.
  for (let i = 0; i < 20; i++) {
    const choosing = await page.evaluate(() => Game._test.state().levelChoosing);
    if (!choosing) break;
    const card = await page.$('.pick-card');
    if (card) await card.click({ timeout: 1000 }).catch(()=>{});
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(1200);
  const clearShowing = await page.evaluate(() => document.getElementById('stageClearOverlay').classList.contains('show'));
  console.log('stageClearOverlay showing:', clearShowing);
  if (clearShowing) {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 4000 }).catch(()=>null),
      page.click('#stageClearOverlay [aria-label="Share this run"]', { timeout: 2000 }).catch(()=>{}),
    ]);
    console.log('stage-clear share download:', dl ? dl.suggestedFilename() : 'none (navigator.share path or failed)');
  }
  await checkOverflow('after boss fight + share');

  console.log('--- restart, force death, Share on death overlay ---');
  const restartBtn = await page.$('.overlay.show .btn.primary');
  if (restartBtn) await restartBtn.click({ timeout: 2000 }).catch(()=>{});
  await page.waitForTimeout(300);
  await page.evaluate(() => { if (Game._test.state().running) Game._test.hurt(999999); });
  await page.waitForTimeout(1000);
  const deathShowing = await page.evaluate(() => document.getElementById('deathOverlay').classList.contains('show'));
  console.log('deathOverlay showing:', deathShowing);
  if (deathShowing) {
    const [dl2] = await Promise.all([
      page.waitForEvent('download', { timeout: 4000 }).catch(()=>null),
      page.click('#deathOverlay [aria-label="Share this run"]', { timeout: 2000 }).catch(()=>{}),
    ]);
    console.log('death share download:', dl2 ? dl2.suggestedFilename() : 'none');
  }
  await checkOverflow('after death + share');

  console.log('--- fullscreen toggle, achievements panel, shop panel ---');
  await page.click('[aria-label="Toggle fullscreen"]', { timeout: 2000 }).catch(()=>{});
  const menuShowing = await page.evaluate(() => document.getElementById('menuOverlay').classList.contains('show'));
  if (!menuShowing) { const menuBtn = await page.$('.overlay.show .btn'); if (menuBtn) await menuBtn.click({timeout:1000}).catch(()=>{}); await page.waitForTimeout(200); }
  await page.click('[onclick*="Achievements.open"]', { timeout: 2000 }).catch(()=>{});
  await page.waitForTimeout(150);
  await page.click('#achieveOverlay .btn', { timeout: 2000 }).catch(()=>{});
  await page.waitForTimeout(150);
  await page.click('[onclick*="Shop.open"]', { timeout: 2000 }).catch(()=>{});
  await page.waitForTimeout(150);
  await page.click('#shopOverlay .btn', { timeout: 2000 }).catch(()=>{});
  await checkOverflow('after achievements/shop panels');

  console.log('--- repeated death/restart cycles, checking no state corruption ---');
  for (let i = 0; i < 3; i++) {
    const showing = await page.evaluate(() => document.getElementById('menuOverlay').classList.contains('show'));
    if (showing) await page.click('text=OPEN THE COSMOLOGY', { timeout: 2000 }).catch(()=>{});
    await page.waitForTimeout(300);
    await page.evaluate(() => { if (Game._test.state().running) Game._test.hurt(999999); });
    await page.waitForTimeout(700);
    const again = await page.$('.overlay.show .btn.primary');
    if (again) { await again.click({ timeout: 2000 }).catch(()=>{}); await page.waitForTimeout(300); }
  }
  await checkOverflow('after repeated death/restart cycle');

  console.log('\n=== FINAL RESULTS ===');
  console.log('console errors:', consoleErrors);
  console.log('  (expected/environmental Google Fonts failure this run:', fontsRequestFailed + ' -- no egress to fonts.googleapis.com in this sandbox, not a game bug)');
  console.log('page errors:', pageErrors);
  console.log('horizontal overflow hits:', overflowHits);
  console.log('downloads triggered:', downloads);

  await browser.close();
})().catch(e => { console.error('SCRIPT FAILED:', e); process.exit(1); });
