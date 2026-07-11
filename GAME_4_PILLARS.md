# Game 4 Pillars — Infall

**Status: decided.** This is the synthesis of a full team consultation (Game
Designer, Visual/Art Director, Audio Designer, Engineer, Community/
Marketing), matching `GAME_3_PILLARS.md`'s process.

## Resolved conflict — the Core/Cinder merge, and what it changed

The Game Designer's original mechanic draft (§2) had no moving player
avatar — a fixed, inert "Core" the player defended by aiming and launching
Wells. The Visual/Art Director's draft (§3) independently assumed a
free-flying player body ("the Cinder") continuously subject to gravity,
built to answer the apex art mandate. The two specialists worked in
parallel with no visibility into each other's output and produced
incompatible core loops — caught before any code existed, the design-stage
version of the same cross-check discipline this studio applies to shipped
code.

**Producer decision (2026-07-11): merge them. The player IS the Cinder —
there is no separate fixed Core.** Rationale, stated plainly: a stationary
turret has nothing for a continuous-motion rig to express, and the whole
point of Game 4's milestone is proving the apex standard can be hit, not
worked around. The sections below reflect that merge throughout — the
Cinder is the free body, governed by the same pull law as everything else,
carrying its own hull integrity as the thing actually at risk. §2's
Well/pull-law/fusion/hazard/difficulty system is otherwise unchanged; only
"what is the player, and what happens when they fail" changed, plus the
control scheme gained a second, independent continuous-thrust input to
actually drive the Cinder's movement (§2's Launch & Control).

---

## 1. What it is

**Genre**: gravity-manipulation physics arcade (Osmos/orbital-slingshot
lineage, not a match-3 or bullet-hell lineage). The player flies the Cinder
— a free body pulled by the same gravity as everything else in the field —
and places gravity wells to pull loose debris into orbit, fling it past
hazards, and chain multiple wells to redirect a cluster into a capture,
before any of it collides with the Cinder itself. Every throw runs on a
real many-body gravitational integrator at frame rate, not a canned
animation curve — the genuine engineering spike this game clears that the
first three games never had to (see §7 for the real, measured numbers, not
an estimate).

**Name**: **Infall**. Chosen over "Singularity" and "Perigee" because it
names the actual in-game payoff moment — the instant a flung cluster of
debris crosses a well's capture radius and gets irreversibly consumed — the
same way "Sigil Chain" names its own core action rather than its genre, and
"Wardfall" names a cluster's collapse rather than the censer that causes it.
"Singularity" was rejected for making the exact category mistake "Gravity
Well" itself makes: it names the *tool* (the well/object), not the moment,
and it's the single most recycled label in physics-toy games — it carries no
identity specific to this game. "Perigee" was rejected because, while it is
a real orbital-mechanics term for a *moment* rather than an object, it names
the wrong beat: perigee is closest approach, which happens on every
near-miss slingshot too, not just a successful capture — this game doesn't
reward proximity, it rewards commitment. "Infall" does the same double duty
"Wardfall" does: literally correct physics vocabulary and an evocative
reading at once.

**Grimoire Vocabulary check (Bible §6)**: none of Insight/Operators/Grimoire
Research/Manifestations maps naturally onto this game as currently scoped —
there's no XP curve, no weapon roster, no skill tree. Forcing that
vocabulary onto a wells-and-debris physics game would be the same mistake as
porting Wonderland's narrative schema into a 60fps hot loop (Bible §5). If
Infall ends up with a meta-progression currency (see §5), it should earn its
own name the way Wardfall's "Shards" did, not inherit Iridescent Cosmology's
terms by default — §5 below proposes **Flux** for this reason, flagged as a
proposal, not a locked decision.

**Portal card** (`index.html`, replacing the "More Worlds" placeholder):
```
Badge:      Stage IV · Live Now
Title:      Infall
Genre line: Physics · Gravity-Slingshot
Desc:       Fly the Cinder through an open field of loose gravitational
            debris. Place wells to pull it into orbit and pin it down
            before it reaches you — time the capture right and a whole
            cluster infalls into your own trap in one irreversible commit;
            mistime it and the same pull flings everything straight back
            at your hull. Every throw runs on a real gravitational
            simulation, not a scripted arc, so no two wells placed the
            same way pull quite the same — and neither do you.
Button:     ✦ Trigger the Infall
Meta line:  [fill in real numbers once mechanics are locked in build — do
             not fabricate plausible-sounding stats the way the other
             three cards' meta lines report real, finalized feature
             counts. Nothing about well count, particle count, or hazard
             types is real yet.]
```
Card art is the fourth genuinely distinct visual language in the grid —
breaking from *both* existing silhouette languages, not just one: not the
faceted-shard hexagon polygons Iridescent Cosmology and Sigil Chain share
(`facetShard()`), and not Wardfall's soft-lit radial-gradient spheres
either. Infall has no filled shapes in its preview — point-particles and
motion trails: small glowing debris sprites on curved paths with an
alpha-falloff trail behind each one, orbiting a pulsing well-core rendered
as a thin ring (not a disc), tightening as the well's pull strengthens. This
card's preview loop should reuse the actual game's own force-integration
function verbatim once it exists, the same "reuse the real technique, don't
fake it" rule that already governs the other three cards' art — a faked
spiral would read as a generic space-loop, not a window into this specific
game's physics. Same `IntersectionObserver` offscreen-pause as all three
existing cards, shipped in the first commit.

