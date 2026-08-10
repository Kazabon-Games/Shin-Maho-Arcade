# Swarmbreak (Game 8) — Quality & Robustness Consolidation Report

**Status: planning document, not a sign-off.** `GAME_8_PILLARS.md` is the
locked design doc; this file is its companion, answering one question the
producer asked directly: *how does the team plan to make this robust,
high quality, and genuinely surpassing what's typical for browser
gaming* — with real verification methodology and honest, bounded claims,
not aspiration. Six specialists (Game Designer, Visual/Art Director,
Audio Designer, Engineer, Capability Auditor, QA/Playtest) each worked
blind against the current `GAME_8_PILLARS.md`, the same
consult-blind-then-reconcile discipline the pillars doc itself was built
with. No new conflicts surfaced this pass — the six plans compose
cleanly, because each targets a different layer of the same open items
(most centrally, §2f's missing player HP, which five of six teams
independently flagged without being told to).

No code exists for Swarmbreak yet. Every plan below is *pre-registered
methodology* — what gets measured, how, and what the pass/fail bar is —
not a report of results. That distinction is the point: a plan is only
worth writing if the bar is stated before the number exists to grade
against it.

---

## The blocker that touched every team's plan — now resolved

**Player base HP was undefined anywhere in `GAME_8_PILLARS.md`** — first
surfaced as §2f during this synthesis pass, and independently
re-confirmed by the Game Designer, Engineer, and Capability Auditor
below without cross-talk. Every damage-rate number in the document
(`INFECTION_DPS_BASE=6`, Feedback Pulse's `FEEDBACK_BASE=8`) was
unverifiable as "balanced" against a pool that didn't exist yet.

**Resolved by producer decision, 2026-08-10: `PLAYER_BASE_HP = 100`**,
flat, with Survival-tag relic magnitude set alongside it (`+15 HP`/rank,
per §2f). This does not promote any number below past Tier 1 in the Game
Designer's calibration gate — a stated target still isn't measured
data — but every plan in this report that was gated on "the input
doesn't exist yet" can now proceed to real Tier-2 measurement once a
build exists.

---

## Game Designer — balance & pacing verification

**A four-tier calibration gate**, sharper than the studio's existing
Estimated/Measured binary:

| Tier | Definition | Unblocks |
|---|---|---|
| 0 | A number exists, no stated target | Nothing — most of the doc sits here today |
| 1 | Estimated, with an explicit intended outcome stated | Internal design review only |
| 2 | Measured, ≥3 informal playthroughs against the Tier-1 target, reported with sample size | — |
| 3 | Adjusted, then re-measured | Only Tier-3 numbers may be called "balanced" |

Currently Tier-0: `INFECTION_DPS_BASE`, `INFECTION_DURATION`,
`CONTAGION_RADIUS_BASE/MAX`, `SEPARATION_RADIUS≈18px`,
`FALLBACK_CAP≈320` (borrowed from a *different* game's measured ceiling,
not Swarmbreak's own). **§2f — player HP — isn't even Tier-0, it's
absent.** No damage number can promote past Tier 0 until it does; this
gate doesn't try to route around that.

**Independent recomputation, run now, against the current formulas**:
`dmgMult(24) = 2.74` (matches doc), Infection DoT range `18–49.3`
(matches), Feedback Pulse `48 dmg = 48%` of the *borrowed* HP placeholder
(arithmetic correct, input not real), `comboMult(10)=1.9`/`chainScore=9600`
(matches), and confirmed the boss's exclusion list (must not read
`dmgMult`/`comboMult`/`CHAIN_KILL_BASE`) has no undisclosed leak. **No
compounding-multiplier bug found in the math as specified** — the open
item is the missing input, not broken arithmetic.

**Honest "surpassing" claim**: not "more particles" — a computable
build-depth number once the relic pool size is fixed (currently
undefined), i.e. "N reachable builds at 8 slots across 3 tags," plus the
boss's damage-by-hop-count design being systemic (`healthMargin`-driven,
no `if(phase==2)` branching) rather than a scripted phase list.

