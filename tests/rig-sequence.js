// Rykndu doll-rig attack-sequence regression pass — drives the real page
// through its own window.Rig._test hook (never a duplicated copy of the
// pose/sequence logic), so this never drifts from the shipped code. Added
// after two real bugs were found in prototypes/rykndu-doll-rig.html by
// simulating the pose math (a circular self-read in startAttack(), and a
// mirrored-angle wraparound), plus a structural fix making the recovery
// phase interruptible — this test locks in both the crash-safety and the
// committed-phase/recovery-interrupt timing contract going forward.
// Section 6 covers the v0.1.4 solveRig()/renderRig() split — the foot/hand
// world-positions that real hit detection will read from next. Section 7
// covers v0.1.5's real hit detection and autonomous enemies.
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-sequence.js`.
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
  await page.waitForFunction(() => typeof window.Rig !== 'undefined');
  // Freeze the autonomous spawner from the very start. Sections 1-6 don't
  // exercise enemies/spawning at all, but they still sum to several seconds
  // of nominal waits -- long enough for the real spawn timer to complete
  // several full spawn-approach-miss cycles in the background, quietly
  // inflating missedCount before section 7 even begins. Once Phase 3 made
  // missedCount load-bearing (5 misses flips sessionState to 'lose', which
  // freezes updateEnemies() and hangs any later test polling enemy.t), that
  // stopped being harmless. Sections that actually want the real spawner
  // re-freeze it explicitly right before they need it.
  await page.evaluate(() => window.Rig._test.freezeSpawns());

  console.log('1. Crash safety under heavy mashing');
  await page.evaluate(() => {
    window.Rig._test.trigger('R');
    for (let i = 0; i < 500; i++) window.Rig._test.trigger(i % 2 === 0 ? 'L' : 'R');
  });
  await page.waitForTimeout(1500);
  ok(pageErrors.length === 0, 'zero page errors after 500 synchronous triggers');
  ok(consoleErrors.length === 0, 'zero console errors after 500 synchronous triggers');
  let state = await page.evaluate(() => window.Rig._test.state());
  // seqIdx is left stale (not reset) once a sequence ends and seq goes null —
  // startAttack() always resets it to 0 before it's read again, so it's only
  // meaningful to bounds-check while an attack is actually in progress.
  ok(state.idle || state.seqIdx < state.seqLen, 'seqIdx never exceeds seqLen while an attack is active (' + state.seqIdx + '/' + state.seqLen + ')');

  console.log('2. Committed phase (windup+strike) cannot be interrupted');
  await page.waitForTimeout(600); // let everything settle to idle
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(30); // still well inside the 110ms windup
  let mid = await page.evaluate(() => window.Rig._test.state());
  ok(!mid.idle && mid.committed === true, 'still in committed phase ~30ms into an attack');
  await page.evaluate(() => window.Rig._test.trigger('L'));
  let afterTrigger = await page.evaluate(() => window.Rig._test.state());
  ok(afterTrigger.queuedSide === 'L', 'input during committed phase buffers instead of interrupting');

  console.log('3. Buffered input fires at committed-phase end, not after full recovery');
  const startWait = Date.now();
  await page.waitForFunction(() => window.Rig._test.state().queuedSide === null, { timeout: 1000 });
  const firedAfterMs = Date.now() - startWait;
  ok(firedAfterMs < 350, 'buffered attack fired in ' + firedAfterMs + 'ms (must be well under the old 400ms full-sequence wait)');

  console.log('4. Recovery phase can be interrupted immediately');
  await page.waitForTimeout(700); // settle to idle
  await page.evaluate(() => window.Rig._test.trigger('R'));
  // The committed (windup+strike) window is ~180ms; wait comfortably past it
  // (but well short of recovery's own ~400ms end) so real event-loop/rAF
  // jitter can't make this flaky the way a tight ~190ms margin can.
  await page.waitForTimeout(280);
  let inRecovery = await page.evaluate(() => window.Rig._test.state());
  ok(!inRecovery.idle && inRecovery.committed === false, 'sitting in the interruptible recovery phase at ~280ms');
  await page.evaluate(() => window.Rig._test.trigger('L'));
  let afterInterrupt = await page.evaluate(() => window.Rig._test.state());
  ok(afterInterrupt.seqIdx === 0 && afterInterrupt.queuedSide === null, 'trigger during recovery starts the new attack immediately (seqIdx reset to 0), not buffered');

  console.log('5. Left-side kick spine does not windmill');
  await page.waitForTimeout(700);
  await page.evaluate(() => window.Rig._test.trigger('L'));
  const spineTrace = [];
  for (let i = 0; i < 6; i++) {
    spineTrace.push((await page.evaluate(() => window.Rig._test.state().pose.spineA)));
    await page.waitForTimeout(16);
  }
  let maxStep = 0;
  for (let i = 1; i < spineTrace.length; i++) maxStep = Math.max(maxStep, Math.abs(spineTrace[i] - spineTrace[i - 1]));
  ok(maxStep < 0.5, 'left-kick spineA moves smoothly frame-to-frame (max step ' + maxStep.toFixed(3) + ' rad), no ~2pi wraparound sweep');

  console.log('6. solveRig() exposes real joint world-positions (the v0.1.4 refactor)');
  await page.waitForTimeout(700); // settle to idle
  const idleJoints = (await page.evaluate(() => window.Rig._test.state())).joints;
  const expectedJoints = ['pelvis', 'hipL', 'kneeL', 'footL', 'hipR', 'kneeR', 'footR',
    'chest', 'shoulderL', 'elbowL', 'handL', 'shoulderR', 'elbowR', 'handR', 'head'];
  const hasAllFinite = expectedJoints.every(k => idleJoints[k] &&
    Number.isFinite(idleJoints[k].x) && Number.isFinite(idleJoints[k].y));
  ok(hasAllFinite, 'all ' + expectedJoints.length + ' joints present with finite x/y at idle');
  ok(idleJoints.footL.x < idleJoints.footR.x, 'idle stance: left foot sits left of right foot (sane spatial layout)');

  // The strike phase is exactly the window Phase 2 (real hit detection) will
  // read a foot position from — confirm it actually moves, not just exists.
  const idleFootRX = idleJoints.footR.x;
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(150); // inside the strike phase (110-180ms)
  const strikeJoints = (await page.evaluate(() => window.Rig._test.state())).joints;
  const kickReach = Math.abs(strikeJoints.footR.x - idleFootRX);
  ok(kickReach > 20, 'kicking foot (footR) has moved meaningfully from idle during strike (moved ' + kickReach.toFixed(1) + 'px)');

  console.log('7. Real hit detection and autonomous enemies (v0.1.5)');
  // Isolate from the autonomous spawn timer for these deterministic checks —
  // the timer firing mid-test is correct product behavior, not something
  // these specific assertions are trying to exercise. Frozen BEFORE the
  // settle wait, not just after, so nothing can spawn during it.
  await page.evaluate(() => window.Rig._test.freezeSpawns());
  await page.waitForTimeout(700); // settle to idle
  await page.evaluate(() => window.Rig._test.freezeSpawns());

  // A well-timed, matching-side kick should kill. Trigger and spawn happen
  // in ONE evaluate() call so they share the same performance.now() moment
  // exactly — no inter-call IPC gap between two separate evaluate() round
  // trips to introduce jitter. elapsedMs=455 puts the enemy AT contactX
  // (dead center of the ~45px/~42ms-wide hit radius, not its edge) right
  // at the midpoint of the 70ms strike window (110+35=145ms after trigger),
  // giving ~35ms of slack on either side against real timer/frame jitter —
  // this is the fix for the tight-margin flakiness the first version of
  // this test had (same class of issue the recovery-boundary test hit).
  await page.evaluate(() => { window.Rig._test.clearEnemies(); window.Rig._test.freezeSpawns(); });
  let before = await page.evaluate(() => window.Rig._test.state());
  await page.evaluate(() => { window.Rig._test.trigger('R'); window.Rig._test.spawnEnemy('R', 455); });
  await page.waitForTimeout(145);
  let after = await page.evaluate(() => window.Rig._test.state());
  ok(after.killCount === before.killCount + 1, 'well-timed matching-side kick kills the enemy');
  // A killed enemy now lingers ~220ms as a fading death-flash (quality-pass
  // juice work) rather than vanishing instantly -- it stays in the array,
  // marked dying, until ENEMY_DEATH_DUR elapses.
  ok(after.enemies.length === 1 && after.enemies[0].dying === true, 'killed enemy lingers as a dying flash, not an instant vanish');
  await page.waitForTimeout(280); // past ENEMY_DEATH_DUR (220ms)
  let settled = await page.evaluate(() => window.Rig._test.state());
  ok(settled.enemies.length === 0, 'dying enemy is fully removed once its death animation ends');

  // A mismatched-side kick must not kill it, even at the same timing.
  await page.evaluate(() => window.Rig._test.freezeSpawns());
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.Rig._test.clearEnemies(); window.Rig._test.freezeSpawns(); window.Rig._test.spawnEnemy('L', 460); });
  before = await page.evaluate(() => window.Rig._test.state());
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(120);
  after = await page.evaluate(() => window.Rig._test.state());
  ok(after.killCount === before.killCount, 'mismatched-side kick does not kill (kill count unchanged)');
  ok(after.enemies.length === 1 && after.enemies[0].alive, 'mismatched-side enemy is still alive and approaching');
  await page.evaluate(() => { window.Rig._test.clearEnemies(); window.Rig._test.freezeSpawns(); }); // don't let it carry into the next check

  // A whiff -- correct side, but thrown too early while the enemy is still
  // far away -- must not kill either. Timing alone isn't enough; position matters.
  await page.evaluate(() => window.Rig._test.freezeSpawns());
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.Rig._test.clearEnemies(); window.Rig._test.freezeSpawns(); window.Rig._test.spawnEnemy('R', 0); });
  before = await page.evaluate(() => window.Rig._test.state());
  await page.evaluate(() => window.Rig._test.trigger('R'));
  await page.waitForTimeout(120);
  after = await page.evaluate(() => window.Rig._test.state());
  ok(after.killCount === before.killCount, 'a correct-side kick thrown too early (enemy still far away) whiffs, no kill');
  ok(after.enemies.length === 1, 'whiffed enemy is still alive, still approaching');
  await page.evaluate(() => { window.Rig._test.clearEnemies(); window.Rig._test.freezeSpawns(); });

  // An enemy that's never answered should register as missed once it
  // reaches melee range, not silently vanish or hang around forever.
  await page.evaluate(() => window.Rig._test.freezeSpawns());
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.Rig._test.clearEnemies(); window.Rig._test.freezeSpawns(); });
  before = await page.evaluate(() => window.Rig._test.state());
  await page.evaluate(() => window.Rig._test.spawnEnemy('L', 0));
  await page.waitForTimeout(900); // full ~600ms travel plus generous margin against real timer jitter
  after = await page.evaluate(() => window.Rig._test.state());
  ok(after.missedCount === before.missedCount + 1, 'an unanswered enemy is counted as missed after reaching melee range');
  ok(after.enemies.length === 0, 'missed enemy is removed, not left hanging around');

  console.log('8. resolveHits() vs updateEnemies() ordering (quality-pass engineer finding)');
  // An engineer audit found that when an enemy's melee-range timeout (t>=1)
  // and the player's committed-phase-ends-into-strike transition land in the
  // SAME frame, the old call order (updateEnemies before resolveHits) let
  // the miss-timeout steal a geometrically clean, in-radius hit and record
  // it as a miss instead -- one-directional (only ever cost the player),
  // worse on lower frame rates, and exactly the kind of invisible unfairness
  // that erodes trust in a player's own correct timing. Fixed by swapping
  // the call order in frame(). Reproduced here by timing a fresh spawn's
  // natural travel so its t crosses 1.0 during the strike phase specifically
  // (trigger_time solved to satisfy trigger_time+110 <= 600 <= trigger_time+180,
  // i.e. trigger_time in [420,490]; 455 is the midpoint, for margin against
  // real timer jitter -- the same discipline as every other timing test in
  // this file). The preceding test's natural miss un-froze nextSpawnAt (every
  // kill/miss resolution rearms it), so freeze again BEFORE this settle wait,
  // not just after -- this was the exact gap that let the spawner accumulate
  // extra unanswered misses here and push missedCount to MAX_MISSES,
  // flipping sessionState to 'lose' and permanently freezing updateEnemies(),
  // which hung the race-condition poll below forever.
  await page.evaluate(() => window.Rig._test.freezeSpawns());
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.Rig._test.clearEnemies(); window.Rig._test.freezeSpawns(); });
  before = await page.evaluate(() => window.Rig._test.state());
  // The whole wait-until-t-crosses-0.758-then-trigger sequence runs INSIDE
  // the browser via its own rAF loop, not as repeated page.evaluate() round
  // trips from Node — an earlier version of this test polled from Node
  // using the full state() object (including solveRig()) per check, and
  // under this sandbox's occasional load spikes the round-trip overhead let
  // the enemy sail past the ~145ms-wide valid window entirely before a poll
  // ever caught it, hanging the test rather than just flaking. Reading only
  // enemy.t directly (not the full state) and polling via rAF from inside
  // the same context updateEnemies() runs in avoids both problems.
  const raceResult = await page.evaluate(() => new Promise((resolve) => {
    window.Rig._test.spawnEnemy('R', 0); // fresh enemy, natural approach
    function poll() {
      const e = (window.Rig._test.state().enemies || [])[0];
      if (e && e.t >= 0.758) {
        window.Rig._test.trigger('R'); // strike begins ~110ms from now, enemy's t crosses 1 during that window
        setTimeout(() => resolve(window.Rig._test.state()), 250);
        return;
      }
      if (!e) { resolve(null); return; } // enemy vanished before reaching the target -- report and let the test fail informatively, not hang
      requestAnimationFrame(poll);
    }
    requestAnimationFrame(poll);
    setTimeout(() => resolve(undefined), 5000); // hard backstop so a real regression fails fast instead of hanging the suite
  }));
  ok(raceResult !== undefined, 'race-condition scenario resolved within 5s (not hung)');
  ok(raceResult !== null, 'enemy was still present when its t crossed the target threshold');
  after = raceResult || before;
  ok(after.killCount === before.killCount + 1 && after.missedCount === before.missedCount,
    'a hit whose timing coincides with the enemy\'s own melee-timeout still registers as a kill, not a stolen miss');

  console.log('9. Session: real stakes (v0.1.7) -- lives, game over, restart');
  await page.evaluate(() => window.Rig._test.resetSession());
  let s = await page.evaluate(() => window.Rig._test.state());
  ok(s.sessionState === 'playing' && s.livesRemaining === 5 && s.killCount === 0 && s.missedCount === 0,
    'resetSession() starts clean: playing, 5 lives, 0/0');

  await page.evaluate(() => window.Rig._test.freezeSpawns());
  // Let exactly MAX_MISSES (5) real enemies time out unanswered, one at a
  // time -- the real path, not a test-only counter override, so this
  // exercises the same code the miss branch/session-over transition in
  // updateEnemies() actually runs.
  for (let i = 0; i < 5; i++) {
    // Re-freeze each iteration -- a miss resolution re-arms nextSpawnAt
    // (the same interaction that bit the section-7 tests originally), so
    // the freeze from before the loop only holds until the first miss.
    await page.evaluate(() => { window.Rig._test.clearEnemies(); window.Rig._test.freezeSpawns(); window.Rig._test.spawnEnemy('L', 0); });
    await page.waitForTimeout(900); // full ~600ms travel plus generous margin, same as the section-7 miss test
  }
  s = await page.evaluate(() => window.Rig._test.state());
  ok(s.missedCount === 5 && s.livesRemaining === 0, '5 misses exhausts the lives pool (missedCount=' + s.missedCount + ')');
  ok(s.sessionState === 'lose', 'sessionState flips to lose once lives reach 0');

  console.log('10. Gameplay freezes during game over, then restarts on next input');
  // While lost, spawning is meaningless (no enemy should be checked/created)
  // -- confirm the array stays empty rather than silently accumulating.
  await page.evaluate(() => window.Rig._test.freezeSpawns());
  await page.waitForTimeout(300);
  s = await page.evaluate(() => window.Rig._test.state());
  ok(s.enemies.length === 0, 'no enemies exist/spawn while the session is over');
  await page.evaluate(() => window.Rig._test.trigger('R')); // any input while lost restarts, per handleInput()
  s = await page.evaluate(() => window.Rig._test.state());
  ok(s.sessionState === 'playing' && s.killCount === 0 && s.missedCount === 0 && s.livesRemaining === 5,
    'an input during game over restarts: back to playing, 0/0, full lives');

  console.log('11. Attachment sockets (v0.1.9 consolidation §3)');
  await page.evaluate(() => { window.Rig._test.resetSession(); window.Rig._test.freezeSpawns(); window.Rig._test.clearEnemies(); });
  let sockState = await page.evaluate(() => window.Rig._test.state());
  const socketKeys = ['hand_r', 'hand_l', 'foot_r', 'foot_l', 'hip', 'back', 'head'];
  ok(socketKeys.every(k => sockState.sockets && Number.isFinite(sockState.sockets[k].x) && Number.isFinite(sockState.sockets[k].y)),
    'all 7 named sockets present with finite x/y at idle');
  ok(sockState.sockets.foot_r.x === sockState.joints.footR.x && sockState.sockets.foot_r.y === sockState.joints.footR.y,
    'foot_r socket aliases solveRig()\'s footR joint exactly (no drift between the two lookup paths)');
  ok(sockState.sockets.foot_l.x === sockState.joints.footL.x && sockState.sockets.foot_l.y === sockState.joints.footL.y,
    'foot_l socket aliases solveRig()\'s footL joint exactly');
  // resolveHits() was migrated to read foot_r/foot_l through getSockets()
  // instead of joints.footR/footL directly -- confirm a real hit still
  // lands through that migrated path, not just that the socket values
  // match in isolation. Same trigger+spawn-in-one-evaluate() and
  // elapsedMs=455/wait=145ms timing as section 7's well-timed-kill case.
  const beforeSockKill = await page.evaluate(() => window.Rig._test.state());
  await page.evaluate(() => { window.Rig._test.trigger('R'); window.Rig._test.spawnEnemy('R', 455); });
  await page.waitForTimeout(145);
  let sockKill = await page.evaluate(() => window.Rig._test.state());
  ok(sockKill.killCount === beforeSockKill.killCount + 1, 'a real kick still kills through the socket-migrated resolveHits() path');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