**Arcade navigation, from the first commit**: `infall.html`'s main menu
reuses Sigil Chain's exact `.btn`-styled `<a href="index.html">` back-link
pattern (`sigilchain.html:129`, Bible §11's reference implementation) from
Infall's very first commit — not bolted on once the game is otherwise "done."

**What's deliberately not decided in this section**: everything past naming
and portal presentation is real §2-onward work — mechanic-specific numbers
(well counts, capture radii, hazard rosters) all live there, not here.

---

## 2. Core mechanics

**The physical rule, stated once, because everything below is one expression
of it**: gravity sources (**Wells**) pull mass toward them. That is the
entire force system in this game — no second force law anywhere, not for
the player's own launched Well, not for debris-on-debris interaction. This
is the direct answer to STUDIO_BIBLE.md §14's mechanics test: a player who
plays this for twenty minutes should be able to say "things fall toward
Wells" and have that sentence cover the whole game, the same way Wardfall's
player can say "the ball bounces off walls at a normal angle" and be
describing the whole trajectory system.

### The Cinder, Wells, and debris — who's who
- **The Cinder** is the player's own body — a free-flying mass governed by
  the exact same pull law as everything else in the sim, per §3.1's
  framing (now the actual mechanic, not just the art rationale). No
  special-cased player physics: any active Well pulls the Cinder exactly
  like it pulls debris, including a Well the Cinder just placed itself.
  This is a deliberate consequence of "one rule governs everything," not an
  oversight — parking a new Well too close to your own flight path means
  feeling its pull immediately, real learnable skill expression the same
  way misjudging a Wardfall wall-bounce is a skill failure, not a bug. The
  Cinder carries hull integrity (`HULL_HP`, see Win/loss below) — it is the
  thing actually at risk. The Cinder is never "captured" by a Well the way
  debris is; capture/score logic only ever resolves for debris.
- **Wells** are player-launched gravity sources with a flat pull strength
  and flat radius of influence for their entire lifetime (both fixed per
  Well instance at spawn — see §6's compounding-risk list for why "Wells
  grow stronger as they capture more" was considered and explicitly
  rejected). A Well **expires after `WELL_LIFETIME = 6s`** (estimate,
  pending playtest) and cannot be renewed — it collapses and a new one must
  be launched.
- **Debris** are the drifting particles a Well pulls. Each carries exactly
  one authoritative stat, `mass`, read by every formula in §6 from the same
  field — never independently re-derived per formula.

### Launch & control
**Two independent inputs, matching §3.1's "continuous vs. discrete, cleanly
separated" split** — this is where that split becomes the actual control
scheme rather than a cross-reference:
- **Continuous thrust** (WASD/left-stick, or a touch joystick) drives the
  Cinder's own movement at all times, additive to whatever gravity is
  currently doing to it. Always live, never gated by the other input.
- **Discrete well-launch** reuses Sigil Chain/Wardfall's unified
  pointer-event pattern (`setPointerCapture`, press–drag–release), now
  anchored to the Cinder's live position rather than a fixed point: press
  to begin aiming, drag to set direction and power (capped at
  `MAX_DRAG_PX`, mapping to launch velocity), release to fire.

The launched Well travels as a **projectile that is itself pulled by every
currently-active Well** — the same pull law debris (and the Cinder) obey,
applied to the projectile before it settles. A skilled player can bank a
new Well's flight path around an existing Well's gravity instead of firing
in a straight line — Wardfall's skill ceiling comes from reading one
wall-bounce rule, not a separate mechanic; this is the same shape. The
projectile inherits Wardfall's proven wall interaction — reflection off
arena edges, **capped at 1 bounce** (tighter than Wardfall's 2, since this
arena is roughly square and a 2-bounce path would cross too much of the
field to read cleanly). Once it settles, it becomes a Well (a pull
*source*) and stops being subject to any other Well's pull (a pulled
*target*) — that state flip is binary and immediate, not a blend. The
Cinder itself never gets this exemption — it stays a pulled target for its
entire time on screen, per the "no special-cased player physics" rule above.

**Decision**: no ammo/resource economy gating Well launches. The only pacing
constraints are (a) the max-3-simultaneous cap below and (b) travel time
itself. A separate charge/cooldown resource on top would be a second,
unrelated exception layered onto one clean rule — the "three unrelated
exceptions" smell §14 warns against.

**Max simultaneous Wells = 3.** Stated explicitly: **this is a legibility
cap, not a performance one** — Wells pulling debris is cheap (`O(wells ×
debris)`, and wells ≤ 3 makes that trivial at any debris count). The cap
exists because a player cannot visually decompose which of 4+ overlapping
force fields is pulling which debris particle past about 3 simultaneous
sources — the same reasoning Wardfall applied to its bomb-radius/color-count
caps, applied here to a continuous field instead of a discrete stat.