---

## Visual/Art Director — density & legibility verification

**Density checkpoints**, tied to §7.1's own real population tiers rather
than round numbers: **50** (sanity baseline) → **500** (early-wave,
first clustering) → **2,500** (Game Designer's stated enemy peak) →
**4,608** (absolute Surge ceiling). At each: live screenshot/clip at
real render size, checking whether chaff/brute/ranged/elite stay
distinguishable at speed, whether overlapping infection-pulse overlays
still read as a cluster signal, and whether elite (shape+size+hue only,
no distinct silhouette) survives density without collapsing into chaff —
the doc's own named thinnest call. The Canvas-2D fallback path
(`FALLBACK_CAP≈320`) gets its own separate legibility pass at its
boundary — a second rendering mode, not covered by WebGL screenshots.

**WCAG 2.2 AA + RGB-distance, not yet run on Swarmbreak's own palette**:
this studio's existing live Playwright contrast sweep (the methodology
that found and fixed `--ink-soft` at 3.63–4.16:1 studio-wide) has never
been pointed at `#5ce8e0` signal-cyan or the Chitin-gold HUD numbers.
**Ship-blocking if it fails**, same standard as `--ink-soft` — checked
against the worst-case real background, not the first one tried.
Separately, the five-tier hostile palette's own internal-distinctness
numbers (chaff-vs-elite, ranged-vs-elite at 100–125, under the 130
comfort heuristic) need a real screenshot confirmation at density, not
just the raw RGB number.

**Colorblind simulation — genuinely new work, confirmed no prior studio
methodology exists to reuse.** A five-tier warm-hostile palette
(moss-olive / burnt-red-orange / violet-magenta / cobalt / maroon) is
exactly the shape that collapses under red-green colorblindness (brute
and boss both land in red-family). Plan: deuteranopia/protanopia/
tritanopia matrix-transform simulation on all five tiers plus the pulse
overlay, confirming shape/size/count still carry the read once color
degrades — run *before* kickoff art is finalized, any failure routes to
the shape-enum work, not a palette patch.

**Honest "surpassing" claim**: measured fps at 4,608 simultaneous WebGL2
batched instances against Iridescent Cosmology's own measured Canvas-2D
ceiling (176ms avg / 1,283ms worst at ~320 entities) — roughly a 14x
entity-count target at a *tighter* frame budget, on the same
single-file/no-build constraint. Real once code exists; a target until
then. The CPU-side simulation-cost caveat travels with this claim always
— render isn't the bottleneck at this scale, simulation is unmeasured.

---

## Audio Designer — synthesis verification

**Automatable, no speakers needed** (per this studio's established
AudioParam-inspection discipline): PeriodicWave partial coefficients
(non-integer n/1.02n/2.97n/4.01n, not defaulting to integer harmonics);
pad filter frequency sampled across a driven density sweep, confirmed
in-range only while active; Karplus-Strong node-graph shape via
`.connect()` enumeration; **the new bug class this game specifically
introduces** — `delayTime` set via exactly one `setValueAtTime` per
note, never a ramp or per-frame write (directly spy-testable); voice-steal
ceiling firing exactly at `MAX_VOICES+1`, not before.

**Ears-only, not provable by assertion**: whether the partials actually
read as "swarm-like," whether the pluck decay reads as "mechanical
weapon fire," whether Dorian-vs-Lydian recoloring lands as
grounded-vs-discovery to a real listener. Same honest split the Rykndu
`TitleTheme` precedent already established — a passing test proves the
graph is correct, not that it sounds right.

**Listening-pass plan** once a build exists: does the four-note motif
read as one identity across its four re-colorings; is the sub-bass
anchor audible under the densest moment without being masked; is
Dorian/Lydian actually distinguishable by ear at relic-draft
transitions. **Honest "surpassing" claim**: two synthesis techniques new
to this studio (PeriodicWave wavetable + Karplus-Strong physical
modeling), genre-matched and combined in one score, verified via real
graph/param inspection — not "best game audio ever."

