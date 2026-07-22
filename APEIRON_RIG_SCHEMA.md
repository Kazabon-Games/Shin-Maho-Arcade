# Apeiron Rig — Skeleton, Mass & Constraint Schema (Phase 1, v0.1.1)

**Status: locked joint/bone topology and default mass/constraint data.**
This is Phase 1 per `APEIRON_FLAGSHIP_DESIGN.md` §10: written and locked
*before* any rendering or solver code exists. Numeric defaults below
(masses, angle limits, rest angles) are a reasonable starting point, not
a verified-in-engine result — they get their eyes-on tuning pass in
Phase 2.5, per the Combat Feel Director role. **Do not start IK/solver
work (Phase 2) against this schema unless it's still this shape** — if
joint names, parent relationships, or the dynamic/fixed split below
change, this doc needs a matching update before anything else touches
the rig, per the same discipline `RYKNDU_RIG_SCHEMA.md` established.

---

## 0. Why this schema differs from Rykndu's, and where it deliberately doesn't

**Topology: reused on purpose.** Apeiron uses the same 15-joint,
side-profile skeleton as the Rykndu prototype (`RYKNDU_RIG_SCHEMA.md`),
same names, same parent relationships, same fixed-offset-vs-angle-driven
split. That topology is already playtest-verified to read correctly as a
side-view brawler silhouette (the v0.1.28 facing-redesign finding) — there
is no reason to re-litigate joint placement just because the *solve
method* underneath it is new. What's new here is exactly what
`APEIRON_FLAGSHIP_DESIGN.md` says is new: mass and constraint data per
joint, present from the start, driving a real physics solve instead of a
pose-blend lookup.

**Solve method: a deliberate departure.** Rykndu is a hand-coded FK chain
that blends between named `POSES` presets — no per-joint mass, no angle
limits, because nothing ever generated an out-of-range angle. Apeiron's
whole premise is that hits generate exactly that: arbitrary, physically
computed angles. This schema adopts **Verlet integration + iterative
constraint solving** (position-based dynamics — the same family of
technique the design doc already calls for on cosmetic cloth/hair,
applied here to the core rig too) rather than a full 3D rigid-body engine,
because:
- it's a well-understood, implementable-from-scratch technique (no
  external physics library, matching studio convention),
- it unifies the core-rig solve and the secondary-motion (cloth/hair)
  solve under one integration method, so there's one class of bug to
  understand instead of two,
- it degrades gracefully under the variable mobile frame-times the
  engineering review flagged as the real risk in a from-scratch solver —
  position-based constraints don't blow up the way explicit-velocity
  integrators do when `dt` spikes.

---

## 1. Joint list (15 world-space points — same names/parents as Rykndu)

