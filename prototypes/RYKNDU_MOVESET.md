# Rykndu Rig — Move-Set / State Table (consolidation §5, locked v0.1.10)

**Status: locked, verified against actual code** (`prototypes/rykndu-doll-rig.html`),
not a design aspiration. Builds on `RYKNDU_RIG_SCHEMA.md` (joints/sockets).
Written explicitly because the consolidation doc's own rationale for this
section is real: left implicit in code, this can't be reviewed as a whole
or handed to `qa-playtest`/combat design — only discovered piece by piece
as bugs surface, the way three real bugs already were before this table
existed (the v0.1.1 crash, the v0.1.2 mirror-drift, the v0.1.3 attack-model
restructure).

## States

| State | Entered from | Exit | Player input during it |
|---|---|---|---|
| `idle` | `recover` phase ends with no buffered input; `guard` released | any attack trigger → `windup`; guard input → `guard` | attack triggers windup; guard input raises guard |
| `windup` | attack trigger from `idle` or `recover` | automatic → `strike` after 110ms | **committed** — a same/other attack input buffers (`queuedSide`), does not interrupt; guard input is refused |
| `strike` | automatic from `windup` after 110ms | automatic → `recover` after 70ms | **committed**, same as `windup`. Hit resolution runs only here, checked every frame this phase is active, reading the attack-side foot socket — against the enemy-dot array (`resolveHits()`, single-player) and, as of v0.1.21, against the other player's rig too (`resolveDuelHit()`/`resolveCombatHits()`, see the Combat section below) |
| `recover` | automatic from `strike` after 70ms | automatic → `idle` after 220ms, **or** immediately → `windup` if an input was buffered during the committed phases, **or** immediately → `idle`+`guard` if a guard input arrives here | **interruptible** — a new attack trigger cancels recovery and starts immediately (not buffered); a guard input cancels recovery into `guard` |
| `guard` | guard input from `idle` or from the interruptible `recover` phase | guard-release input → `idle` | attack triggers are refused outright — must release guard first. Cannot be entered from `windup`/`strike` (refused, no state change). Cannot be entered while `jumping` |
| `jumping` | jump input from `idle` or `recover` (not `windup`/`strike`, not while `guard`ing) | automatic once integrated height returns to 0 (real gravity, not a timer — see Physics below) | attack and guard inputs are both refused while airborne — no aerial actions in this pass |
| `flinch` | a miss event (enemy reaches melee range unanswered) **or**, as of v0.1.21, a landed rig-vs-rig hit that wasn't blocked — either way **only visually applied while the idle branch is being evaluated** | 180ms timer, or superseded the instant the idle branch isn't reached (mid-attack) | not a real state in the transition sense — see caveat below |

## The `flinch` caveat — named honestly, not smoothed over

`flinch` is not a state in the same sense as the five above: it's a
cosmetic pose overlay applied only inside `currentPose()`'s `idle`
branch (`if (!seq)`), blended on top of the idle pose for 180ms after a
miss. If the player is still mid-attack (or now, mid-guard) when a miss
lands, the flinch window can fully elapse before the rig ever returns to
the idle branch, and the reaction **silently does not show** for that
miss — an accepted tradeoff from v0.1.8, not a bug, made explicitly to
avoid touching the attack state machine's committed-phase guarantee. This
table names it as a caveat rather than listing it as a full state, since
treating it as one would overstate what the code actually guarantees.

## Transition diagram

```
        attack trigger                  automatic (110ms)      automatic (70ms)
  idle ──────────────────► windup ─────────────────────► strike ─────────────► recover
   ▲                     (committed)                   (committed,           (interruptible)
   │                                                     resolveHits()          │    │
   │ guard release                                       runs here)             │    │
   │                                                                            │    │
   └──────────── guard ◄── guard input (idle or recover only) ─────────────────┘    │
                                                                                      │
                    automatic (220ms, no buffered input) ───────────────────────────►┘
                                                                                    idle
                    buffered attack input present ──────────────────────────────► windup
                                                                                 (immediate)
```

## Physics (v0.1.17–v0.1.20 — movement, jump, and recovery momentum)

