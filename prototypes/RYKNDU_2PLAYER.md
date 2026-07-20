# Rykndu Rig — 2-Player Extension (v0.1.11, physics parity v0.1.20, combat resolution v0.1.21, match structure v0.1.23, guard meter v0.1.24, parry v0.1.25)

**Status: substrate, physics, combat resolution, a real match structure,
guard stamina, AND parry all landed.** This covers what the 2-player
extension actually built — two independent, simultaneously rendered/
animated rigs, each with its own input, real shared physics, real
rig-vs-rig hit detection/knockback/ring-out, an actual win condition
(first to 3 ring-outs wins the match, with a result overlay and a
rematch path), a real stamina cost on guard (drains while blocking,
regenerates slower, force-drops at empty, costs extra per blocked hit),
and now a precision-timing reward for a well-read block — a hit landing
within 120ms of the moment guard was raised fully negates and punishes
the attacker instead (see `RYKNDU_MOVESET.md`'s Combat resolution, Guard
meter, and Parry sections for the mechanics) — and draws a hard line
around what still deliberately isn't covered: only combo-cancel depth
remains separate future work now.

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

- ~~No guard timer/meter~~ — **built in v0.1.24.** Guard now costs real
  stamina: continuous blocking drains a meter, releasing regenerates it
  (slower than it drains), the meter hitting zero force-drops guard, and
  a landed blocked hit costs a flat chunk on top. See
  `RYKNDU_MOVESET.md`'s Guard meter section and `tests/rig-guard-meter.js`.
- ~~No parry~~ — **built in v0.1.25.** A hit landing within
  `PARRY_WINDOW_MS` (120ms) of the exact instant guard was raised is a
  full negation, not a block — zero knockback and zero guard-meter cost
  for the defender, and the attacker takes real knockback and gets
  interrupted instead. See `RYKNDU_MOVESET.md`'s Parry section and
  `tests/rig-parry.js`.
- **No combo system.** Each rig's attack sequence is still exactly the
  single kick from v0.1.0 (windup → strike → recover); nothing chains,
  and a landed hit can't cancel `strike` itself into a follow-up.
- **No join screen.** Pad assignment is silent and automatic (connection
  order), not a "press any button to join" ceremony with on-screen
  confirmation. The underlying assignment rule is real and tested; the UI
  around it is not built.
- ~~No round/match structure beyond a running score~~ — **built in
  v0.1.23.** `MATCH_TARGET_SCORE` (first to 3 ring-outs) gives the running
  `p1Score`/`p2Score` tally an actual endpoint: reaching it sets
  `matchOver`/`matchWinner`, freezes both rigs, and shows a real result
  overlay in the winner's own color. A rematch fires from either player's
  next attack input (`tryRematch()`, wired into every real attack entry
  point for both players), not just player 1's. See `RYKNDU_MOVESET.md`'s
  Combat resolution section and `tests/rig-match.js`.

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

`tests/rig-match.js` covers the match structure specifically — scores
accumulating without ending the match early, reaching the target score
freezing both rigs and crediting the correct winner, a decided match
blocking further combat resolution, a rematch firing from EITHER
player's attack input (not just player 1's) and genuinely resetting both
scores/positions, and a full second match playing out correctly
afterward (not leftover state from the first).

`tests/rig-guard-meter.js` covers the guard stamina system — real
elapsed-time drain/regen rates driven through `stepPhysics()` (not a
per-frame shortcut), the forced drop at zero, the re-raise refusal below
the minimum threshold, the flat cost from a blocked hit on top of
continuous drain, `reset()` restoring a full meter, and player 2 sharing
the exact same behavior through the same factory.

`tests/rig-parry.js` covers the parry window specifically — a hit
landing inside `PARRY_WINDOW_MS` of the raise (full negation, zero
guard-meter cost, the attacker punished instead), one landing well
outside it (an ordinary block, verifying the two don't get confused with
each other), a re-raise opening a genuinely fresh window rather than
reusing stale state, and both attack directions.

## Mobile verification status (v0.1.22 — emulation, not real hardware)

`tests/rig-mobile-emulation.js` drives the real page through Playwright's
actual iPhone 13, Pixel 7, and iPhone SE device profiles (real viewport
dimensions and device pixel ratios, not an arbitrary small window) and
found a real bug on its first run: both rigs' duel-spawn separation and
arm-spans were sized assuming 700px+ of width, so player 2 rendered
mostly or entirely off-screen on an actual phone-width viewport. Fixed
with a `renderScale` camera factor that shrinks only the on-screen pixel
size below that width — world-space physics (`posX`, `velX`,
`ARENA_BOUND`, knockback speed) are untouched, so gameplay feel is
identical on every device. Layout is now clean at 390px (iPhone 13) and
412px (Pixel 7); at 320px (iPhone SE, the narrowest/oldest real screen
tested) player 2 still visually overlaps the JUMP button a little —
improved from fully clipped off-screen, not perfectly resolved.

This is still emulation. Nobody on this project has run the build on
real phone hardware yet — that remains a real, open gap, not something
this pass claims to close.
