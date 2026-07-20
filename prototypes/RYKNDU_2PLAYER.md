# Rykndu Rig — 2-Player Extension (v0.1.11, physics parity v0.1.20, combat resolution v0.1.21)

**Status: substrate, physics, AND core combat resolution all landed.**
This covers what the 2-player extension actually built — two independent,
simultaneously rendered/animated rigs, each with its own input, real
shared physics, and now real rig-vs-rig hit detection/knockback/ring-out
(see `RYKNDU_MOVESET.md`'s Combat resolution section for the mechanics) —
and draws a hard line around what still deliberately isn't covered:
combo/parry/guard-timer numeric design remain separate future work, but
"rig-vs-rig combat resolution" itself is no longer on that list.

## What exists now

- **Two genuinely independent rig instances** (`p1`, `p2`), both produced
  by the same `createRigController()` factory (see the v0.1.11 changelog
  entry for why this replaced an earlier plan to hand-write a second copy
  of the state machine). Triggering an attack or guard on one has zero
  effect on the other — verified in `tests/rig-2player.js`, not just
  asserted.
- **Player 1** keeps everything from v0.1.0–v0.1.10 unchanged: the
  enemy-dot single-player mode, session/lives/game-over,
  `window.Rig._test` for introspection. Renders cyan (`#3fd0ff`).
  Movement/jump/guard/attack all route through the v0.1.17–v0.1.19
  physics pass described in `RYKNDU_MOVESET.md`.
- **Player 2 now shares that exact same physics** (v0.1.20) — real
  `velX`-based movement with acceleration/friction, gravity-driven jump,
  and closed-form recovery momentum — through the same
  `createRigController()` factory instance both rigs are built from, not
  a second hand-copied implementation. Each rig has its own **duel spawn
  point**: player 1 at `posX = -80` (left side, facing right), player 2
  at `posX = +80` (right side, facing left), replacing the old fixed
  render-only `P2_STAND_OFFSET` offset with a real, independently movable
  position. Player 2 renders indigo-violet (`#6b4dff`), checked against
  this studio's reserved gold/red/green color-language bands
  (`STUDIO_BIBLE.md` §11). `window.Rig2._test` mirrors player 1's test
  hook shape exactly — including `posX`/`velX`/`facing`/`jumping`/`velY`/
  `recoverExitVel`/`recoverEnterPose` and `setMoveIntent`/`updatePhysics`/
  `stepPhysics`/`jump` — minus the enemy/session/audio fields, which
  don't apply to it.
- **Player 2's input scheme now matches player 1's facing-based model**
  instead of the old explicit-side two-kick-button layout (`A`=kick-left,
  `D`=kick-right). As of v0.1.20: `A`/`D` move left/right (held), `W`
  jumps, `S` (hold) guards, `F` attacks — throwing whichever kick matches
  player 2's current `facing`, the same way player 1's attack button
  does.
- **Generic Gamepad API support** for both players through one shared
  `pollPlayerPad(padIndex, rig, onAttack, guardGate)` function (v0.1.20;
  replaces the earlier per-player `pollP1Pad()`/`pollOnePad()` pair) —
  plain button indices (`BTN_ATTACK = 0`, `BTN_JUMP = 3`, `BTN_GUARD = 4`),
  not hardcoded to any specific controller's labeled buttons, so
  standard-mapped devices work generically — most USB arcade sticks
  enumerate this way. A genuinely non-standard-mapped device may still
  land buttons somewhere unexpected; a remap screen would fix that and is
  explicitly not built here.
- **Fixed pad-to-player assignment**, decided once at first
  `gamepadconnected` (connection order: first pad → player 1, second →
  player 2) and never re-evaluated per frame. This is a deliberate
  departure from the existing shipped pattern in `wardfall.html`/
  `infall.html`/`iridescentcosmology.html` (single-pad, "last active pad
  wins" / first-found-only) — that pattern is actively wrong here, since
  both players' pads are live simultaneously and "last one to produce
  input wins" would silently steal control from whichever player didn't
  press something that frame. Each player's keyboard binding stays live
  in parallel regardless of whether a pad is also assigned to them — a
  gamepad connecting adds an input source, it doesn't take one away.
- **Rising-edge kick detection, level-triggered guard.** The Gamepad API
  has no press-event model, only a per-frame snapshot — the studio's own
  named risk for this API (a naive read either misses inputs or
  double-fires them). Kicks are edge-detected against the previous
  frame's `.pressed` state per pad; guard reads `.pressed` directly every
  frame, matching the keyboard guard's hold semantics.

## What this deliberately does not cover yet

- **No guard timer/meter, no parry.** `setGuard()` is free for as long as
  the input is held, on both rigs, with no resource cost and no
  precision-timing reward. Confirmed feasible (see the Game 5 rig
  consolidation plan's feasibility notes on the existing phase model
  already being cancel-window-shaped), not designed here.
- **No combo system.** Each rig's attack sequence is still exactly the
  single kick from v0.1.0 (windup → strike → recover); nothing chains,
  and a landed hit can't cancel `strike` itself into a follow-up.
- **No join screen.** Pad assignment is silent and automatic (connection
  order), not a "press any button to join" ceremony with on-screen
  confirmation. The underlying assignment rule is real and tested; the UI
  around it is not built.
- **No round/match structure beyond a running score.** Rig-vs-rig hit
  detection, knockback, and ring-out ARE built (v0.1.21 — see
  `RYKNDU_MOVESET.md`'s Combat resolution section), and a ring-out
  increments a running `p1Score`/`p2Score` and resets positions. What's
  still missing is anything ABOVE that single running tally — a
  best-of-N stock/round structure, a match-over screen, a rematch/reset
  flow. The core loop this game needed is real; the meta-structure around
  a full match is not.

## Verification

`tests/rig-2player.js` covers: both rigs starting independent and idle;
each rig's own duel spawn point (`posX === -80`/`+80`) and the resulting
on-screen separation (160px, exact, not approximate); triggering an
attack/guard on one leaving the other's state completely unaffected;
player 2's own committed/interruptible-phase gating (the same three rules
`tests/rig-sequence.js` §12 verifies for player 1); the
gamepad-assignment algorithm via `window.Rig2._test.simulateGamepadConnect()`
(connection order, slot exhaustion, disconnect clearing a slot) — real
hardware can't be driven from Playwright, so this calls the exact same
`assignPad()` function a real `gamepadconnected` event would, not a
separate test-only copy of the rule. Plus a screenshot showing both rigs
rendered simultaneously in independent poses (idle vs. mid-kick), at
distinguishable colors.

`tests/rig-combat.js` covers rig-vs-rig combat resolution specifically —
hit detection in both attack directions, knockback magnitude, guard's
chip-mitigation scale and guard-doesn't-break behavior, one-hit-per-swing,
and a full ring-out scoring/reset cycle. See `RYKNDU_MOVESET.md`'s Combat
resolution section for the mechanics themselves.
