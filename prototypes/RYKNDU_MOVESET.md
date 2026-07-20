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
| `strike` | automatic from `windup` after 110ms | automatic → `recover` after 70ms | **committed**, same as `windup`. Hit resolution (`resolveHits()`) runs only here, checked every frame this phase is active, reading the attack-side foot socket |
| `recover` | automatic from `strike` after 70ms | automatic → `idle` after 220ms, **or** immediately → `windup` if an input was buffered during the committed phases, **or** immediately → `idle`+`guard` if a guard input arrives here | **interruptible** — a new attack trigger cancels recovery and starts immediately (not buffered); a guard input cancels recovery into `guard` |
| `guard` | guard input from `idle` or from the interruptible `recover` phase | guard-release input → `idle` | attack triggers are refused outright — must release guard first. Cannot be entered from `windup`/`strike` (refused, no state change). Cannot be entered while `jumping` |
| `jumping` | jump input from `idle` or `recover` (not `windup`/`strike`, not while `guard`ing) | automatic once integrated height returns to 0 (real gravity, not a timer — see Physics below) | attack and guard inputs are both refused while airborne — no aerial actions in this pass |
| `flinch` | a miss event (enemy reaches melee range unanswered), but **only visually applied while the idle branch is being evaluated** | 180ms timer, or superseded the instant the idle branch isn't reached (mid-attack) | not a real state in the transition sense — see caveat below |

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

## Physics (v0.1.17–v0.1.19 — movement, jump, and recovery momentum)

Added after producer feedback traced "tapping just gives a knee jerk"
back to its actual cause: nothing in this rig had velocity, mass, or
momentum before this — every motion was pose-A-to-pose-B interpolation
on a fixed clock. Three real (not merely re-skinned) physics systems now
exist, all reusable from a single rig instance (both `p1`/`p2` share
`createRigController()`), though only player 1 is wired to input as of
v0.1.19:

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

None of these three are combat-facing yet (no rig-vs-rig hit detection
exists), and none change anything in the state table above — they're
additive physics layered under the existing state machine, verified in
`tests/rig-sequence.js` §§13–17 and `tests/rig-touch-controls.js`.

## What each phase means for future combat design (deferred, not designed here)

This table is the seam combo-cancel points and parry windows get named
against later — it's written now so that conversation has something
concrete to point at, not because those systems are designed in this
pass:

- **Combo-cancel candidate points:** the existing "buffered input fires
  immediately at recovery start" behavior is already a cancel window in
  everything but name. A combo system extends this — e.g. a second attack
  type that can cancel `strike` itself (not just `recover`) into a new
  `windup` on a landed hit. Not built; the seam is `isCommittedPhase()`
  and the `queuedSide` buffer, both already isolated enough to extend.
- **Parry candidate point:** would need a new narrow-timing check against
  an *opponent's* `strike` phase (this rig has no opponent yet — see the
  2-player extension). The rig's own phase timing is already precise
  enough for this (v0.1.6 fixed the strike-phase hit-window down to the
  frame), so the missing piece is an incoming-attack read, not rig timing
  precision.
- **Guard timer/meter:** `guard` currently has no duration limit or
  resource cost — it's free for as long as the input is held. A meter
  would gate `setGuard(true)`'s success (already a single choke point) or
  force an exit from within the main loop's per-frame tick, not require
  restructuring the state machine itself.

## Verification

Every transition and refusal rule in the table above has a corresponding
assertion in `tests/rig-sequence.js` (§§2–4 for the attack committed/
interruptible rules, §12 for guard's three gating rules, §§13–17 for
movement/jump/recovery-momentum physics and their mutual-exclusion gates)
plus `tests/rig-touch-controls.js` (the same physics driven through the
real virtual joystick and action buttons, not a shortcut) — this table
was written by reading the code these tests already exercise, then
confirmed against the tests' own pass/fail output, not the reverse.
