# Rykndu Rig — Skeleton Schema (v0.1.8 baseline, side-profile redesign v0.1.28)

**Status: locked joint/parent structure, re-authored pose data.** This is
`prototypes/rykndu-doll-rig.html`'s actual data model, extracted from the
working `solveRig()`/`LEN`/`POSES` code — not a design aspiration.
Section 3 (attachment/socket system) and Section 5 (move-set/state table)
are separate docs that build on top of this one; this file is the
foundation those two — and later, IK/Verlet-cloth per the Game 5 upgrade
protocol — attach to. Per that protocol's own warning, **do not start IK
work against this schema unless it's still this shape** — if a future pass
changes joint names, parent relationships, or the angle convention below,
this doc needs a matching update before anything else touches the rig.

**v0.1.28 changed WHAT the pose data represents, not the joint/parent
table below.** Every joint name, parent relationship, and angle
convention in this doc is unchanged and still accurate. What changed:
the rig was a front-on figure (hips/shoulders spread wide left-right,
"facing the camera" regardless of movement direction) that a producer
playtest correctly called out as not matching this game's own reference
images — real side-view brawlers, where the whole silhouette turns to
face left or right. `LEN.hipW`/`LEN.shoulderW` narrowed sharply (the two
hip/shoulder anchors now sit almost on top of each other, like a genuine
near/far pair viewed from the side, not spread wide apart), every
`POSES` entry was re-authored around a fore/aft profile stance instead
of a left-right straddle, and `solveRig()` gained a `facing` parameter
that mirrors the ENTIRE solved joint set around `pelvis.x` when facing
is `'L'` — see "Mirroring" below, which replaces this doc's old
per-pose `mirror()` description entirely.

## Joint list (15 world-space points, per `solveRig()`)

| Joint | Parent | Derived via | Notes |
|---|---|---|---|
| `pelvis` | — (root) | canvas center + `pose.pelvisDX/DY`, anchored to `groundY = canvas.height * 0.78` minus leg length | The one point not derived from another joint |
| `hipL` | `pelvis` | fixed offset (`-LEN.hipW*0.4`, same y) | Not angle-driven. **The BACK hip** in canonical facing-right space (v0.1.28) — `LEN.hipW` is narrow now, a near-coincident near/far depth pair, not a left-right spread |
| `kneeL` | `hipL` | angle `pose.hipL`, length `LEN.thigh` | Back leg |
| `footL` | `kneeL` | angle `pose.kneeL`, length `LEN.shin` | Leaf joint |
| `hipR` | `pelvis` | fixed offset (`+LEN.hipW*0.4`, same y) | **The FRONT hip** in canonical facing-right space — same anchor formula as `hipL`, opposite sign, but no longer a left-right mirror in the old sense; see "Mirroring" below |
| `kneeR` | `hipR` | angle `pose.hipR`, length `LEN.thigh` | Front leg |
| `footR` | `kneeR` | angle `pose.kneeR`, length `LEN.shin` | Leaf joint — the kick's contact point (the rig's only currently-live attack) |
| `chest` | `pelvis` | angle `pose.spineA`, length `LEN.spine` | |
| `shoulderL` | `chest` | fixed offset (`-LEN.shoulderW*0.5`, `+6y`) | Not angle-driven. **Back arm** (v0.1.28), narrow depth offset like `hipL` |
| `elbowL` | `shoulderL` | angle `pose.shoulderL`, length `LEN.upperArm` | |
| `handL` | `elbowL` | angle `pose.elbowL`, length `LEN.forearm` | Leaf joint — no live gameplay use yet |
| `shoulderR` | `chest` | fixed offset (`+LEN.shoulderW*0.5`, `+6y`) | **Front arm** (v0.1.28) |
| `elbowR` | `shoulderR` | angle `pose.shoulderR`, length `LEN.upperArm` | |
| `handR` | `elbowR` | angle `pose.elbowR`, length `LEN.forearm` | Leaf joint — no live gameplay use yet |
| `head` | `chest` | fixed offset (`0x`, `-LEN.neck - LEN.headR`) | Not angle-driven — no independent look/aim angle exists today |

