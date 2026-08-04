// Rykndu doll-rig TitleTheme regression pass -- covers the title/mode-
// select screen's own composed OST (distinct from Music, the adaptive
// GAMEPLAY score covered by tests/rig-audio.js). Follows the exact same
// standalone-script/ok()-counter/console-error-assertion shape every other
// tests/rig-*.js file already uses (tests/rig-audio.js and
// tests/rig-second-attack.js are this file's direct templates).
//
// The one thing that makes this suite different from every other
// tests/rig-*.js file: TitleTheme only ever activates from a REAL,
// trusted browser gesture (a capture-phase pointerdown/keydown/touchstart
// listener) -- unlike every other suite's `page.evaluate(() =>
// window.startDuel())` programmatic dismissal, this file has to actually
// dispatch a real Playwright click for TitleTheme to ever start at all.
// See tests/rig-audio.js §6's own updated comment for why THAT suite
// staying convolver-free is a real, still-true assertion, not something
// this file's existence quietly breaks.
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-title-theme.js`.
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

  // Patch AudioContext.createConvolver before the page's own script runs,
  // the same technique tests/rig-audio.js already uses, so we can assert
  // on the real convolver count rather than trusting the graph is shaped
  // the way the code reads.
  await page.addInitScript(() => {
    window.__convolverCount = 0;
    const Orig = window.AudioContext.prototype.createConvolver;
    window.AudioContext.prototype.createConvolver = function () {
      window.__convolverCount++;
      return Orig.call(this);
    };
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.Rig !== 'undefined' && typeof window.TitleTheme !== 'undefined');

  console.log('1. TitleTheme is not started before any interaction at all');
  ok((await page.evaluate(() => window.TitleTheme._test.isStarted())) === false, 'TitleTheme._test.isStarted() === false before any interaction');
  ok((await page.evaluate(() => window.__convolverCount)) === 0, 'zero ConvolverNodes exist before any interaction (SFX/Music/TitleTheme all still cold)');

  console.log('2. A real, trusted click on the menu panel (NOT a mode button) starts TitleTheme');
  // #menuPanel top-left corner -- inside the panel (so it's a real click on
  // visible page content) but away from both mode buttons, so this click
  // does NOT itself dismiss the menu or pick a mode.
  await page.locator('#menuPanel').click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(150);
  ok((await page.evaluate(() => window.TitleTheme._test.isStarted())) === true, 'TitleTheme starts from a real click on the menu panel');
  ok((await page.evaluate(() => window.Music._test.isStarted())) === true, 'Music also starts (SFX.ensureCtx()\'s existing unconditional Music.ensureCtx() cascade — an accepted, known side effect, not this pass\'s own new behavior)');
  const menuStillOpen = await page.evaluate(() => !document.getElementById('menuOverlay').classList.contains('hide'));
  ok(menuStillOpen, 'the menu itself is still open -- the activating click landed on the panel background, not a mode button');

  console.log('3. Exactly one ConvolverNode exists once TitleTheme is running');
  ok((await page.evaluate(() => window.__convolverCount)) === 1, 'exactly 1 ConvolverNode created (TitleTheme\'s own synthesized reverb, built once at ensureCtx() time)');

  console.log('4. The convolver count stays pinned at 1 through a run of real SFX one-shots -- proves SFX itself still never creates one');
  await page.evaluate(() => {
    window.Rig._test.trigger('L');
    window.Rig._test.trigger('R');
    window.Rig._test.spawnEnemy('L', 0);
    window.Rig._test.spawnEnemy('R', 455);
  });
  await page.waitForTimeout(900); // enough for windup/strike/miss/proximity-pulse SFX to all have a chance to fire
  ok((await page.evaluate(() => window.__convolverCount)) === 1, 'still exactly 1 ConvolverNode after windup/strike/miss/proximity SFX all fired (' + (await page.evaluate(() => window.__convolverCount)) + ' found) -- SFX\'s own dry-mix invariant (tests/rig-audio.js §6) holds independently of TitleTheme existing');
  await page.evaluate(() => { window.Rig._test.clearEnemies(); window.Rig._test.resetSession(); });

  console.log('5. Real numbers land where intended -- reverb tail, FM modulation index, per-section bus-gain targets over real elapsed time');
  const tailSec = await page.evaluate(() => window.TitleTheme._test.reverbTailSeconds());
  ok(Math.abs(tailSec - 1.3) < 0.001, 'reverb tail is exactly 1.3s, got ' + tailSec);
  const modGain = await page.evaluate(() => window.TitleTheme._test.fmModGainFor(1046.50, true));
  ok(Math.abs(modGain - 1046.50 * 2 * 2.0) < 0.01, 'lead FM modulator gain (peak deviation in Hz) for C6 is carrierFreq*2*LEAD_FM_INDEX, got ' + modGain);

  await page.evaluate(() => window.TitleTheme._test.previewFromSection('statement'));
  await page.waitForTimeout(1800);
  let g = await page.evaluate(() => window.TitleTheme._test.busGains());
  ok(Math.abs(g.padDry - 0.16) < 0.01, 'padDry lands at its Statement target (0.16), got ' + g.padDry.toFixed(3));
  ok(Math.abs(g.leadDry - 0.5) < 0.01, 'leadDry lands at its Statement target (0.5), got ' + g.leadDry.toFixed(3));
  ok(Math.abs(g.cmDry - 0.0001) < 0.001, 'countermelody is still silent during Statement (enters only in Build), got ' + g.cmDry.toFixed(4));

  await page.evaluate(() => window.TitleTheme._test.previewFromSection('build'));
  await page.waitForTimeout(1800);
  g = await page.evaluate(() => window.TitleTheme._test.busGains());
  ok(Math.abs(g.cmDry - 0.22) < 0.01, 'countermelody enters at its Build target (0.22) once Build fires, got ' + g.cmDry.toFixed(3));
  ok(Math.abs(g.shimmerReverb - 0.55) < 0.01, 'shimmer\'s reverb send lands at its Build target (0.55, mostly wet), got ' + g.shimmerReverb.toFixed(3));

  console.log('6. Reaching the Tail section decays every layer except the sub-bass anchor');
  await page.evaluate(() => window.TitleTheme._test.previewFromSection('tail'));
  await page.waitForTimeout(2800);
  g = await page.evaluate(() => window.TitleTheme._test.busGains());
  ok(g.padDry < 0.001 && g.leadDry < 0.001 && g.cmDry < 0.001 && g.shimmerDry < 0.001, 'pad/lead/countermelody/shimmer have all decayed to silence in the Tail (padDry=' + g.padDry.toFixed(4) + ', leadDry=' + g.leadDry.toFixed(4) + ', cmDry=' + g.cmDry.toFixed(4) + ', shimmerDry=' + g.shimmerDry.toFixed(4) + ')');
  ok(Math.abs(g.subBass - 0.34) < 0.001, 'sub-bass is untouched by the Tail decay, still at its steady 0.34 (got ' + g.subBass.toFixed(3) + ') -- the continuity anchor the next cycle\'s Intro finds already running');

  console.log('7. Dismissing the menu (a genuine mode pick) stops TitleTheme -- a real, multi-checkpoint gain decay, not a single snapshot');
  await page.evaluate(() => window.TitleTheme._test.previewFromSection('statement')); // bring master back up off the floor so the decay below is measuring something real
  await page.waitForTimeout(600);
  const masterBeforeStop = await page.evaluate(() => window.TitleTheme._test.masterGain());
  await page.locator('.menu-btn.duel').click(); // a REAL click on the actual mode button -- window.startDuel() -> hideRyknduMenu() -> TitleTheme.stop()
  const g0 = await page.evaluate(() => window.TitleTheme._test.masterGain());
  await page.waitForTimeout(500);
  const g1 = await page.evaluate(() => window.TitleTheme._test.masterGain());
  await page.waitForTimeout(600);
  const g2 = await page.evaluate(() => window.TitleTheme._test.masterGain());
  await page.waitForTimeout(600);
  const g3 = await page.evaluate(() => window.TitleTheme._test.masterGain());
  ok(masterBeforeStop > 0.5, 'master gain was genuinely up (not near the floor) right before stop() was triggered, got ' + masterBeforeStop.toFixed(3));
  ok(g0 >= g1 && g1 >= g2 && g2 >= g3, 'master gain decays monotonically across 3 real checkpoints after stop() (' + [g0, g1, g2, g3].map(v => v.toFixed(3)).join(' -> ') + ')');
  ok(g3 < 0.01, 'master gain has reached near-silence by ~1.7s after stop() (the scheduled 1.6s fade), got ' + g3.toFixed(4));
  ok((await page.evaluate(() => window.TitleTheme._test.isStopped())) === true, 'TitleTheme._test.isStopped() === true after the mode pick');

  console.log('8. window.reopenRyknduMenu() does not resume playback or create any new oscillators/convolvers');
  const convolversBeforeReopen = await page.evaluate(() => window.__convolverCount);
  await page.evaluate(() => window.reopenRyknduMenu());
  await page.waitForTimeout(2000); // long enough that if playback HAD resumed, the master gain would have visibly moved off the floor
  const masterAfterReopen = await page.evaluate(() => window.TitleTheme._test.masterGain());
  const convolversAfterReopen = await page.evaluate(() => window.__convolverCount);
  ok(Math.abs(masterAfterReopen - 0.0001) < 0.0005, 'master gain stays pinned at the near-silence floor after reopening the menu -- playback did not resume, got ' + masterAfterReopen.toFixed(5));
  ok(convolversAfterReopen === convolversBeforeReopen, 'no new ConvolverNode was created by reopening the menu (' + convolversBeforeReopen + ' -> ' + convolversAfterReopen + ')');
  ok((await page.evaluate(() => window.TitleTheme._test.isStopped())) === true, 'TitleTheme is still stopped after reopening the menu -- once stopped, it stays stopped for the rest of the page session');

  console.log('9. No page/console errors across any of the above');
  ok(pageErrors.length === 0, 'zero page errors (' + pageErrors.length + ' found: ' + pageErrors.join('; ') + ')');
  ok(consoleErrors.length === 0, 'zero console errors (' + consoleErrors.length + ' found: ' + consoleErrors.join('; ') + ')');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
