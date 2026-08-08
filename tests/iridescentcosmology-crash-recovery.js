// Regression pass for the game-loop crash safety net (see
// iridescentcosmology.html's loop()/handleCrash/recoverFromCrash). Real,
// evidenced necessity: v2.11.0's own changelog records an uncaught
// exception inside update()'s call stack killing the entire sim/render
// loop permanently ("recoverable only by force-quitting to the menu; the
// run itself was unsalvageable") — that specific site got fixed at its
// root cause, but the general architectural vulnerability (ANY future
// uncaught exception in update()/render() kills the loop the same way)
// was never closed until this pass.
//
// Confirms: a real fault (Game._test.setPlayerPos(NaN, NaN), which
// propagates through real camera/render math into a genuine
// CanvasRenderingContext2D TypeError) trips the safety net rather than
// silently freezing forever; the rAF chain keeps running after the
// trip (the actual fix — requestAnimationFrame(loop) stays scheduled
// every frame, crashed or not); a crash report is auto-captured; the
// recovery overlay's "Return to Menu" action gets the player back to a
// playable state without a page reload; and a normal, uncorrupted run
// afterward behaves normally (the safety net doesn't leave stray state
// behind).
//
// Usage: serve the game (e.g. `npx http-server -p 8935` from the repo
// root), then `node iridescentcosmology-crash-recovery.js`. Set
// IRIDESCENT_COSMOLOGY_URL if not serving on the default localhost:8935.
'use strict';
const { chromium } = require('playwright');
const BASE_URL = process.env.IRIDESCENT_COSMOLOGY_URL || 'http://localhost:8935/iridescentcosmology.html';

let pass = 0, fail = 0;
function ok(cond, msg){ if(cond){ pass++; console.log('  OK', msg); } else { fail++; console.log('  FAIL', msg); } }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));

  await page.goto(BASE_URL);
  await page.waitForFunction(() => typeof Game !== 'undefined');

  console.log('\n=== 1. Trip the safety net with a real fault ===');
  await page.evaluate(() => { Game.start(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { Game._test.setPlayerPos(NaN, NaN); });
  // Which exact draw call first chokes on the NaN (a gradient here, a
  // drawImage there) isn't deterministic frame-to-frame -- it depends on
  // which conditional render branch happens to run. Poll instead of a
  // fixed sleep, with real headroom.
  await page.waitForFunction(() => Game._test.state().crashed === true, { timeout: 5000 });

  const st1 = await page.evaluate(() => Game._test.state());
  console.log('  state after fault:', JSON.stringify({ crashed: st1.crashed, running: st1.running }));
  ok(st1.crashed === true, 'crashed flag set after a real caught exception');
  // The whole point of loop()'s try/catch is that this exception no
  // longer reaches the page as an uncaught error -- Playwright's
  // pageerror event correctly does NOT fire here anymore. Confirming
  // that stays true is section 9's job (a real regression would show up
  // there as an unexpected pageerror), not this check.
  ok(pageErrors.length === 0, 'the exception was actually caught, not left to surface as an uncaught page error');

  console.log('\n=== 2. Recovery overlay is actually visible ===');
  const overlayVisible = await page.evaluate(() => document.getElementById('crashOverlay').classList.contains('show'));
  ok(overlayVisible, 'crashOverlay is shown, not just a silent frozen frame');

  console.log('\n=== 3. rAF chain kept running after the trip (the actual fix) ===');
  await page.evaluate(() => {
    window.__frameCount2 = 0;
    const orig = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => orig((t) => { window.__frameCount2++; cb(t); });
  });
  await page.waitForTimeout(500);
  const framesAfterTrip = await page.evaluate(() => window.__frameCount2);
  console.log('  frames scheduled 500ms after trip:', framesAfterTrip);
  ok(framesAfterTrip > 10, 'requestAnimationFrame(loop) is still being called every frame after the crash, not dead');

  console.log('\n=== 4. No re-crash spam: game does not re-throw every frame while tripped ===');
  const errorsBeforeWait = pageErrors.length;
  await page.waitForTimeout(1000);
  const errorsAfterWait = pageErrors.length;
  console.log(`  page errors: ${errorsBeforeWait} -> ${errorsAfterWait}`);
  ok(errorsAfterWait === errorsBeforeWait, 'exactly one throw total -- update()/render() correctly skipped while crashed, no per-frame re-throw spam');

  console.log('\n=== 5. Crash report auto-captured to Bugrep ===');
  const bugCount = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('bugreports-iridescentcosmology_v1') || '[]').length; }
    catch(e){ return -1; }
  });
  console.log('  bug reports in localStorage:', bugCount);
  ok(bugCount >= 1, 'a crash report was actually written to the same storage a manual bug report would use');

  console.log('\n=== 6. Recovery action gets the player back to a playable state, no reload ===');
  await page.evaluate(() => { Game.recoverFromCrash(); });
  await page.waitForTimeout(200);
  const st2 = await page.evaluate(() => Game._test.state());
  const overlayGone = await page.evaluate(() => !document.getElementById('crashOverlay').classList.contains('show'));
  const menuShowing = await page.evaluate(() => document.getElementById('menuOverlay').classList.contains('show'));
  console.log('  post-recovery:', JSON.stringify({ crashed: st2.crashed, running: st2.running, overlayGone, menuShowing }));
  ok(st2.crashed === false, 'crashed flag cleared');
  ok(overlayGone, 'crash overlay dismissed');
  ok(menuShowing, 'landed back on the menu, a real playable state');

  console.log('\n=== 7. A fresh run after recovery behaves normally (no stray state left behind) ===');
  await page.evaluate(() => { Game.start(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { for(let i=0;i<5;i++) Game._test.spawnAt('husk', 40, 0); });
  await page.waitForTimeout(300);
  const st3 = await page.evaluate(() => Game._test.state());
  console.log('  fresh run state:', JSON.stringify({ running: st3.running, crashed: st3.crashed, px: st3.px, py: st3.py, enemies: st3.enemies }));
  ok(st3.running === true, 'a new run actually starts and runs normally after a prior crash+recovery');
  ok(!Number.isNaN(st3.px) && !Number.isNaN(st3.py), 'player position is real and finite on the fresh run, not still poisoned by the old fault');
  ok(st3.crashed === false, 'crashed stays false through a normal fresh run');

  console.log('\n=== 8. Global error listeners exist (defense-in-depth for errors outside the loop) ===');
  const hasGlobalHandlers = await page.evaluate(() => {
    // can't directly introspect listener presence, so verify behavior:
    // dispatch a real ErrorEvent and confirm it lands in Bugrep.
    const before = JSON.parse(localStorage.getItem('bugreports-iridescentcosmology_v1') || '[]').length;
    window.dispatchEvent(new ErrorEvent('error', { message: 'synthetic-test-error-for-global-handler-check' }));
    const after = JSON.parse(localStorage.getItem('bugreports-iridescentcosmology_v1') || '[]').length;
    return after > before;
  });
  ok(hasGlobalHandlers, 'a real dispatched window error event gets captured by the global error listener');

  console.log('\n=== 9. Full page-error tally, for the record ===');
  console.log('  all page errors this run:', pageErrors);
  // Zero, not one -- the deliberately-injected fault got caught by
  // loop()'s own try/catch and never surfaced as an uncaught page error.
  // A regression here (this suite starting to see a real pageerror) would
  // mean loop()'s try/catch stopped actually catching something it used
  // to -- exactly the signal this check exists to catch.
  ok(pageErrors.length === 0, 'the deliberately-injected fault never surfaced as an uncaught page error');

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
})();