**Well expiry, resolved by the same one rule rather than a special case**:
when `WELL_LIFETIME` elapses, any debris still inside its `CAPTURE_RADIUS`
is captured and scored normally; anything further out is released to free
drift with its current velocity. No separate "what happens on expiry"
system — expiry just stops evaluating the pull law for that source.

### The pull law itself, with its own explicit clamp
```
pullForce(distance) = WELL_PULL / max(distance, MIN_DIST)
```
Linear falloff (not inverse-square) — deliberate for legibility: an
inverse-square field feels "snappy"/unpredictable near the center, and this
game wants a smooth, readable funnel a player can aim into. `MIN_DIST`
(estimate: 20px) exists purely to stop the formula from producing unbounded
acceleration as `distance → 0` — the same "check every axis a formula
reads" discipline applied to a physics term instead of a score term.

### Fusion (merge) events — the O(P²) question, resolved
**This design uses wells→particles pull only. There is no mutual,
continuous, particle-on-particle gravity anywhere in this design.** Mutual
N-body was considered and rejected, not left ambiguous. Two consequences:

1. The measured ~1,500–2,000 mutually-interacting-particle safe ceiling
   (§7) **does not bind this design at all**, because the system that
   ceiling describes doesn't exist here. Debris count is instead capped by
   a separate, much lower **legibility/pacing** number:
   `MAX_DEBRIS_ONSCREEN = 60` (estimate) — chosen because a cluttered
   arcade canvas stops reading as individual threats well before it stops
   running at 60fps. This design sits roughly two orders of magnitude under
   the measured perf ceiling by construction.
2. **"Merging" is a discrete, scoped collision check, not a force**: two
   debris particles both (a) inside the same Well's `CAPTURE_RADIUS` and
   (b) within `FUSION_TOUCH_DIST` of each other fuse into one particle
   (`mass = min(massA + massB, MASS_MAX)`, see §6). The candidate pool is
   never "all debris on screen" — only particles already captured inside
   one of ≤3 active Wells' influence radii, a small, naturally-bounded set
   by construction. **No spatial-hash grid is used here**, consistent with
   §7's finding that a grid underperforms brute-force at this studio's
   scale and erodes further under the exact clustering this game causes.

**Scripted-event exception, named explicitly**: a later difficulty phase
may include a "Swarm" set-piece — a pre-authored burst spawn intended to
cascade-merge dramatically. Built as a **scripted, discrete sequence**
(fixed spawn pattern + fixed merge-order script), explicitly **not** true
mutual N-body turned on for hundreds of bodies. If a future version needs
real simultaneous mutual gravity, that requires its own engineering review
against the 1,500–2,000 ceiling first — not implicitly authorized here.

### Hazard debris
Introduced by the difficulty curve, not present from the start:
- **Volatile** — same pull/capture rule, but on **collision with the Cinder
  while uncaptured**, deals `mass × HAZARD_IMPACT_MULT` damage
  (`HAZARD_IMPACT_MULT = 2`, flat, capped, applies to this one read only —
  §6 risk item 5). Red (`--danger`) per §11's color-language rule — correct
  usage, since Volatile debris genuinely is a hostile entity.
- **Swift** — same pull law, but requires **double the normal time inside
  `CAPTURE_RADIUS`** before capture resolves — a flat, capped multiplier on
  *time*, not on any score term, kept isolated from §6's formulas entirely.

### Difficulty curve (estimates — no real playtest data exists yet, per
STUDIO_BIBLE.md §8's read on Game 4)

**Decision**: ramp is driven by **elapsed survival time**, not "Wells
launched" or "debris captured" — a skilled, efficient player shouldn't get a
slower ramp just for taking fewer actions, the same reasoning Wardfall used
to reject a misses-only pressure mechanic.

Three ramping axes — spawn interval, raw spawn mass range, hazard roster —
staggered so the endless tail doesn't stack every axis's maximum at once:

| Phase | Elapsed survival (est.) | Spawn interval | Raw spawn mass range | Hazard roster |
|---|---|---|---|---|
| 1 | 0–40s | 2.2s | [1,2] | — |
| 2 | 40–90s | 1.8s | [1,2] | — |
| 3 | 90–150s | 1.8s (held) | [1,3] | + Volatile |
| 4 | 150–220s | 1.4s | [1,4] (max, held from here) | + Swift (roster complete) |
| 5 (endless tail) | 220s+ | 1.1s (floor, held) | [1,4] (held) | Volatile + Swift (held) |

**Why Phase 4 carries two axis-maxima and Phase 5 carries only one, stated
explicitly**: mass-range and hazard-roster both reach their final held state
at Phase 4, a short, bounded phase. Spawn-interval only reaches its own
floor at Phase 5 — deliberately, since Phase 5 is the endless tail, the
phase a long run spends the most cumulative time in. Landing three
simultaneous new maxima in the phase players live in longest would be the
difficulty-curve version of the compounding-multiplier failure this studio
watches for; reserving the tail for exactly one new pressure axis is the
staggering fix, matching Wardfall's own "don't hit both maxima at once"
lesson applied to three axes instead of two.

All numeric thresholds above are **estimates** — no real playthrough exists
yet by definition at this stage. Need calibration once a build exists, the
same way Wardfall's `PHASE_BOUNDS_SHOTS` did.