This is a **hand-coded FK chain** (each joint a named variable computed via
`segEnd(parent, angle, length)`), not a generic indexed joint array. That's
a deliberate note for later, not a defect to fix now: the plan is to
document this shape as-is, since it works and is verified (`solveRig()`
already returns all 15 joints with finite, sane world positions — see
`tests/rig-sequence.js` §6). A future IK pass may want a generic
index/parent-array representation (the engineer draft this session
sketched one) — if that refactor happens, it must reproduce this exact
table's output before/after, verified by screenshot, per this file's own
"don't destabilize a locked schema" rule.

## Units and angle convention

- All lengths in `LEN` are pixels, already baked in at **0.8x** the
  original v0.1.0–v0.1.5 values (a deliberate quality-pass fix, not a
  display transform — `solveRig()` feeds both rendering and hit detection,
  so scaling anywhere except the source data would desync the visible rig
  from the real hit-checked one).
- Angles are radians. Convention: `0` = pointing along `+x` (right),
  `PI/2` = pointing down (canvas is y-down). The constant `DOWN = Math.PI/2`
  is used as the baseline most joint angles are expressed relative to
  (e.g. `hipL: DOWN + 0.18`).
- **No explicit per-joint angle constraints/clamps exist today.** Every
  pose is a fixed, hand-authored preset (`POSES.idle`, `POSES.kick_windup`,
  etc.); the rig only ever blends between named presets via `lerpPose()`,
  so an out-of-range or anatomically-broken angle can't currently occur —
  nothing generates arbitrary angles yet. This is fine as-is, but it's the
  reason IK (which *does* generate arbitrary angles toward a target) will
  need real reachability clamps added at that time — this schema doesn't
  need them yet because nothing exercises the gap.

## Pose object shape (11 values, not 15 — some joints aren't independently posed)

```
{ pelvisDX, pelvisDY, spineA,
  hipL, kneeL, hipR, kneeR,
  shoulderL, elbowL, shoulderR, elbowR }
```

`head` has no independent angle (fixed relative to `chest`); `hipL`/`hipR`/
`shoulderL`/`shoulderR` *joints* are fixed offsets, but the *pose keys*
`hipL`/`hipR`/`shoulderL`/`shoulderR` above are actually the angle driving
`kneeL`/`kneeR`/`elbowL`/`elbowR` respectively (i.e. the pose key names the
proximal joint but the angle drives the distal segment's direction —
matches standard "joint angle = direction of the bone starting there").
`hand`/`foot` positions are pure outputs, never independently posed.

## Mirroring — the load-bearing invariant (rewritten, v0.1.28)

Through v0.1.27, only right-side poses (`kickR_windup`, `kickR_strike`)
were hand-authored, with left-side poses derived via a `mirror(pose)`
function that flipped individual angle VALUES (`hipL: Math.PI -
pose.hipR`, etc.) to build a second, separate pose object. That approach
is gone — not renamed, removed — because it was solving the wrong
problem: it made a front-on figure's kick point the other way, but the
figure itself was still front-on (both hips/shoulders spread
symmetrically left-right) the entire time, which is exactly the "facing
forward while moving sideways" gap a real playtest caught. `mirror()`
and the separate `kickL_windup`/`kickL_strike` pose entries it built are
deleted entirely, along with the `wrapAngle()` helper that only existed
to support it.

