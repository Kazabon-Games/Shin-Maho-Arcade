# Rykndu Rig — Skeleton Schema (locked, v0.1.8 baseline)

**Status: locked.** This is `prototypes/rykndu-doll-rig.html`'s actual
data model, extracted from the working `solveRig()`/`LEN`/`POSES` code —
not a redesign. Everything below describes what the code already does.
Section 3 (attachment/socket system) and Section 5 (move-set/state table)
are separate docs that build on top of this one; this file is the
foundation those two — and later, IK/Verlet-cloth per the Game 5 upgrade
protocol — attach to. Per that protocol's own warning, **do not start IK
work against this schema unless it's still this shape** — if a future pass
changes joint names, parent relationships, or the angle convention below,
this doc needs a matching update before anything else touches the rig.

## Joint list (15 world-space points, per `solveRig()`)

| Joint | Parent | Derived via | Notes |
|---|---|---|---|
| `pelvis` | — (root) | canvas center + `pose.pelvisDX/DY`, anchored to `groundY = canvas.height * 0.78` minus leg length | The one point not derived from another joint |
| `hipL` | `pelvis` | fixed offset (`-LEN.hipW*0.4`, same y) | Not angle-driven — hip placement is static relative to pelvis |
| `kneeL` | `hipL` | angle `pose.hipL`, length `LEN.thigh` | |
| `footL` | `kneeL` | angle `pose.kneeL`, length `LEN.shin` | Leaf joint — left kick's contact point |
| `hipR` | `pelvis` | fixed offset (`+LEN.hipW*0.4`, same y) | Mirror of `hipL` |
| `kneeR` | `hipR` | angle `pose.hipR`, length `LEN.thigh` | |
| `footR` | `kneeR` | angle `pose.kneeR`, length `LEN.shin` | Leaf joint — right kick's contact point (the rig's only currently-live attack) |
| `chest` | `pelvis` | angle `pose.spineA`, length `LEN.spine` | |
| `shoulderL` | `chest` | fixed offset (`-LEN.shoulderW*0.5`, `+6y`) | Not angle-driven |
| `elbowL` | `shoulderL` | angle `pose.shoulderL`, length `LEN.upperArm` | |
| `handL` | `elbowL` | angle `pose.elbowL`, length `LEN.forearm` | Leaf joint — no live gameplay use yet |
| `shoulderR` | `chest` | fixed offset (`+LEN.shoulderW*0.5`, `+6y`) | Mirror of `shoulderL` |
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
  pose is a fixed, hand-authored preset (`POSES.idle`, `POSES.kickR_windup`,
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

## Mirroring — the load-bearing invariant

Only right-side poses (`kickR_windup`, `kickR_strike`) are hand-authored.
Left-side poses are always derived via `mirror(pose)`, never
hand-duplicated — this is intentional and must stay true for any new pose
added later (a `guard` pose, future combo poses): **author the right side,
derive the left via `mirror()`**, so the two sides can't silently drift
apart the way `mockEnemy.hitAt`'s duplicated duration constant once did.
`mirror()` also wraps `spineA` into `(-pi, pi]` — a real, already-fixed bug
(v0.1.2) where a raw `pi - angle` reflection landed ~2π away from its
visual equivalent and made `lerpPose` sweep almost a full rotation instead
of a small lean. Any new angle key added to the pose shape must get a
mirroring rule added to `mirror()` in the same commit, or the left-side
version of that pose will silently reuse the un-mirrored value.

## What this schema does not yet have (tracked separately, not gaps in this doc)

- **Named attachment/socket points** (`hand_r`, `hand_l`, foot anchors as a
  queryable API distinct from the raw `solveRig()` output) — see the
  Section 3 socket doc.
- **An explicit state/move-set table** (idle/windup/strike/recover/hit-stun,
  plus the new `guard` state) — see the Section 5 move-set doc.
- **A `guard` pose** — doesn't exist yet; the prototype only ever fought
  one-directional enemies and never needed a defensive stance.
- **Independent head/look angle** — not needed by anything shipped yet;
  flagged here only so it isn't assumed to exist by a future pass.