### Win / loss
No fixed win state — score-attack survival, same convention as both prior
games. **Loss**: the Cinder has `HULL_HP = 100` (estimate); any debris that
collides with the Cinder while uncaptured deals damage equal to its `mass`
(Volatile: `mass × HAZARD_IMPACT_MULT`); at 0 HP the run ends. **Score**:
the sum of every capture/fusion event's score for the run (§6), persisted
as the best-run metric exactly as Wardfall's `best.score` is.

---

## 3. Visual identity

Game 4 has no rig pattern to inherit — Iridescent Cosmology is a
discrete-state top-down sprite, Sigil Chain has no character, Wardfall's
censer never moves. Every call below is decided from the confirmed mechanic
(real inverse-square gravity, wells uncapped, particle-particle interaction
capped ~1,500-2,000 bodies if used), not adapted from an existing file.

**Two corrections to already-shipped documentation, found while producing
this and since fixed directly in `GAME_3_PILLARS.md`** (not left as an
open item): its §3 claim that the `:root{}` block — including
`--danger`/`--ok` — was byte-identical across all three game files was
wrong (`index.html` never declared those two tokens); and its deep-teal
distance-from-`--ok` claim was off (140+ asserted, 122.3 actual, still a
safe margin). Both corrected in place, with the wrong numbers left visible
alongside the fix rather than silently swapped out.

### 3.1 What the player actually is — the decision everything below depends on

**The player is a free body (working name: the Cinder) governed by the exact
same inverse-square law as every particle in the sim — no special-cased
"player physics."** Two control inputs, cleanly separated: **continuous
thrust** (held direction/magnitude, an additive force vector on top of
whatever gravity is doing to the Cinder at that instant), and **discrete
well-anchor** (aim + release/tap, cooldown-gated, places a temporary
attractor well the Cinder itself is also pulled by). The one clear
underlying rule a player could eventually state themselves (§14's mechanics
test): *everything obeys the same law, including you and including what you
create.* This is the only framing of the three considered that produces an
actual rig — a stationary body has no velocity to express; a free body has
real, continuously-updating velocity and net-force vectors the physics sim
already computes every frame, which is exactly the data §14 asks the rig to
express.

**Rig-apex scope for first ship**: the Cinder, plus optionally one
boss/hazard-tier body (§3.4). Not the debris swarm, not every well.

### 3.2 The player rig — hand-authored base, physics-driven transform on top

The failure mode to name and avoid: taking a uniform circle/regular-polygon
base and squash-stretching it by velocity. That is **not** a fix — it's the
Wonderland-boss mistake (`iridescentcosmology.html:2159` `RAMIEL_VERTS`, a
hand-picked `{angle, radiusMultiplier}` array, not `Math.cos(i*2π/n)`) with a
physics transform layered on top of the same generic base. A stretched
circle is still a circle at rest, and this game visits "at rest" constantly.

**Two layers, not one:**
- **Base silhouette (hand-authored, at rest)**: an asymmetric
  `{angle, radiusMultiplier}` vertex list — a pointed "prow," a blunt
  "stern," off-axis mass concentration — authored by hand the same way
  `RAMIEL_VERTS`/`RUNE_VERT_DEFS` were. Non-negotiable per
  `faceted-gem-rendering/SKILL.md`'s own rule: the Cinder is singular,
  named, constantly on screen — it fails the skill's own test the instant
  it's compared to a well or debris fleck, both of which *are* correctly
  generic.
- **Real-time transform (physics-driven, continuous)**: heading = velocity
  vector angle (not discrete facing snaps); elongation along travel
  direction scaled by instantaneous net-force magnitude (reading it costs
  nothing extra — the sim already computes it); thrust-input magnitude
  (continuous 0-1) drives trail-emission asymmetry/length; releasing thrust
  near a well should visibly go slack/dim over real frames, not
  animation-swap to an "idle" pose. Facet-shading reuses `shadeHex`
  unchanged (`iridescentcosmology.html:1939` `buildEnemySprite` convention)
  — only the vertex data and per-frame transform are new.

**Design-taste risk: high.** This is the studio's first continuous physics
rig — no shipped comparison point, "smoothness is the fidelity metric" per
§14 is unverifiable from code alone. Needs a real screenshot/clip at actual
render size — ten seconds of the Cinder under varying thrust/G-load — before
it's called apex rather than merely "works." **Code risk: moderate** —
reading existing sim state into a render transform is cheap; the risk is
entirely in whether the hand-authored base and transform curve read as
intentional, a human-judgment call this role can flag but not close alone.

### 3.3 Palette audit — real RGB-distance numbers, not restated prior claims