**Real technical risk named in-doc**: the delay-time discontinuity bug
above; and a pitch-class-set collision check between Swarmbreak's
Dorian/Lydian four-note cell and Game 1's D Phrygian identity — checkable
in code as an interval-set diff, not left to ear.

---

## Engineer — profiling & fault-injection plan

**Baseline** (the only number in this whole report with production
evidence behind it today): Iridescent Cosmology, 320 enemies + nova
burst — Canvas2D 176ms avg/1,283ms worst (5.7fps) vs. WebGL2 batched
16.9ms avg/33.4ms worst (59fps).

**Five staged milestones**, each with a stated pass bar:
- **M1** — core loop, ~50 enemies, no batching/grid: establish clean
  per-entity JS cost before optimization masks it.
- **M2** — WebGL2 batching in, pre-grid, ramped to 4,608: must not
  regress worse than IC's own measured floor.
- **M3** — spatial-hash grid in: A/B brute-force vs. grid at 320 *and*
  2,500 — grid must show real improvement at Surge-adjacent density, not
  just at low population, given §7.6's own named clustering-erosion risk.
- **M4** — crash-safety + context-loss fault injection at full instance
  count: zero uncaught exceptions escape `loop()`; `FALLBACK_CAP≈320`
  measured directly against Swarmbreak's own draw cost, not assumed
  from a different game's number.
- **M5** — full Surge-peak stress, sustained 6s capture at
  `MAX_INSTANCES=4608`: frame budget ≤16.9ms avg/33.4ms worst, with live
  contagion-chain queue churn running concurrently.

**Honest "surpassing" claim**: ~4,600 simultaneously rendered and
independently simulated entities at a 60fps budget, zero build step,
zero plugin — a >14x entity count over IC's own shipped ceiling at a
tighter frame budget. Bounded explicitly to the render side until M1–M3
produce a real simulation-cost number; don't let M5 get reported as
"surpassing" if simulation cost was never actually collected.

**Fault-injection beyond §7.2/§7.4**: a grid-bucket-boundary stress case
(dense cluster straddling a `CELL` boundary while separation force pushes
enemies across it every frame — confirms no stale-neighbor miss);
`MAX_CHAIN_JUMPS_PER_TICK=400` overflow injection (>400 eligible jumps in
one tick, confirm clean queue-to-next-tick with no dropped/duplicate
jumps, no double-applied DoT); and a combined case — WebGL context loss
*while* the chain-jump queue is mid-drain at Surge peak, proving the two
independently-documented recovery paths (§7.2, §7.4) really are
independent under simultaneous stress, not just architecturally separate
on paper.

---

## Capability Auditor — Adopt/Trial/Assess/Hold sign-off

| Capability | Quadrant at kickoff | What moves it to Adopt |
|---|---|---|
| WebGL2 batched instancing, `MAX_INSTANCES=4608` | **Trial** (not Adopt — the technique is Adopt studio-wide, but this is its first deployment on the *combat-critical horde itself*, not decorative particles) | Real Playwright frame-time capture at actual Surge peak, plus the still-unmeasured CPU-side simulation cost |
| IndexedDB | **Hold** — correct, deliberate, already stated in-doc | A real per-run replay/timeline feature entering scope; success with `localStorage` alone never flips this |
| Dual-technique audio synthesis | **Trial** — both techniques are studio firsts | The delay-time bug-guard implemented and tested (not just documented); the "describe what's happening from music alone" test actually run |
| Crash-only recovery from kickoff | **Adopt** — correctly, a retrofit of an already-shipped, already-fixed-once pattern | Just confirm `tests/game8-crash-recovery.js` exists, passes, and the full-state-reset (not partial) behavior carries over correctly |
| Spatial-hash grid | Near-**Adopt** (ported pattern) | — |
| Anti-stack soft steering force | **Trial** — new, self-named risk of quietly breaking the core mechanic if miscalibrated | The already-specified A/B chain-length-distribution test actually run, not just planned |