Added after producer feedback traced "tapping just gives a knee jerk"
back to its actual cause: nothing in this rig had velocity, mass, or
momentum before this — every motion was pose-A-to-pose-B interpolation
on a fixed clock. Three real (not merely re-skinned) physics systems now
exist, all reusable from a single rig instance (both `p1`/`p2` share
`createRigController()`). As of v0.1.20 both players are wired to input —
player 2 was given the same physics and a matching facing-based control
scheme (see `RYKNDU_2PLAYER.md`), closing the gap left when v0.1.19
shipped this pass for player 1 only:

- **Movement**: `moveIntent` (-1..1, a direction, set once per frame by
  the input layer — keyboard held-key state, gamepad stick axis, or the
  touch joystick's drag offset, whichever is active) drives a real `velX`
  that accelerates toward the intended speed (`MOVE_ACCEL`) and decays via
  friction on release (`MOVE_FRICTION`, deliberately higher than
  `MOVE_ACCEL` so stopping reads snappier than starting). `posX` integrates
  from `velX` every frame and is fed into `solveRig()` as the rig's stand
  offset. `facing` tracks actual velocity direction (with a small-speed
  threshold so friction noise near 0 can't flip it) — attack throws
  whichever kick matches current `facing`, not an explicit side.
  Movement intent is forced to 0 during a committed attack phase (no
  sliding the whole body mid-kick), decelerating into it via the same
  friction rather than freezing dead.
- **Jump**: real integrated projectile motion — a takeoff velocity
  (`JUMP_SPEED`) and a constant downward `GRAVITY` applied every frame,
  height integrated from velocity, landing detected when integrated
  height returns to 0 (not a fixed timer). Mutually exclusive with
  attack/guard in both directions (see the state table above).
- **Recovery momentum**: the `recover` phase's pose is a closed-form
  critically-damped-spring solution — `x(t) = (x0 + (v0+ω·x0)·t)·e^(-ω·t)`
  — seeded with the strike phase's own real exit velocity (its actual pose
  delta over its actual duration, captured once in `updateSeq()` when
  recovery begins), not another hand-tuned easing curve. Kept as a
  stateless closed-form function (not frame-by-frame integration)
  specifically so the fixed-duration phase-transition timing and
  buffered-input contract above didn't need to change — only the pose
  formula inside that unchanged window did.

## Walk cycle (v0.1.27 — a feel gap, not a physics gap)

Movement physics existed since v0.1.17, but `currentPose()`'s idle
branch rendered identically whether the rig was standing still or
sliding across the ground at full speed — no leg swing, no knee lift, no
arm counter-swing, no stride bounce. Real movement without any
animation to show it read as a statue on rails, a real gap this section
names honestly (found by comparing an idle screenshot to a mid-movement
one directly, not assumed from the code).

`walkPhase` (per rig, alongside `posX`/`velX`) advances in
`updateMovement(dt)` by real ground DISTANCE covered that frame
(`velX * dt`, converted to radians via `WALK_STRIDE_LENGTH` px per full
cycle) — not raw elapsed time. This is deliberate: a fixed-tempo walk
animation would visibly skate the feet at any speed other than the one
it was tuned for, the same "real physics, not a canned curve" standard
`recover`'s damped-spring pose above already holds itself to. `walkBlend`
(0 at rest, 1 at `WALK_BLEND_FULL_SPEED`) fades the cycle in smoothly
with speed — a standing rig still just breathes, a moving one gains leg
swing, per-leg knee lift (each leg lifts only during its own
forward-swing half of the cycle), a contralateral opposite-arm
counter-swing, and a stride bounce, without popping straight to full
amplitude the instant velocity leaves zero. `guard`/`jump`/attack poses
are unaffected — they already return before `currentPose()` reaches the
idle branch this lives in.

These three physics systems weren't combat-facing when this section was
first written (no rig-vs-rig hit detection existed yet), and they still
don't change anything in the state table above — they're additive physics
layered under the existing state machine, verified in
`tests/rig-sequence.js` §§13–17, `tests/rig-touch-controls.js`, and (for
player 2's parity) `tests/rig-2player.js`. Combat resolution (below) is
what actually made them combat-facing.

## Combat resolution (v0.1.21 — the actual "Overreach" core mechanic)

Added directly on top of the physics above, once both rigs had real,
independent movement to close distance with. `checkPvpHit()` and
`resolveDuelHit()` are ONE shared pairwise function, called twice per
frame with attacker/defender swapped (`resolveCombatHits()`) — not two
hand-copied blocks, the same principle behind `createRigController()`
itself (and, since v0.1.28, `solveRig()`'s own facing-based mirror,
which replaced the old per-pose `mirror()` function this comment used to
point to — see `RYKNDU_RIG_SCHEMA.md`'s Mirroring section). Verified by
actually driving both directions in `tests/rig-combat.js`, not assumed
symmetric from reading the code.

- **Hit detection**: only checked during the attacker's `strike` phase
  (`seqIdx === 1`), against the defender's `stance` socket (feet
  midpoint, ankle height) — not `hip`/pelvis, since a kick's strike pose
  is solved to land at the old enemy-dot's height (`kick_strike`'s own
  comment), roughly 80px below the pelvis. Using `hip` initially missed
  every hit in testing by that same ~80px until caught live and fixed;
  see `RYKNDU_RIG_SCHEMA.md`'s note on the new `stance` socket. Also
  requires the attacker's `attackSide` to actually face the defender
  (kicking away from your opponent can't land), and one hit per swing
  (`hasHitThisSwing`, reset at the start of every attack) so lingering in
  range for the rest of a multi-frame strike phase can't double-count.
- **Knockback**: a landed, unblocked hit sets the defender's `velX`
  directly to a real impulse (`KNOCKBACK_SPEED = 480`px/sec — well above
  the 220px/sec top *walking* speed, so a hit is unmistakably more
  forceful than movement itself) and interrupts whatever the defender was
  doing (attack/guard/jump), the same way a fresh attack already
  interrupts a recovery tail. The impulse decays via the exact same
  `MOVE_FRICTION` real movement uses, during a short lock window
  (`KNOCKBACK_LOCK_MS = 260`, tuned to just outlast the time a full-speed
  impulse takes to decay under that friction) where the normal
  arena-wall clamp is suspended — see the ring-out note below for why
  that suspension matters.
- **Guard mitigation**: a hit landing on a guarding defender still applies
  knockback, just scaled down to `GUARD_CHIP_SCALE = 0.2` (20%), and does
  NOT interrupt guard or trigger the flinch reaction — guard is a real
  mitigation tool, not a free no-sell wall.
- **Hit reaction**: a landed, unblocked hit triggers the same flinch
  overlay the single-player mode's miss reaction already used
  (`POSES.flinch`, blended in `currentPose()`'s idle branch) — this moved
  from a player-1-only external hook (`opts.idleOverlay`) into
  `createRigController()` itself so either rig can flinch from either
  cause through one mechanism, not two.

## Ring-out (v0.1.21 — scores a point toward the match)

`ARENA_BOUND` (170) is the same wall voluntary movement already clamps
against in `updateMovement()` — walking can never cross it. Knockback is
the only thing that ignores that clamp (see above), so crossing
`ARENA_BOUND` can only ever happen from a landed hit, never from a player
just walking there. `checkRingOuts()` checks both rigs' `posX` against it
every frame; whichever rig is over the line concedes a point to the other
player, and both rigs fully reset (`reset()`, not just position) back to
their duel spawn points.

## Match structure (v0.1.23 — the duel's actual win condition)

A running score alone was never a finished match — nothing stopped it at
any number, and there was no result to show. `MATCH_TARGET_SCORE` (3)
gives ring-outs an actual endpoint:

- **Match end**: the instant either player's score reaches
  `MATCH_TARGET_SCORE`, `matchOver` is set true and `matchWinner` records
  `'P1'`/`'P2'`. `resolveCombatHits()` and `checkRingOuts()` both refuse
  to run once `matchOver` — a decided match can't keep silently
  accumulating score from combat that shouldn't matter anymore.
- **Freeze**: `matchOver` gates the exact same per-frame calls
  `sessionState === 'lose'` already gates for player 1's single-player
  session (`applyMoveInput`/`updateSeq` for player 1,
  `applyP2MoveInput`/`p2.updateSeq` for player 2) — both rigs hold at
  whatever pose they were in, under the result overlay, the same
  established "freeze, don't keep animating" precedent from v0.1.8's
  GAME OVER screen.
- **Result overlay**: a canvas-drawn card (same treatment as the
  single-player GAME OVER card) reading `"<WINNER> WINS THE MATCH"` in
  the winning rig's own color (`P1_COLOR`/`P2_COLOR`), the final score,
  and a rematch prompt.
- **Rematch**: `tryRematch()` is checked first in every real attack-input
  entry point for BOTH players — `handleInput()` for player 1 (keyboard/
  touch/gamepad/test-hook all already funnel through it) and the new
  `handleP2Input()` for player 2 (keydown `F`, gamepad, test-hook). Either
  player's next attack input calls `resetMatch()` (scores AND `matchOver`
  both clear, not just positions) and consumes that input — it does not
  also throw the kick that triggered it.

## Guard meter (v0.1.24 — guard has a real resource cost)

Guard was previously free for as long as the input was held — no
duration limit, no cost. `GUARD_METER_MAX`/`GUARD_DRAIN_PER_SEC`/
`GUARD_REGEN_PER_SEC` are real elapsed-time constants (not per-frame
magic numbers), integrated in `updateGuardMeter(dt)` and called from
`updatePhysics(dt)` alongside movement/jump/recovery — the same standard
every other timed system in this rig already holds itself to:

- **Drain/regen**: continuous blocking drains the meter (`40`/sec — a
  full meter lasts 2.5s of continuous guard); releasing regenerates it
  slower (`25`/sec — full regen takes 4s), the same "stopping costs more
  than starting" shape `MOVE_FRICTION > MOVE_ACCEL` already uses for
  movement, so turtling has a real cost.
- **Forced drop**: the meter hitting zero drops guard immediately
  (`guarding = false` inside `updateGuardMeter()` itself), not just a
  refusal on the next raise attempt.
- **Re-raise gate**: `setGuard(true)` also refuses below
  `GUARD_MIN_TO_RAISE` (15) — guard can't be re-raised the instant it
  empties; a little recovery is required first.
- **Block-hit cost**: a landed, BLOCKED hit costs a flat
  `GUARD_BLOCK_HIT_DRAIN` (20, a fifth of the whole meter) via
  `damageGuardMeter()`, called from `resolveDuelHit()` — on top of the
  continuous drain from just holding guard. Guard mitigates knockback
  (see Combat resolution above) but isn't free either way.
- **Visible**: a small world-space bar above each rig's own head
  (`drawGuardMeter()`, scaled by the same `renderScale` everything else
  uses) shows the meter, reading amber under 25% as a real warning rather
  than just a smaller bar in the rig's own color.

## Parry (v0.1.25 — the precision-timing reward guard never had)

Guard got a real resource cost in v0.1.24, but no reward yet for
*reading* an attack and blocking at the right instant versus just
holding guard defensively. `PARRY_WINDOW_MS` (120ms) closes that:

- **The window is tied to the RAISE, not to holding guard.**
  `guardRaisedAt` (inside `createRigController()`) only stamps
  `performance.now()` on the false→true transition of `guarding` — never
  on any frame guard merely stays held. `isInParryWindow()` is
  `guarding && (now - guardRaisedAt) < PARRY_WINDOW_MS`. This is
  deliberate: a parry is supposed to reward anticipating when an attack
  starts, not something a player gets for free by holding block from
  well before the swing even began.
- **A parry is a full negation, not a better block.** `resolveDuelHit()`
  checks `defender.isInParryWindow()` before its existing block logic —
  on a parry, the defender takes zero knockback and zero guard-meter
  cost (skips `applyKnockback()`/`damageGuardMeter()` entirely), a
  distinct `parryChime()` SFX voice plays, and the ATTACKER is knocked
  back and interrupted instead (`attacker.applyKnockback(-dir *
  KNOCKBACK_SPEED, false)` — the same real punish a landed hit already
  deals to a defender, just pointed the other way). Still one shared,
  both-directions function; the parry branch is a fork inside it, not a
  second copy.
- **A missed parry timing-wise still blocks normally.** Once
  `PARRY_WINDOW_MS` elapses, an incoming hit against a still-guarding
  rig falls through to the existing chip-knockback/guard-meter-cost
  logic unchanged — guard itself didn't get worse, parry only added a
  narrow bonus window on top of it.

## Combo-cancel (v0.1.26 — a confirmed hit rewards a faster follow-up)

The last item on this doc's own former "still deferred" list. The
existing "buffered input fires immediately at recovery start" behavior
was already a cancel window in everything but name; `cancelIntoBufferedAttack()`
extends it to fire on a CONFIRMED hit instead of waiting for the
sequence to finish on its own:

- **Trigger**: called from `resolveDuelHit()`'s existing blocked/
  unblocked split — only on the unblocked (clean connect) branch, not on
  a block or a parry. A blocked hit still costs guard meter as before
  and does not cancel; a parried hit fully interrupts the attacker via
  `applyKnockback()`'s existing unblocked branch (clearing any buffer as
  part of that same interrupt), which was already true for any landed
  hit against a rig — the parry branch doesn't add a new rule here, it
  was just confirmed rather than assumed (see `tests/rig-combo-cancel.js`
  §4).
- **Effect**: if the attacker already buffered a follow-up (`queuedSide`,
  set by `triggerAttack()` during their own committed windup/strike —
  unchanged, pre-existing behavior), the confirmed hit immediately clears
  it and calls `startAttack()` for that follow-up — skipping the rest of
  the current strike and the entire 220ms recovery tail. With nothing
  buffered, it's a no-op and the sequence continues exactly as it always
  did (windup → strike → recovery → idle).
- **Scope**: this is the seam `isCommittedPhase()`/`queuedSide` were
  always isolated enough to extend, and it only rewards a single
  attack type re-fired against itself (this rig still only has one kick
  per side) — a genuinely new second attack type that cancels differently
  is a further, separate extension, not built here.

## Verification

Every transition and refusal rule in the table above has a corresponding
assertion in `tests/rig-sequence.js` (§§2–4 for the attack committed/
interruptible rules, §12 for guard's three gating rules, §§13–17 for
movement/jump/recovery-momentum physics and their mutual-exclusion gates)
plus `tests/rig-touch-controls.js` (the same physics driven through the
real virtual joystick and action buttons, not a shortcut) — this table
was written by reading the code these tests already exercise, then
confirmed against the tests' own pass/fail output, not the reverse.
Combat resolution and ring-out are covered by `tests/rig-combat.js` —
including driving BOTH attack directions (not just p1-attacks-p2), the
guard-mitigation scale, the one-hit-per-swing guard, and a full ring-out
scoring/reset cycle. The match structure itself is covered by
`tests/rig-match.js` — score accumulation short of the target, the
freeze on reaching it, a decided match blocking further combat
resolution, a rematch from either player's input, and a clean second
match afterward. The guard meter itself is covered by
`tests/rig-guard-meter.js` — real elapsed-time drain/regen rates, the
forced drop at zero, the re-raise refusal below the minimum threshold,
the flat cost from a blocked hit, `reset()` restoring a full meter, and
player 2 sharing the exact same behavior through the same factory. Parry
is covered by `tests/rig-parry.js` — a hit landing inside the window
(full negation, attacker punished), one landing outside it (ordinary
block), a re-raise opening a genuinely fresh window, and both attack
directions. Combo-cancel is covered by `tests/rig-combo-cancel.js` — a
confirmed hit with a buffer firing the follow-up immediately, one with no
buffer behaving exactly as before, a blocked hit NOT canceling, a parried
hit fully interrupting the attacker (buffer cleared, not preserved), and
both attack directions. The walk cycle is covered by
`tests/rig-walk-cycle.js` — real leg swing/knee lift away from the static
resting pose, a genuine oscillation (not a one-way drift) as the phase
advances, cadence tracking distance rather than raw time, guard fully
suppressing the cycle even while still moving underneath, `reset()`
zeroing the phase, and both players sharing the same behavior.