Following Wardfall's methodology: Euclidean RGB distance against
`--gold`(#ffd76b), `--neon`(#ffcb5c), `--danger`(#ff4d70), `--ok`(#5eff9c);
reuse an existing token first; new hex only when nothing existing clears
every band comfortably.

| Entity | Color | vs gold | vs neon | vs danger | vs ok | Call |
|---|---|---|---|---|---|---|
| Cinder (player) | `var(--ink)` #f4ecff | 149.9 | 166.7 | 214.1 | 180.7 | Reuse — a "new" near-white candidate measured 4.0 units from `--ink`, an accidental duplicate of exactly the kind §11 exists to catch. |
| Attractor well core | reuse `#4ea8ff` (Wardfall's sapphire) | 235.5 | 243.2 | 245.1 | 132.8 | Reuse verbatim, clears every band 130+. |
| Debris/particle base | new: `#5e6f92` | 195.6 | 193.1 | 168.0 | 144.3 | Checked against every token, not just reserved bands (closest is `--ink-soft` at 55.4, clearly distinct). Variety via lightness/opacity jitter, not new hues — load-bearing for the perf budget at up to ~2,000 bodies. |
| Resonant/capturable particle | `var(--gold)` directly | 0 (is gold) | 19.2 | 138.1 | 173.0 | Correct reward-band usage — this is the one body that actually is a reward. |
| Hazard/Collapsar accent | `var(--danger)` as accent over `#0a0620` base | 138.1 | 127.6 | 0 (is danger) | 244.0 | Mirrors Wardfall's bomb rule — danger is an accent on a near-black base, never the base fill. |

**Internal-distinctness flag** (not a reserved-band violation): attractor
vs. debris measures 124.0 units apart — below the 130 "comfortable" line
this table otherwise holds to, though above Sigil Chain's own shipped 72-94
floor. Wells and debris differ enormously in size/motion/render technique,
so this is lower risk than for two same-size same-shape entities, but worth
a real screenshot check at actual render density before calling it settled.

### 3.4 Hand-authored vs. parametric, per entity type

- **Cinder**: hand-authored (singular, named, permanently on screen).
- **Attractor wells**: parametric — radial gradient
  (`shadeHex(color,-18,0)` edge, `shadeHex(color,+26,+10)` center),
  interchangeable instances told apart by color/size/field-lines, not
  silhouette.
- **Debris/particles**: parametric, and **this exemption is load-bearing for
  the performance budget**, not just convention — at up to ~2,000
  simultaneous bodies, unique hand-authored vertices per particle is a
  frame-budget question, not a taste one.
- **Resonant/capturable particle**: parametric, but its color must
  reference `var(--gold)` at the actual draw call, mirrored into a JS
  constants block (Wardfall's own drift-guard pattern) — not a hand-typed
  literal that can silently drift the way `--gold` already has once.
- **Collapsar / boss-tier hazard** (optional, scoped per 3.1): if included,
  hand-authored, full stop. The failure to avoid: generating it as a
  bigger regular well — the boss-silhouette mistake verbatim, in gradient
  form instead of polygon form.

### 3.5 Juice — the well-anchor needs its own signature-action feedback

Applying the studio's own already-paid-for lesson
(`iridescentcosmology.html:3354-3362`): anchoring a well is this game's one
action-initiation moment and needs feedback distinct from particle-capture
or hazard-contact reactions, not one generic pop reused for both.
Well-anchor: charge-telegraph on hold, then a radial "space bends"
ripple/lens-distortion ring at placement, camera-kick scaled by well
strength the same way `addShake` scales by severity. Reuse proven idioms
(`Ease.popSettle`, `comboPulseScale`-style severity scaling) rather than new
curves; distinct win/loss overlay entrance (`panelPop` vs.
`roundFade`/`newBestPop`) reused rather than one generic overlay for both
registers. **The Cinder's own continuous rig motion is itself the primary
juice for ordinary play** — not a separate VFX layer on a static sprite.

### 3.6 Accessibility — the field itself is the information

Wardfall's split (CSS-level reduction only touches overlay entrance; canvas
juice amplitude-reduced, never zeroed; informational content untouched) is
the right pattern to reuse, but "informational" means more here, because the
force-field itself is the mechanic. **Stays completely untouched by
`prefers-reduced-motion`**: field-line/force-vector visualization, ghost-path
prediction, well radius-of-influence rings, hazard pre-collapse telegraph
timing. **Amplitude-reduced, never zeroed**: camera shake/kick, lens-distortion
ripple amplitude, starfield parallax, particle burst counts.

**Genuinely open question, not resolved here**: the Cinder's squash-stretch
is dual-purpose — decorative juice *and* the player's only continuous
readout of current G-force, which is real survival information near a
Collapsar. Wardfall/Sigil Chain never had an element that was simultaneously
informational and decorative, so their clean binary split doesn't transfer.
Needs a real playtest/human call, not a confident answer asserted here.

---

## 4. Audio

**Graph scope decision**: Sigil Chain's scoped base (master → compressor →
destination, `rampGain`/`bell()`/shared convolution reverb) **plus three
deliberate additions**, not Iridescent Cosmology's full chain. Unlike
Wardfall's one borrowed signal (`ceilingDistance`), Infall's physics sim
already computes a genuinely continuous, zero-extra-cost energy signal every
tick as a byproduct of the simulation itself — no need to invent a synthetic
proxy. That's real justification to go further than Wardfall's "one drone"
scope, because the apex mandate asks for four simultaneously-live
parameters, not one — it is **not** justification to reach for the full
identity chain; distortion is explicitly skipped (Iridescent Cosmology's
grit serves a different identity), a clean sine/triangle drone+pulse
register reads as "the void humming," the correct register here.

**The three additions**: (1) a continuous filtered drone/pad, the direct
structural analogue of Wardfall's drone; (2) a lightweight tempo-scheduler
pulse layer (look-ahead JS scheduler, not a full step sequencer) — needed
because tempo is one of the four mandated parameters and a static drone
alone can't express it; (3) **a sidechain duck bus** (`duckBus`/`duckPump`,
reusing `iridescentcosmology.html`'s technique verbatim) — Wardfall didn't
need one ("nothing to pump against"), Infall does: capture/merge events fire
far more densely than Wardfall's pops, against a *continuous* bed
underneath. Without ducking, a busy capture moment stacks simultaneous
full-volume layers into mush — the exact failure the skill's duck-bus
section names, and this game has the density to actually trigger it.

### Mood engine — the live mapping

Two continuous state variables, both already produced by the physics loop —
no new bookkeeping, sampled directly off values the sim already tracks:

- **`systemEnergy`** — EMA-smoothed, normalized sum of squared particle
  velocities (0 = near-static field, 1 = a multi-well chaotic cascade). The
  "how much is happening right now" signal, this game's on-screen equivalent
  of what Wardfall used `ceilingDistance` for.
- **`hullMargin`** — the Cinder's current `HULL_HP` (§2) normalized 0-1
  (1 = full hull integrity, 0 = about to die). This replaces an earlier
  draft's placeholder leak/containment-meter assumption, written before §2's
  Core/Cinder merge settled what the actual loss condition is — `HULL_HP`
  is already a value the sim tracks for the loss condition itself, so this
  is another zero-extra-cost signal, the same "read what the sim already
  computes" pattern `systemEnergy` uses. Directly analogous to Wardfall's
  shrinking `ceilingDistance`. The "how close to losing" signal.

| Signal | Parameter | Mapping | Mechanism |
|---|---|---|---|
| `systemEnergy` | Tempo | 84 BPM at 0 → 132 BPM at 1 (estimates, need calibration) | JS scheduler recomputes the *next* pulse interval at each scheduling pass — never a mid-flight ramp on a rate, so no AudioParam race here at all |
| `systemEnergy` | Filter cutoff | 220Hz → 3200Hz on `droneFilter.frequency` | **The one true continuous per-frame direct `.value` write in this design** — see bug-prevention note |
| `systemEnergy` (tiers .35/.65/.9) | Instrumentation density | drone only → +pulse → +arpeggiated overtone → +all, subdivision tightens | Each tier crossing is a discrete threshold event, one-shot `rampGain` per crossing — same technique Iridescent Cosmology's shimmer-recede already proves |
| `hullMargin` | Harmonic tension | open 5th at margin ≥.5 → detuned minor-2nd/tritone fades in across .5→.9→0 thresholds | Same discrete-threshold-`rampGain` technique, applied to harmonic content instead of gain |

**Signature motif**: a three-note "infall" cell (descend a fourth, settle a
step below) — mirrors a particle's orbit decaying into a well. Ascending-
inverted variant on well spawn; the plain descending form recurs, pitch-
shifted per merge step, inside the merge-cascade climb; the full phrase
resolves once, unhurried, at game over.

**Stinger map** (via `bell()` unless noted; pitch mapped to particle *mass*
— heavier = lower, lighter = higher, the direct physical intuition tying
sound to the game's own language, the way Wardfall ties pitch to orb color):
- Well spawn — rising sweep, pitch inversely mapped to well strength/radius, motif's ascending-inverted form.
- Well despawn/collapse — the same tone reversed (slow release instead of fast attack) so spawn/despawn read as a matched pair.
- Particle capture — real `bell()` tier, pitch via the mass→frequency table.
- Merge/collision — pitch/volume climb per consecutive merge, `circleChord`'s equal-tempered-step technique, **capped at `MAX_MERGE_STEP = 6`** (~one octave) — the same uncapped-per-hit shape this studio has already had to cap twice (Wardfall's `MAX_CASCADE_STEP`, the original heal-per-hit incident), capped up front here.
- Hull-margin warning — one discrete alarm `bell()`, dissonant against the drone's current root, first threshold crossing only.
- Game over — the signature motif's full resolution; this handler **must** explicitly fade the drone/pulse bed via `rampGain` and stop the tempo scheduler in the same call.
- Achievement unlock — reuse Wardfall's established convention (bright ascending two-note flourish, `i*900` stagger) — now a cross-game studio convention, not something each game reinvents.

**Bug-prevention note**: `droneFilter.frequency` is the only value written
directly every frame. Every other "continuous-feeling" parameter above is
actually discrete threshold events using one-shot `rampGain`, which by
construction can't collide with a per-frame write on the same param. Gate
the per-frame `frequency.value` write behind an explicit `isDroneActive`
flag, flipped false in the same call that triggers the game-over fade — even
though today's fade-out only touches `.gain` (a different param, no direct
collision yet), add the flag now, before any future addition scheduled on
this same node reactivates the race the skill documents. Verify live via
Playwright once code exists: read `droneFilter.frequency.value` at a
mid-run high-`systemEnergy` frame (expect ~3200) and again at
game-over+1s (expect parked, plus `droneGain.gain.value` near 0) — read the
actual values, don't infer from the automation code.