**Honest framing on "surpassing browser gaming"**: real-but-modest,
correctly scoped, not oversold. Nothing here is beyond what's technically
possible on the web platform generally — WebGL2 instancing, physical-
modeling synthesis, and spatial hashing are all established techniques
used elsewhere. What's real is that this is *this studio's* first
from-kickoff use of several capabilities its own catalog had left
dormant — genuine internal ceiling-raising, not industry-leading
novelty. No public "surpassing" claim should be made until §2f is set
and the Trial-quadrant items above carry real numbers instead of
estimates.

---

## QA/Playtest — pre-ship adversarial plan

No build exists; this is script-in-advance, not results. Three novel-logic
risk surfaces, each needing a scripted scenario with a pass/fail
assertion, not a smoke click:

1. **Contagion chain-jump queue at `MAX_CHAIN_JUMPS_PER_TICK=400`** — a
   `Game._test` seam force-infects a fully clustered 2,500-enemy horde in
   one frame; assert jumps queue cleanly across ticks (no drop, no
   double-fire), the ripple completes deterministically across repeated
   runs, and `pageErrors.length===0` holds through a multi-tick drain.
   Also: rapid re-triggering a second infection source into an
   already-mid-drain cluster — this studio's own "resolve-twice race"
   class, hit before elsewhere.
2. **8-slot relic draft edge cases** — mash-click the draft card at
   appearance (the studio's known level-up-card race pattern); force all
   8 slots to Radius-tag rank 3 and confirm the game clamps to the real
   `CONTAGION_RADIUS_MAX=120px` at runtime, not the raw `234px` the
   design math computes; draft offers with fewer than 3 relics left in
   the pool; a draft arriving mid-pause or mid-death-transition.
3. **Anti-stack/spatial-hash interaction at Surge-peak density** — the
   Engineer's A/B chain-length-distribution test, run as a real
   assertion against a `_test` hook exposing per-run chain-length data,
   not a screenshot judgment call.

**Fourth pick**: Feedback Pulse boss damage, verified by direct field
read at runtime (not code inspection) — stack max Damage-tag relics,
trigger the pulse, confirm boss damage is unchanged from a no-relic
baseline. Same bug class as this studio's own Drain incident.

**Standing gap, named not closed**: Chromium-only Playwright coverage,
no WebKit pass anywhere in this studio's test suite — flagged as
mattering *more* here than for prior games, since `SEPARATION_RADIUS`
steering and chain-jump timing are frame-rate/GC-scheduling-sensitive in
ways WebKit's different scheduler could expose differently.

**"Robust" bar for this gate, stated plainly**: not "no bugs found" (that
just means bugs weren't looked for hard enough) — three novel-logic
surfaces each with a scripted pass/fail assertion, `pageErrors===0` held
under *sustained* Surge-peak load (not just steady state), the §7.6 A/B
test producing an actual number, and an explicit statement that
automated passing does not imply the Tier-0 balance constants are
correct — only that the code does what those constants currently say.

---

## What this report does and doesn't claim

**Does**: give every team a pre-registered, checkable bar to measure
against once code exists, cross-reference the one blocker (§2f) that
five of six teams converged on independently, and state every
"surpassing browser gaming" claim in this document as bounded and
falsifiable rather than promotional.

**Doesn't**: report a single result — nothing here has run against real
code yet, because no code exists. Nothing in this document should be
quoted externally as an achieved claim; every number above is a target
or a baseline from a *different*, already-shipped game, clearly labeled
as such throughout.

**Immediate next step, ahead of implementation**: resolve `GAME_8_PILLARS.md`
§2f (player base HP) — the one item blocking the Game Designer's,
Engineer's, and Capability Auditor's plans from having a real input to
grade against, not a placeholder.