| Joint | Parent | Category | Notes |
|---|---|---|---|
| `PELVIS` | — (root) | **Dynamic** | The only joint with no parent bone; carries the rig's own root position/velocity. Root mass below is a direct assignment, not derived from a bone. |
| `CHEST` | `PELVIS` | **Dynamic** | Distal end of the spine bone. Carries the head's mass folded in (see §3) since `HEAD` itself is non-dynamic. |
| `HEAD` | `CHEST` | Fixed-offset | Rigidly attached to `CHEST`, no independent rotation — same choice Rykndu made ("not angle-driven"), carried forward on purpose, not re-opened. |
| `HIP_L` | `PELVIS` | Fixed-offset | Small fixed depth offset from pelvis (near-coincident, per Rykndu's v0.1.28 side-profile narrowing) — the BACK hip anchor. |
| `KNEE_L` | `HIP_L` | **Dynamic** | Distal end of the back thigh bone. |
| `FOOT_L` | `KNEE_L` | **Dynamic** | Distal end of the back shin bone. Leaf. |
| `HIP_R` | `PELVIS` | Fixed-offset | Front hip anchor — same formula as `HIP_L`, opposite sign. |
| `KNEE_R` | `HIP_R` | **Dynamic** | Distal end of the front thigh bone. |
| `FOOT_R` | `KNEE_R` | **Dynamic** | Distal end of the front shin bone. Leaf — the primary hit-contact point until a second attack type exists. |
| `SHOULDER_L` | `CHEST` | Fixed-offset | Back shoulder anchor. |
| `ELBOW_L` | `SHOULDER_L` | **Dynamic** | Distal end of the back upper-arm bone. |
| `HAND_L` | `ELBOW_L` | **Dynamic** | Distal end of the back forearm bone (hand mass folded in). Leaf. |
| `SHOULDER_R` | `CHEST` | Fixed-offset | Front shoulder anchor. |
| `ELBOW_R` | `SHOULDER_R` | **Dynamic** | Distal end of the front upper-arm bone. |
| `HAND_R` | `ELBOW_R` | **Dynamic** | Distal end of the front forearm bone (hand mass folded in). Leaf. |

**Dynamic** (10 joints: `PELVIS, CHEST, KNEE_L, FOOT_L, KNEE_R, FOOT_R,
ELBOW_L, HAND_L, ELBOW_R, HAND_R`) means the joint is a real Verlet point
mass, integrated every physics step. **Fixed-offset** (5 joints: `HEAD,
HIP_L, HIP_R, SHOULDER_L, SHOULDER_R`) means the joint is recomputed each
step as a rigid local offset from its parent's solved position/orientation
— it never has its own mass or velocity, exactly like Rykndu's non-angle-
driven anchors. This split isn't cosmetic: it cuts the solver's real
degree-of-freedom count from 15 to 10, which is a direct, deliberate
answer to the "solver stability under variable frame time" risk raised in
engineering review — fewer dynamic points means fewer constraints to
satisfy per iteration, and a smaller state vector to keep numerically sane.

---

## 2. Bone list (14 edges — 9 constrained, 5 fixed)

| Bone (parent→child) | Type | Length (px, inherited from Rykndu's tuned `LEN`) |
|---|---|---|
| `PELVIS`→`CHEST` (spine) | **Constrained** | 62 |
| `CHEST`→`HEAD` (neck+head) | Fixed | 21 (`neck:2 + headR:19`) |
| `PELVIS`→`HIP_L` (hip depth) | Fixed | `hipW * 0.4` = 2 |
| `PELVIS`→`HIP_R` (hip depth) | Fixed | `hipW * 0.4` = 2 |
| `HIP_L`→`KNEE_L` (back thigh) | **Constrained** | 50 |
| `KNEE_L`→`FOOT_L` (back shin) | **Constrained** | 48 |
| `HIP_R`→`KNEE_R` (front thigh) | **Constrained** | 50 |
| `KNEE_R`→`FOOT_R` (front shin) | **Constrained** | 48 |
| `CHEST`→`SHOULDER_L` (shoulder depth) | Fixed | `shoulderW * 0.5` = 4.5 |
| `CHEST`→`SHOULDER_R` (shoulder depth) | Fixed | `shoulderW * 0.5` = 4.5 |
| `SHOULDER_L`→`ELBOW_L` (back upper arm) | **Constrained** | 37 |
| `ELBOW_L`→`HAND_L` (back forearm) | **Constrained** | 37 |
| `SHOULDER_R`→`ELBOW_R` (front upper arm) | **Constrained** | 37 |
| `ELBOW_R`→`HAND_R` (front forearm) | **Constrained** | 37 |

Lengths are the exact `LEN` values already tuned and playtest-verified in
`rykndu-doll-rig.html:1175-1178` — inherited as a starting point because
they're proven to read correctly at the studio's target canvas scale, not
because Apeiron shares code with Rykndu (it doesn't; see
`APEIRON_FLAGSHIP_DESIGN.md` §0). Re-verify at actual play size per this
doc's own §12 checklist item regardless — inherited numbers still need
the "watched on an actual phone" check, they don't get to skip it just
because they come from a proven source.

**Constrained** bones are the 9 real rotational degrees of freedom (this
is deliberately the same count and the same physical joints as Rykndu's
9-value pose shape minus the 2 translational `pelvisDX/DY` values — same
DOF, new representation). **Fixed** bones carry no independent angle at
all; they're a rigid offset baked into the parent's frame, resolved every
step, never solved.

---

## 3. Mass (fraction of total fighter mass `M`, sums to 1.0)

Assigned per **dynamic** joint, each carrying the mass of the bone whose
distal end it is (a "mass lumped at the far end" simplification — not a
precise biomechanical derivation, informed by standard anthropometric
segment-mass tables but rounded for a 2-fighter, 2D side-view rig rather
than fit to them exactly):

| Joint | Mass fraction | Rationale |
|---|---|---|
| `PELVIS` | 0.20 | Root mass — no parent bone to derive from; represents core/hip mass directly. |
| `CHEST` | 0.38 | Spine-bone mass, with `HEAD`'s mass folded in since `HEAD` has no point mass of its own. |
| `KNEE_L`, `KNEE_R` | 0.10 each (0.20 total) | Thigh-bone mass. |
| `FOOT_L`, `FOOT_R` | 0.055 each (0.11 total) | Shin-bone mass. |
| `ELBOW_L`, `ELBOW_R` | 0.03 each (0.06 total) | Upper-arm-bone mass. |
| `HAND_L`, `HAND_R` | 0.025 each (0.05 total) | Forearm-bone mass, hand mass folded in. |

`M` itself (the fighter's total mass in solver units) is a free parameter
set at Rig-init time, not hard-coded here — impulse-magnitude tuning
against a concrete `M` value is Phase 2.5 work, not a Phase 1 schema
decision.

---

## 4. Angle constraints (the thing Rykndu explicitly deferred)

Rykndu's own schema doc states plainly: *"No explicit per-joint angle
constraints/clamps exist today... this is fine as-is... the reason IK...
will need real reachability clamps added at that time."* Apeiron is that
time — a solver that generates arbitrary angles needs limits from its
first commit, per the design doc's own "not retrofitted later" mandate.

Each constrained bone's angle is expressed **relative to its parent
bone's direction** (not an absolute canvas-frame angle like Rykndu's
`DOWN`-relative convention) — this keeps a limit meaningful regardless of
overall rig orientation, and is the natural quantity a hinge/ball-joint
constraint solver clamps directly.

| Constrained bone | Angle range (rad, child relative to parent) | Rest angle (recovery-torque target) |
|---|---|---|
| Spine (`PELVIS`→`CHEST`) | −0.35 to +0.35 (~±20°, lean only, no folding) | +0.05 |
| Back thigh (`HIP_L`→`KNEE_L`) | −1.2 to +1.0 | +0.15 |
| Front thigh (`HIP_R`→`KNEE_R`) | −1.2 to +1.0 | +0.15 |
| Back shin (`KNEE_L`→`FOOT_L`) | 0 to +2.4 (hinge, no hyperextension) | +0.25 |
| Front shin (`KNEE_R`→`FOOT_R`) | 0 to +2.4 | +0.25 |
| Back upper arm (`SHOULDER_L`→`ELBOW_L`) | −0.5 to +3.0 | +0.30 |
| Front upper arm (`SHOULDER_R`→`ELBOW_R`) | −0.5 to +3.0 | +0.30 |
| Back forearm (`ELBOW_L`→`HAND_L`) | 0 to +2.6 (hinge, no hyperextension) | +0.90 |
| Front forearm (`ELBOW_R`→`HAND_R`) | 0 to +2.6 | +0.90 |

**Recovery-torque model:** each constrained bone additionally carries a
soft position-based spring pulling its angle toward the rest-angle column
above, weaker than the hard min/max clamp so an impulse can temporarily
override it — this is what "recovery" in `APEIRON_FLAGSHIP_DESIGN.md` §5
actually is: not a scripted return-to-idle animation, but this spring
winning once the impulse's energy has dissipated. Spring stiffness is a
Phase 2 tuning parameter, deliberately not fixed here.

---

## 5. Data representation

Structure-of-Arrays over `Float32Array`, per the studio's data-oriented
convention for this build — not an array of joint objects, and not
Rykndu's named-variable FK chain (that shape is right for Rykndu's fixed
pose-blend; it isn't right for a generically-iterated constraint solve).

```js
/** @typedef {number} JointIndex */

const JOINT_COUNT = 15;

/** @type {Readonly<Record<string, JointIndex>>} */
const JOINT = Object.freeze({
  PELVIS: 0, CHEST: 1, HEAD: 2,
  HIP_L: 3, KNEE_L: 4, FOOT_L: 5,
  HIP_R: 6, KNEE_R: 7, FOOT_R: 8,
  SHOULDER_L: 9, ELBOW_L: 10, HAND_L: 11,
  SHOULDER_R: 12, ELBOW_R: 13, HAND_R: 14,
});

/** Joints solved as real Verlet point masses each step. */
const DYNAMIC_JOINTS = Object.freeze([
  JOINT.PELVIS, JOINT.CHEST,
  JOINT.KNEE_L, JOINT.FOOT_L, JOINT.KNEE_R, JOINT.FOOT_R,
  JOINT.ELBOW_L, JOINT.HAND_L, JOINT.ELBOW_R, JOINT.HAND_R,
]);

/** Joints recomputed each step as a rigid offset from their parent — never integrated. */
const FIXED_OFFSET_JOINTS = Object.freeze([
  JOINT.HEAD, JOINT.HIP_L, JOINT.HIP_R, JOINT.SHOULDER_L, JOINT.SHOULDER_R,
]);

/**
 * @typedef {Object} RigState
 * @property {Float32Array} posX          - current world-space x, length JOINT_COUNT
 * @property {Float32Array} posY          - current world-space y, length JOINT_COUNT
 * @property {Float32Array} prevX         - previous-step x (Verlet velocity is implicit: posX - prevX)
 * @property {Float32Array} prevY         - previous-step y
 * @property {Float32Array} invMass       - 1/mass per joint; 0 for FIXED_OFFSET_JOINTS (infinite mass / not integrated)
 * @property {Int8Array}    parent        - parent JointIndex per joint, -1 for PELVIS
 * @property {Float32Array} boneLength    - rest distance to parent, per joint (0 for PELVIS)
 * @property {Float32Array} angleMin      - radians, only meaningful for constrained bones
 * @property {Float32Array} angleMax      - radians, only meaningful for constrained bones
 * @property {Float32Array} restAngle     - recovery-torque target angle, radians
 */
```

`invMass` (not `mass`) is stored directly — this is the standard PBD
convention (constraint math divides by mass everywhere; storing the
inverse once avoids a division per constraint per iteration, and lets a
`FIXED_OFFSET` joint's "infinite mass" be represented as plain `0` instead
of a special-cased branch).

This same array set is what Phase 3.5's Worker/OffscreenCanvas migration
transfers — as raw `ArrayBuffer`s via the transferable-object path the
engineering review called for, not structured-clone of a joint-object
graph. Designing the schema as flat typed arrays from Phase 1 is what
makes that later transfer free; it would not be free against Rykndu's
named-variable shape.

---

## 6. What this schema does not yet have (tracked, not silently missing)

- **Secondary-motion (cloth/hair) attachment points** — `APEIRON_FLAGSHIP_DESIGN.md`
  §5 calls for Verlet-driven cosmetic cloth/hair, but those are a
  separate, unconstrained particle chain hanging off a socket (analogous
  to Rykndu's socket system, `RYKNDU_RIG_SCHEMA.md` §"Attachment
  sockets"), not part of the core mass/constraint schema above. Deferred
  to its own addendum once Phase 3 actually needs it — not built ahead of
  that.
- **Solver stiffness/iteration-count constants** (constraint solver
  iterations per step, recovery-spring stiffness, gravity, damping) —
  Phase 2 tuning parameters, deliberately not fixed in this schema.
- **Hit-impulse contact-point resolution** (which joint absorbs an
  impulse, how it's distributed into the chain) — Phase 2 solver logic,
  not schema.
- **A block/guard mechanic's rig implications**, if guard turns out to
  need its own rest-angle set distinct from the idle stance above — an
  open item from the combat-design review, not decided here.