---

## 5. Meta-progression *(drafted directly for this doc — not yet reviewed by a specialist pass; follows the established studio pattern)*

**Currency + cosmetics-only shop + achievements + best-stat tracking**,
first-class from day one per the Game 2 retrospective lesson (Sigil Chain's
own docs call its achievements-only scope "far thinner" than intended) —
sized like Wardfall's, not Iridescent Cosmology's full Grimoire shop.

- **Currency, proposed name "Flux"** (flagged as a proposal, not locked —
  §1 explains why Iridescent Cosmology's vocabulary doesn't transfer here,
  and community-marketing didn't commit to a currency name since §2/§5
  weren't written yet when they drafted §1): `floor(finalScore / 50)` per
  run, the same Wardfall formula, decoupled from in-run scoring multipliers
  for the same reason Wardfall's Shards are — creating a currency bonus on
  top of `totalScore` would be a fourth term reopening §6's boundedness
  proof every time someone touches it.
- **Spend on cosmetics only**: Cinder skins/trail colors, well-core palette
  themes, background/starfield themes, capture VFX, victory jingle. **No
  gameplay-affecting unlocks, ever** — no permanent score multiplier, no
  starting Wells, no slower spawn ramp, no extra simultaneous-Well slot.
  This keeps §6's compounding-risk analysis valid permanently regardless of
  shop depth, instead of reopening it on every future unlock.
- **Achievements**: reuse the `Achievements` module shape verbatim
  (DEFS/checkAll/toast). Target ~8-10 defs: first clear, a large-fusion
  (high final `mass`) threshold, a capture-streak threshold, a
  Volatile-survived and a Swift-captured achievement, a survival-phase-
  reached milestone, a score milestone, a no-hull-damage-taken run.
- **Best-stat tracking**: `best: {score, largestMassCaptured,
  longestComboStreak, totalCapturesLifetime}`, same shape as the existing
  games' `best` objects.

---

## 6. Scoring (independently recomputed, not asserted)

```
MASS_MIN = 1, MASS_MAX = 8            // hard clamp — fusion cannot exceed this
CAPTURE_BASE = 15                     // score per unit mass, on capture

WELL_STEP = 0.12, WELL_CAP = 10       // captures by THIS Well instance
wellMult(n) = 1 + 0.12 * (min(n,10) - 1)

COMBO_STEP = 0.15, COMBO_CAP = 8      // consecutive captures, any Well,
comboMult(streak) = 1 + 0.15 * min(streak-1, 7)   // within COMBO_WINDOW = 2.5s

FUSION_BONUS = 25                     // per fusion event — FLAT, never through
                                       // wellMult or comboMult

captureScore = round( CAPTURE_BASE * mass * wellMult(n) * comboMult(streak) )
```

**Worked check, minimum case**: freshly-spawned smallest debris (`mass=1`)
captured as the first catch by a brand-new Well (`n=1`), no streak
(`streak=1`) → `wellMult(1)=1`, `comboMult(1)=1` →
`captureScore = round(15*1*1*1) = 15`.

**Worked check, maximum case**: a fused particle at the mass cap (`mass=8`),
the 10th+ capture by one Well instance (`n=10` → `wellMult(10) =
1+0.12*9 = 2.08`), the 8th+ consecutive capture in the player's streak
(`streak=8` → `comboMult(8) = 1+0.15*7 = 2.05`): `15*8 = 120`;
`120*2.08 = 249.6`; `249.6*2.05 = 511.68` → **`captureScore = 512`**.

**Compound multiplier ceiling**: `mass` (1→8) is its own independently-
bounded base-value axis, closed off at the fusion clamp, not a multiplier
in the risk sense. The actual multiplier ceiling is `wellMult_max ×
comboMult_max = 2.08 × 2.05 = 4.264×` ≈ **4.26x** — tighter than Wardfall's
own verified 4.7x/7.1x ceilings, deliberate: this design already gets a
wide (8x) natural dynamic range from the mass axis itself, so the
multiplier layer on top is kept narrower on purpose.

**Named compounding-risk items, each resolved by construction, re-verify
once real code exists**:

- **Wells do not grow stronger from their own captures — considered and
  explicitly rejected.** A "Well gets stronger the more it captures"
  snowball mechanic was the first idea for escalation feel, rejected
  specifically because pull strength directly drives capture *rate*, and
  capture count is exactly what `wellMult` reads — a Well that gets
  stronger from its own capture count would feed that count back into a
  scoring multiplier reading it too. The closest analogue in this whole
  design to the original Drain incident's shape, closed off structurally:
  Wells are flat-strength, flat-radius for their entire lifetime, full stop.
- **`mass` is clamped once, at the fusion event, and read — never
  re-derived — by every formula that touches it.** `newMass =
  min(massA + massB, MASS_MAX)`; excess above `MASS_MAX` is simply
  dropped, not carried anywhere else. Both `captureScore` and hull
  damage-on-impact must read this same clamped field — two independent
  formulas reading the same stat from two different sources is exactly the
  "one capped axis, one uncapped read elsewhere" shape of the studio's
  original heal-per-hit bug. Verify at implementation: exactly one
  `particle.mass` field, no pre-clamp value cached anywhere.
- **`wellMult`'s counter and `comboMult`'s counter must stay two genuinely
  different counters, never unified "for simplicity."** `wellMult` reads
  `well.captureCount` (resets when a new Well is placed). `comboMult` reads
  `run.comboStreak` (resets on a miss or `COMBO_WINDOW` timeout, independent
  of any Well's lifetime). Collapsing these into one shared stat later
  reproduces the Drain-style bug shape exactly.
- **`FUSION_BONUS` stays flat, never routed through `wellMult` or
  `comboMult`** — direct precedent from Wardfall's `BOMB_BASE`. A single
  Well's lifetime can host several fusion events before it expires, itself
  a Well-scoped counter running parallel to `well.captureCount`; routing the
  fusion bonus through `wellMult` would let two well-scoped counters
  compound against each other.
- **`HAZARD_IMPACT_MULT` (2x) applies to exactly one read** — hull
  damage-on-impact for uncaptured Volatile debris — and nowhere else. Not
  applied to `captureScore`, not itself subject to `wellMult`/`comboMult`.
- **Any future "stronger/wider Well" upgrade must be reviewed against
  `wellMult` and hull-damage together before shipping**, not approved
  alone — a wider/stronger Well increases the count `wellMult` is
  exponentiated against, the "two reasonable-looking multipliers stacking
  on the same stat" shape this studio checks for by policy. Meta-progression
  currency (§5) must stay decoupled from in-run score for the same reason.

---

## 7. Engineering notes

**The real numbers** (Playwright-profiled headless Chromium, not estimated —
full methodology and raw data in the session record; not re-run for this
doc since §2 confirmed the wells→particles-only design, which sits far
under every measured ceiling):
- Wells pulling particles (this design's actual load): **~1.8ms at 50
  wells × 8,000 particles** — nowhere near the 16.67ms/60fps budget, at
  particle counts far beyond this design's own `MAX_DEBRIS_ONSCREEN = 60`
  cap. Not a performance risk at any scale this design would plausibly use.
- Mutual N-body (the variant §2 explicitly rejected): naive brute-force
  crossed budget at **~2,400 particles** (17.4ms avg); measured safe
  ceiling **~1,800–2,000**. Does not apply to this design, kept here for
  the record since it's the risk the original concept consultation flagged.
- **The spatial-hash Grid pattern was tested and found to make things
  *worse* for this specific mechanic** — ~2x slower than brute-force at
  any scale this studio has real precedent for, and its benefit at high
  scale erodes under exactly the clustering gravity wells cause. Per §2,
  not used here regardless, since this design doesn't need mutual N-body at
  all — but worth recording so a future revision doesn't reach for it by
  habit.
- A hot-loop array-allocation anti-pattern was caught in the spike
  (`new Float64Array` allocated fresh every step, causing a 17MB GC
  sawtooth) — concrete guardrail for whoever implements this: preallocate
  force-accumulator arrays once, zero them per frame, never allocate inside
  the step function.

**Module shape**, mirroring the established IIFE convention: `Persist`,
`Events`, `Game` (Cinder/Well/debris/pull-law/fusion/hazard/collision logic
folded in, matching Sigil Chain and Wardfall's own precedent of
single-module cohesion over premature splitting), `Juice`, `Music`,
`Settings`, `Achievements`, `Shop`, `FullscreenCtrl`. **No separate
`Grid`/spatial-hash module** — resolved, not just deferred: fusion
candidates are already bounded to debris inside ≤3 active Wells (§2), and
Cinder-vs-debris collision is a linear scan against at most
`MAX_DEBRIS_ONSCREEN = 60` particles, cheap enough that a spatial structure
would be the exact premature-optimization complexity this studio's own
queue-fairness precedent rejects. That's **9 modules — at the target**,
comfortably under the 11-module ceiling Wardfall set.

**No proactive profiling needed before building**, per the studio's own
"measure before optimizing" discipline and consistent with the spike
already run: the wells→particles design is measured at ~1.8ms even at
scales this game will never reach. The one thing worth building correctly
from day one rather than discovering later: the preallocated-array pattern
above — cheap to do right the first time, expensive to retrofit into a
working sim.

`tests/infall-adversarial.js` written as part of **initial** scope, not
bolted on later — matching Wardfall's precedent, not Iridescent Cosmology's
or Sigil Chain's original gap. Give the pixel→pull-target resolution and
the fusion candidate-pool logic explicit adversarial coverage (extreme
launch angles, simultaneous Well expiry mid-fusion-check, max-debris-count
edge cases) — the two genuinely novel pieces of logic in this design.

---

## 8. PWA / offline

Same three-file satellite pattern as all three existing games
(`infall.webmanifest`, `infall-sw.js`, `icons/infall-{192,512,512-maskable}.png`
generated from the game's own inline-SVG favicon), **built in from the
first commit**, not retrofitted. Service worker scope explicitly set to
`./infall.html` (the shared repo-root-directory scoping gotcha the
`pwa-offline-games` skill names) — never left to default to `/`. Per
STUDIO_BIBLE.md §13: any future edit to `infall.html` after first ship
requires bumping `infall-sw.js`'s `CACHE_NAME` in the same commit — stated
here so it's not contingent on remembering to open the skill file, the same
reason §13 itself exists.