**Every `POSES` entry now exists exactly once**, authored in canonical
"facing right" space: `hipR`/`shoulderR` are the FRONT limbs (angled
toward `+x`, i.e. less than `DOWN`), `hipL`/`shoulderL` are the BACK
limbs (angled toward `-x`, greater than `DOWN`) — see `POSES.idle`'s own
comment for the full convention. `solveRig(pose, standOffset, facing)`
solves this canonical pose exactly as authored, then — if `facing ===
'L'` — reflects EVERY joint's `x` coordinate around `pelvis.x` (`x' = 2 *
pelvis.x - x`) as a single post-processing step over the whole returned
joint set. This is baked into the actual returned world-space
coordinates, not a render-only canvas transform: hit detection
(`checkPvpHit()`) reads these same joints directly, and a draw-only
mirror would desync the visible foot from the real hit-checked one —
the identical reasoning this doc's own Attachment Sockets section
already gives for why `LEN`'s 0.8x scale lives in the source data, not a
display transform.

The practical effect: a new pose (a future `guard` variant, combo poses)
only ever needs to be authored ONCE, for facing right — there is no
second "derive the left side" step to remember, and no way for two
copies of the same pose to silently drift apart, because there is only
ever one copy. `attackSide`/`facing` are still tracked per-rig for
hit-direction bookkeeping (which way a kick is actually aimed, checked in
`checkPvpHit()`), completely independent of which pose data gets solved
— the POSE itself no longer has a side.

## Attachment sockets (consolidation §3 — added v0.1.9)

`getSockets(joints)` resolves 8 named world-space points from `solveRig()`'s
output: `hand_r`, `hand_l`, `foot_r`, `foot_l`, `hip`, `back`, `head`,
`stance`. Names are deliberately distinct from `solveRig()`'s own joint keys
(`hand_r` vs. `handR`) so a stray direct joint read doesn't silently pass as
"using the socket system." `resolveHits()` was migrated to read
`foot_r`/`foot_l` through this layer instead of `joints.footR`/`footL`
directly — the first real caller, so the convention is enforced starting
now, not just documented. Most sockets are a 1:1 alias of an existing joint
(verified via `tests/rig-sequence.js` §11) — no independent
orientation/rotation component yet, since no weapon/skin exists to need
one. Future weapon/skin/attack-reach code should query sockets by name,
never reach into `solveRig()`'s raw output.

`stance` (added v0.1.21) is the one socket that ISN'T a 1:1 joint alias —
it's the midpoint between `foot_l`/`foot_r`, i.e. ground-level, centered
regardless of which leg happens to be forward. Added for rig-vs-rig combat
resolution: a kick's strike pose is solved to land at ankle/enemy-dot
height (`kick_strike`'s own comment), roughly 80px below `hip`, so using
`hip` as a defender's hurtbox reference missed every hit in initial
testing until caught live and fixed. Real enough a future ground-shadow or
dust-FX attachment could reuse it too, not a hit-detection-only special
case.

## Render-only ragdoll layer (added v0.1.29 — does not change anything above)

Every joint table, angle convention, and mirroring rule above still describes
exactly what `solveRig()` computes and what hit detection/sockets/tests read —
that function and its output are unchanged by this section. What's new is a
second, later step that only rendering sees: `stepRenderJoints(target, dt)`
(a method on each rig controller, alongside `currentPose`/`updatePhysics`)
takes `solveRig()`'s own output as a moving *target* and, for `chest`, `head`,
both knees/feet, and both elbows/hands, chases it with a damped spring
(semi-implicit Euler, stiffness 260/damping 30) plus a bone-length distance
constraint, instead of teleporting straight to it. `pelvis`/`hipL`/`hipR` are
passed through untouched (pelvis already has its own real physics); shoulders
are recomputed each step from the spring-settled chest position, not the
target chest, so the arms never visually detach from a torso still catching
up. `frame()` computes this once per rig per frame, immediately before
`renderRig()`, from the exact same `joints`/`joints2` that combat resolution
already used earlier that frame — never a second, independent computation of
hit-relevant position, the same "one solve, everyone reads it" principle this
doc's own Mirroring section already holds `solveRig()` to, just drawn one step
later. `applyKnockback()` also injects a real velocity impulse into the
struck rig's ragdoll chest/head, strictly after the hit itself was already
decided against the unragdolled joints. See the file's own v0.1.29 changelog
entry for why this is scoped as render-only: `kick_strike`'s hand-solved reach
guarantees a hit connects for the entire 70ms strike window, and a spring-
lagged foot feeding back into hit detection would risk quietly undermining
that guarantee — exactly the failure mode this doc already warns a draw-only
transform could cause, just approached from the other direction here (keeping
hit detection pure and letting only the *cosmetic* copy lag, rather than
letting anything lag that combat still reads).

## What this schema does not yet have (tracked separately, not gaps in this doc)

This list is now stale in the way it originally described (an explicit
state table and a `guard` pose have both existed for many versions — see
`RYKNDU_MOVESET.md`), kept accurate rather than left to imply either is
still missing:

- **Independent head/look angle** — not needed by anything shipped yet;
  flagged here only so it isn't assumed to exist by a future pass.
- **Socket orientation/rotation** — sockets are position-only today; add
  rotation when a weapon/skin actually needs to align to bone direction,
  not preemptively.
- **Combo-specific poses / a genuine second attack type** — combo-cancel
  (v0.1.26, see `RYKNDU_MOVESET.md`) chains the SAME canonical kick into
  itself on a confirmed hit; there is still only one kick pose, not a
  combo-specific follow-up animation.
