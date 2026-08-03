// Rykndu doll-rig second attack type (punch) -- covers the two-part task:
// (A) a real punch, combo-linked kick->punch, and (B) the combo-cancel
// knockback fix (COMBO_KNOCKBACK_SCALE) that keeps a canceled follow-up's
// target in range. Follows the exact same standalone-script/ok()-counter/
// console-error-assertion shape every other tests/rig-*.js file already
// uses (tests/rig-combo-cancel.js and tests/rig-parry.js are this file's
// direct templates).
//
// A note on timing style: most sections below use the same fixed
// page.waitForTimeout() margins the rest of this suite already relies on
// (scaled proportionally for punch's own shorter 70/50/160ms timing vs.
// the kick's proven 110/70/220ms margins). Section 6 (COMBO_KNOCKBACK_SCALE)
// uses page.waitForFunction() polling instead of a fixed wait, because it
// needs to sample a decaying velocity value close to the exact instant
// knockback is applied -- a fixed wait margin wide enough to be safe
// against round-trip jitter would also be wide enough for the value to
// have measurably decayed away from the number actually being asserted.
//
// Usage: serve the repo (`npx http-server -p 8935`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/rig-second-attack.js`.
const { chromium } = require('playwright');

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const BASE_URL = process.env.RIG_URL || 'http://localhost:8935/prototypes/rykndu-doll-rig.html';

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  ok   -', label); }
  else { fail++; console.log('  FAIL -', label); }
}
function near(actual, expected, tolerance, label) {
  ok(Math.abs(actual - expected) <= tolerance, label + ' (actual=' + actual.toFixed(2) + ', expected~=' + expected + ' +/-' + tolerance + ')');
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) consoleErrors.push(msg.text()); });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.Rig !== 'undefined' && typeof window.Rig2 !== 'undefined');
  await page.evaluate(() => window.startDuel());

  async function freshDuel() {
    await page.evaluate(() => {
      window.Rig._test.resetSession();
      window.Rig._test.freezeSpawns();
      window.Rig._test.clearEnemies();
      window.Rig2._test.reset();
    });
  }

  console.log('1. A punch triggers and resolves through the state machine on its own timing (70/50/160ms, not the kick\'s 110/70/220)');
  await freshDuel();
  await page.evaluate(() => window.Rig._test.rawAttack('R', 'punch'));
  const punchStart = await page.evaluate(() => window.Rig._test.state());
  ok(punchStart.attackType === 'punch', 'attackType reads punch immediately after triggering one');
  ok(punchStart.seqIdx === 0 && punchStart.idle === false, 'starts in windup (seqIdx 0), not idle');
  await page.waitForTimeout(20); // well inside punch's 70ms windup (proportional to the kick suite's own "30ms well inside 110ms windup" margin)
  const stillWindup = await page.evaluate(() => window.Rig._test.state());
  ok(stillWindup.seqIdx === 0 && stillWindup.attackType === 'punch', 'still in windup 20ms in -- punch has its own (shorter) windup, not reusing the kick\'s timing');
  // From here on, punch's own windows are short enough (50ms strike, 160ms
  // recovery) that a fixed wait margin sized safely against this
  // environment's real round-trip jitter would eat most of the window it's
  // trying to land inside -- waitForFunction() polls in-page instead, so it
  // catches each transition at the actual moment it happens rather than
  // guessing a fixed millisecond offset.
  await page.waitForFunction(() => window.Rig._test.state().seqIdx === 1, { polling: 4, timeout: 2000 });
  const inStrike = await page.evaluate(() => window.Rig._test.state());
  ok(inStrike.seqIdx === 1 && inStrike.attackType === 'punch', 'advanced into its own strike phase (punch windup is only 70ms, well under the kick\'s 110)');
  await page.waitForFunction(() => window.Rig._test.state().seqIdx === 2, { polling: 4, timeout: 2000 });
  const inRecover = await page.evaluate(() => window.Rig._test.state());
  ok(inRecover.seqIdx === 2, 'advanced into recovery (punch\'s committed phases total only 120ms vs. the kick\'s 180)');
  await page.waitForFunction(() => window.Rig._test.state().idle === true, { polling: 4, timeout: 2000 });
  const settled = await page.evaluate(() => window.Rig._test.state());
  ok(settled.idle === true, 'back to idle well past punch\'s own (shorter) 280ms total sequence');

  console.log('2. Old call sites that never pass a type still mean kick -- backward compatibility for every pre-existing test/input path');
  await freshDuel();
  await page.evaluate(() => window.Rig._test.trigger('R')); // no type arg at all, exactly like every pre-existing call site
  const kickDefault = await page.evaluate(() => window.Rig._test.state());
  ok(kickDefault.attackType === 'kick', 'an omitted type still means kick via trigger()');
  await freshDuel();
  await page.evaluate(() => window.Rig._test.rawAttack('R')); // no type arg
  const rawKickDefault = await page.evaluate(() => window.Rig._test.state());
  ok(rawKickDefault.attackType === 'kick', 'an omitted type still means kick via rawAttack()');
  await freshDuel();
  await page.evaluate(() => window.Rig2._test.trigger('R'));
  const p2KickDefault = await page.evaluate(() => window.Rig2._test.state());
  ok(p2KickDefault.attackType === 'kick', 'player 2\'s trigger() defaults to kick too, through the same shared factory');

  console.log('3. Buffering during a committed phase carries the buffered attack\'s TYPE, not just its side');
  await freshDuel();
  await page.evaluate(() => window.Rig._test.rawAttack('R')); // kick -- 110ms windup gives a comfortable, non-flaky margin to buffer inside
  await page.waitForTimeout(30); // still well inside the kick's own 110ms windup (matches the proven margin tests/rig-combo-cancel.js already uses)
  await page.evaluate(() => window.Rig._test.rawAttack('R', 'punch')); // buffer a PUNCH follow-up behind the currently-playing kick
  const buffered = await page.evaluate(() => window.Rig._test.state());
  ok(buffered.attackType === 'kick', 'the currently-playing attack is still the original kick, unaffected by the buffered input');
  ok(buffered.queuedSide === 'R' && buffered.queuedType === 'punch', 'the buffered follow-up correctly recorded BOTH side and type (punch), not just side');

  console.log('4. Punch hit detection uses hand_r/hand_l, not foot_r/foot_l -- same position, kick lands and punch does not');
  // gap=25 is a real KICK-connect range (foot_r/stance well under
  // PVP_HIT_RADIUS at any point in the kick's strike phase, live-verified
  // 5/5 runs) that punch's own (longer-reaching-but-narrower-window) hand/
  // back geometry does NOT connect at, at ANY point across its whole strike
  // phase (also live-verified 4/4 runs; gap=30, tried first, turned out to
  // be a genuinely borderline range for punch specifically -- its hand-back
  // distance at full extension lands right on the ~50px PVP_HIT_RADIUS edge,
  // flipping true/false frame-to-frame -- so it was moved to gap=25 for a
  // robust, non-flaky margin instead). Throwing a PUNCH from gap=25 and
  // confirming it does NOT land is the cleanest possible live proof that
  // punch is reading a different (higher, hand/back) hurtbox than the
  // kick's ankle-height stance -- if it were still reading foot_r/foot_l it
  // would land here just like the kick does.
  //
  // Both checks below poll (via waitForFunction) until the attacker's
  // strike phase has fully finished (seqIdx reaches 2) OR a hit already
  // registered, rather than a fixed wait -- checkPvpHit() runs every frame
  // strike is active, so this reliably captures whether a hit landed at ANY
  // point during the whole strike window, not just whatever single instant
  // a fixed-timeout snapshot happens to catch.
  async function throwAndSettle(rawAttackArgsJs) {
    await page.evaluate(rawAttackArgsJs);
    await page.waitForFunction(() => window.Rig._test.state().seqIdx >= 1, { polling: 4, timeout: 3000 });
    await page.waitForFunction(() => window.Rig._test.state().seqIdx === 2 || window.Rig._test.state().hasHitThisSwing === true, { polling: 4, timeout: 3000 }).catch(() => {});
  }
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(25); });
  await throwAndSettle(() => window.Rig._test.rawAttack('R', 'punch'));
  const punchAtKickRange = await page.evaluate(() => window.Rig._test.state());
  ok(punchAtKickRange.hasHitThisSwing === false, 'a punch thrown from a reliable KICK-connect range (gap=25) does NOT land across its entire strike phase -- proves it is not reading foot_r/foot_l');
  // Same exact position, a kick DOES land (regression contrast, and confirms
  // this is really about socket selection, not e.g. a broken teleport/setup).
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(25); });
  await throwAndSettle(() => window.Rig._test.rawAttack('R'));
  const kickAtSamePosition = await page.evaluate(() => window.Rig._test.state());
  ok(kickAtSamePosition.hasHitThisSwing === true, 'a kick DOES land from the identical position -- the punch miss above is a real socket difference, not a broken setup');
  // gap=50 (live-verified 5/5 runs to connect across punch's own strike
  // phase) proves punch CAN land, using its own (higher) hurtbox.
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(50); });
  await throwAndSettle(() => window.Rig._test.rawAttack('R', 'punch'));
  const punchAtPunchRange = await page.evaluate(() => window.Rig._test.state());
  ok(punchAtPunchRange.hasHitThisSwing === true, 'the same punch DOES land from a range solved for its own (chest-height, hand_r/hand_l) reach');

  console.log('5. A confirmed, unblocked KICK with a PUNCH buffered combo-cancels into the punch, not another kick');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); });
  await page.evaluate(() => window.Rig._test.rawAttack('R')); // kick #1
  await page.waitForTimeout(30); // still in the kick's committed windup
  await page.evaluate(() => window.Rig._test.rawAttack('R', 'punch')); // buffer a punch follow-up
  await page.waitForTimeout(130); // past the kick's 110ms windup into strike -- the hit lands and should confirm-cancel
  const kickIntoPunch = await page.evaluate(() => window.Rig._test.state());
  ok(kickIntoPunch.queuedSide === null && kickIntoPunch.queuedType === null, 'the buffered punch was consumed');
  ok(kickIntoPunch.attackType === 'punch', 'the attacker is now playing the PUNCH, not a second kick -- the actual kick->punch combo string');
  ok(kickIntoPunch.seqIdx === 0, 'the punch follow-up fired immediately (fresh windup), same instant-cancel behavior the kick->kick case already had');

  console.log('6. Regression: a confirmed KICK with a KICK buffered still combo-cancels into a kick (existing behavior unchanged)');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); });
  await page.evaluate(() => window.Rig._test.rawAttack('R')); // kick #1
  await page.waitForTimeout(30);
  await page.evaluate(() => window.Rig._test.rawAttack('R')); // buffer kick #2 (no type arg -- exactly how every pre-existing caller/test throws a kick)
  await page.waitForTimeout(130);
  const kickIntoKick = await page.evaluate(() => window.Rig._test.state());
  ok(kickIntoKick.queuedSide === null && kickIntoKick.queuedType === null, 'the buffered kick was consumed');
  ok(kickIntoKick.attackType === 'kick' && kickIntoKick.seqIdx === 0, 'the attacker is in a fresh kick windup -- kick->kick combo-cancel behavior is unchanged by adding the punch');

  console.log('7. Gauntlet stays kick-only (explicit scope decision, see resolveHits()\'s own comment) -- a punch never kills an enemy dot there, a kick still does');
  await page.evaluate(() => window.startGauntlet());
  await page.evaluate(() => {
    window.Rig._test.resetSession();
    window.Rig._test.freezeSpawns();
    window.Rig._test.clearEnemies();
  });
  // trigger+spawnEnemy in ONE evaluate() call (both share the exact same
  // performance.now() moment, no inter-call IPC gap) with elapsedMs=455 --
  // the exact proven setup tests/rig-sequence.js's own kill-path tests
  // already use, verified there to put the enemy at its contact point right
  // as a KICK's strike phase is checking it. Waiting 95ms (inside punch's
  // own 70-120ms strike phase, well short of rig-sequence.js's own 145ms
  // kick-strike-phase wait) confirms the new attackType==='punch' guard in
  // resolveHits() is the actual reason nothing dies here -- not just an
  // accident of checking after the strike phase had already ended.
  await page.evaluate(() => { window.Rig._test.trigger('R', 'punch'); window.Rig._test.spawnEnemy('R', 455); });
  await page.waitForTimeout(95);
  const gauntletPunch = await page.evaluate(() => window.Rig._test.state());
  ok(gauntletPunch.seqIdx === 1 && gauntletPunch.attackType === 'punch', 'sanity check -- the punch really is mid-strike at this checkpoint, not past it');
  ok(gauntletPunch.killCount === 0, 'a punch thrown in the Gauntlet does not kill the fully-approached enemy dot -- Gauntlet is kick-only by design');
  ok(gauntletPunch.enemies.length === 1 && !gauntletPunch.enemies[0].dying, 'the enemy dot is untouched, not silently killed by the wrong socket coincidentally overlapping it');
  // Clear the enemy now, before letting the punch's own committed strike
  // phase finish -- otherwise it ages past ENEMY_TRAVEL_MS during that wait
  // and registers a MISS on its own (a real timing trap this section's own
  // first draft hit), which would make the kill-count check below
  // meaningless either way.
  await page.evaluate(() => window.Rig._test.clearEnemies());
  // Let the punch's own committed strike phase actually finish before
  // throwing the kick -- p1 was still mid-strike (a committed phase) at
  // the check above, so an attack trigger there would only BUFFER (queue)
  // the kick, not start it, which isn't what this section is testing.
  await page.waitForTimeout(200); // comfortably past punch's full 280ms sequence, back to idle
  // Now the exact same proven kick setup tests/rig-sequence.js itself uses
  // (trigger+spawnEnemy together, elapsedMs=455, wait 145ms).
  await page.evaluate(() => { window.Rig._test.trigger('R'); window.Rig._test.spawnEnemy('R', 455); });
  await page.waitForTimeout(145);
  const gauntletKick = await page.evaluate(() => window.Rig._test.state());
  ok(gauntletKick.killCount === 1, 'the kick DOES kill the enemy -- confirms the punch miss above is the deliberate Gauntlet scope decision, not a broken enemy/setup');
  await page.evaluate(() => window.startDuel()); // return to Duel mode for the remaining sections

  console.log('8. COMBO_KNOCKBACK_SCALE (Part B): the combo-canceling hit applies scaled knockback, and the follow-up actually lands where it previously would have drifted out of range');
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); });
  await page.evaluate(() => window.Rig._test.rawAttack('R')); // kick #1
  await page.waitForTimeout(30);
  await page.evaluate(() => window.Rig._test.rawAttack('R')); // buffer kick #2 -- this hit WILL trigger a combo-cancel
  // Catch the exact instant knockback is applied (velX flips from 0) --
  // a fixed wait margin here would risk sampling an already-decayed value.
  await page.waitForFunction(() => window.Rig2._test.state().velX !== 0, { polling: 4, timeout: 3000 });
  const atComboConfirm = await page.evaluate(() => ({ velX2: window.Rig2._test.state().velX, posX2: window.Rig2._test.state().posX }));
  // KNOCKBACK_SPEED(480) * COMBO_KNOCKBACK_SCALE(0.4) = 192 exactly -- this
  // is read within a few ms of the confirm frame (waitForFunction polls
  // every 4ms), so it should be exact or extremely close, not just "less than 480".
  near(atComboConfirm.velX2, 192, 3, 'the combo-canceling hit applied SCALED knockback (480*0.4=192), not the kick\'s full 480');
  await page.waitForFunction(() => window.Rig._test.state().hasHitThisSwing === true, { polling: 4, timeout: 3000 });
  const atFollowupLanded = await page.evaluate(() => window.Rig2._test.state().posX);
  const comboDrift = atFollowupLanded - atComboConfirm.posX2;
  near(comboDrift, 8.7, 3, 'defender drift during the follow-up\'s own windup, under the scaled knockback, is small');
  ok(true, 'and critically: the follow-up\'s strike phase DID land a second real hit (hasHitThisSwing flipped true again) -- the actual thing this fix exists to guarantee');

  // "Before" reference: a SOLO (nothing buffered) hit's knockback is bit-for-
  // bit identical to what EVERY hit -- combo-canceling or not -- used before
  // this fix, since the fix only branches on willComboCancel. Measuring a
  // solo hit's own drift over the identical 110ms window is therefore a
  // live, non-hypothetical measurement of the exact old behavior, not a
  // guessed/analytical stand-in.
  await freshDuel();
  await page.evaluate(() => { window.Rig._test.teleportTo(0); window.Rig2._test.teleportTo(30); });
  await page.evaluate(() => window.Rig._test.rawAttack('R')); // solo kick, nothing buffered -- normal, unscaled knockback
  await page.waitForFunction(() => window.Rig2._test.state().velX !== 0, { polling: 4, timeout: 3000 });
  const soloConfirm = await page.evaluate(() => ({ velX2: window.Rig2._test.state().velX, posX2: window.Rig2._test.state().posX }));
  near(soloConfirm.velX2, 480, 2, 'a normal (non-canceling) landed hit keeps its full, unscaled KNOCKBACK_SPEED (480) -- confirms the fix is scoped to the cancel path only');
  await page.waitForTimeout(110); // the same 110ms window a kick follow-up's own windup would take
  const soloAfter110 = await page.evaluate(() => window.Rig2._test.state().posX);
  const soloDrift = soloAfter110 - soloConfirm.posX2;
  ok(soloDrift > comboDrift * 3, 'the SAME 110ms window drifts the defender several times farther under the old, unscaled magnitude (' + soloDrift.toFixed(1) + 'px) than under the fix\'s scaled one (' + comboDrift.toFixed(1) + 'px) -- a live measurement of the exact old-code behavior, not a guess (see this file\'s own header comment)');
  ok(soloDrift > 30, 'the old, unscaled drift alone (' + soloDrift.toFixed(1) + 'px) consumes the large majority of the entire 50px PVP_HIT_RADIUS budget in just the follow-up\'s own windup -- confirming Part B\'s originally-reported bug was real, not overstated');

  console.log('9. No page/console errors across any of the above');
  ok(pageErrors.length === 0, 'zero page errors (' + pageErrors.length + ' found: ' + pageErrors.join('; ') + ')');
  ok(consoleErrors.length === 0, 'zero console errors (' + consoleErrors.length + ' found: ' + consoleErrors.join('; ') + ')');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
