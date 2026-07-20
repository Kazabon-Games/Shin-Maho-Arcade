# Rykndu Rig — 2-Player Extension (v0.1.11)

**Status: substrate landed, combat not designed.** This covers what the
2-player extension actually built — two independent, simultaneously
rendered/animated rigs, each with its own input — and draws a hard line
around what it deliberately does not cover, per this consolidation pass's
own scope (see `RYKNDU_RIG_CONSOLIDATION.md` and the Game 5 rig
consolidation plan): combo/parry/guard-timer numeric design, and any real
rig-vs-rig combat resolution, are separate future work.

## What exists now

- **Two genuinely independent rig instances** (`p1`, `p2`), both produced
  by the same `createRigController()` factory (see the v0.1.11 changelog
  entry for why this replaced an earlier plan to hand-write a second copy
  of the state machine). Triggering an attack or guard on one has zero
  effect on the other — verified in `tests/rig-2player.js`, not just
  asserted.
- **Player 1** keeps everything from v0.1.0–v0.1.10 unchanged: the
  enemy-dot single-player mode, session/lives/game-over, arrows for kick,
  `ArrowDown` for guard, `window.Rig._test` for introspection. Renders
  cyan (`#3fd0ff`).
- **Player 2** renders at a fixed screen offset (`P2_STAND_OFFSET = 130`px
  from center), indigo-violet (`#6b4dff`), both colors checked against
  this studio's reserved gold/red/green color-language bands
  (`STUDIO_BIBLE.md` §11). Player 2 has its own `window.Rig2._test` hook
  mirroring player 1's shape (minus the enemy/session/audio fields, which
  don't apply to it). Keyboard: `A`/`D` kick left/right, `S` (hold) guards.
- **Generic Gamepad API support** for both players: plain button indices
  (`BTN_KICK_L = 2`, `BTN_KICK_R = 1`, `BTN_GUARD = 4`), not hardcoded to
  any specific controller's labeled buttons, so standard-mapped devices
  work generically — most USB arcade sticks enumerate this way. A
  genuinely non-standard-mapped device may still land buttons somewhere
  unexpected; a remap screen would fix that and is explicitly not built
  here.
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

- **No rig-vs-rig hit detection.** Player 1's `resolveHits()` only ever
  checks against the enemy-dot array; player 2 isn't in it, and nothing
  checks player 2's kicks against player 1 (or vice versa). There is no
  hurtbox on either rig yet.
- **No guard timer/meter, no parry.** `setGuard()` is free for as long as
  the input is held, on both rigs, with no resource cost and no
  precision-timing reward. Confirmed feasible (see the Game 5 rig
  consolidation plan's feasibility notes on the existing phase model
  already being cancel-window-shaped), not designed here.
- **No combo system.** Each rig's attack sequence is still exactly the
  single kick from v0.1.0 (windup → strike → recover); nothing chains.
- **No join screen.** Pad assignment is silent and automatic (connection
  order), not a "press any button to join" ceremony with on-screen
  confirmation. The underlying assignment rule is real and tested; the UI
  around it is not built.
- **No win/loss condition for a match.** There's no round structure, no
  stock count, no ring-out — that's the actual "Overreach" game design,
  which starts once rig-vs-rig combat resolution is designed, not part of
  this consolidation pass.

## Verification

`tests/rig-2player.js` covers: both rigs starting independent and idle;
triggering an attack/guard on one leaving the other's state completely
unaffected; player 2's own committed/interruptible-phase gating (the same
three rules `tests/rig-sequence.js` §12 verifies for player 1); the
gamepad-assignment algorithm via `window.Rig2._test.simulateGamepadConnect()`
(connection order, slot exhaustion, disconnect clearing a slot) — real
hardware can't be driven from Playwright, so this calls the exact same
`assignPad()` function a real `gamepadconnected` event would, not a
separate test-only copy of the rule. Plus a screenshot showing both rigs
rendered simultaneously in independent poses (idle vs. mid-kick), at
distinguishable colors.
