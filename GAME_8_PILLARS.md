# Game 8 Pillars — Swarmbreak

**Status: decided.** This is the synthesis of a full team consultation (Game
Designer, Visual/Art Director, Audio Designer, Engineer, Capability
Auditor), matching `GAME_4_PILLARS.md` and `GAME_7_PILLARS.md`'s process —
five specialists, each working blind to the other four, reconciled here.
Producer's brief: a swarm/roguelike-survivor game, explicitly scoped to
give this studio's genuinely underused capabilities (WebGL2 batched
rendering at real scale, IndexedDB, wavetable/physical-modeling audio
synthesis, crash-only recovery, `SCHEMA_VERSION` save-versioning) their
first real, from-kickoff deployment — not a Game 1 (Iridescent Cosmology)
reskin.

**Numbering**: Game 1 (Iridescent Cosmology), Game 2 (Sigil Chain), Game 3
(Wardfall), Game 4 (Infall), Game 7 (Runeshatter) are shipped. Game 5
(Rykndu) is an in-progress fighting-game prototype. Game 6 is the
Wonderland RPG, a separate project in `age-of-wonder`. Game 8 is
correctly the next open Shin-Maho-Arcade slot.

---

## Resolved conflicts — caught blind, reconciled here

Five specialists worked with zero visibility into each other's output, the
same discipline Infall's Core/Cinder merge used. Five real conflicts
surfaced, each resolved below with stated rationale rather than silently
picking one side.

### 1. IndexedDB — the producer's own brief conflicts with two independent specialists' evidence

The brief frames IndexedDB as decided groundwork. **Both the Engineer and
the Capability Auditor, independently, working blind to each other,
reached the same conclusion**: Game 8's actual save shape as scoped here
(currency, unlock flags, best-stat tracking, a capped run-history list)
is the same shape every existing Shin-Maho-Arcade game already handles
correctly with a flat, schema-versioned JSON blob in `localStorage`.
`age-of-wonder/wonderland/persistence.js`'s own real justification for
IndexedDB is a genuinely relational, potentially-large, multi-namespace
entity graph — a different shape than a capped counters-and-unlocks blob.
Even an active player's 1,000-run history at ~300-500 bytes/record is
300-500KB, nowhere near `localStorage`'s practical ceiling.

**Decision: `localStorage` + `SCHEMA_VERSION`, not IndexedDB, for Game 8's
initial ship scope.** This is not a refusal to use the capability — it's
the exact distinction the Capability Auditor's own sign-off named as the
thing to guard against: "does the pillars doc name the specific
mechanic... that requires this capability, or does it appear with no
justification beyond 'the capability audit said this was underused.'"
Forcing IndexedDB in against two independent specialists' evidence would
be precisely that failure mode, on the exact game meant to demonstrate
avoiding it. **Named explicitly as a live option, not closed forever**:
if the Game Designer's relic-draft system grows into full per-run replay
storage (recording the actual relic-pick sequence and combat timeline for
a "watch this run" feature — real and plausible for this genre, not
scoped here), that crosses the real data-shape threshold Engineer named,
and IndexedDB becomes a genuine Trial at that point, inheriting
`wonderland/persistence.js`'s proven single-owner-module/fail-loud/
namespaced-key pattern rather than being reinvented ad hoc.

**Confirmed by producer decision, 2026-08-10**: `localStorage`, not
IndexedDB, for Game 8's initial ship. No replay/run-history feature is
in scope for first ship — the trigger condition above that would flip
this to Adopt is explicitly not being exercised now. Left in place, not
deleted, as the real record of why the call was made and what would
change it, per this studio's own "name the gap, don't smooth it over"
convention.

### 2. Peak entity count — Game Designer's real numbers vs. Engineer's estimate

Engineer's pass (working without the Designer's numbers) recommended
`MAX_INSTANCES = 2400` as a placeholder pending real design numbers. The
Game Designer's pass, produced independently, computed a real
peak-load breakdown: 2,500 enemies + 500 projectiles + 600 chain-arc VFX +
400 pickups + 60 floating-text quads at absolute Surge peak ≈ **4,060
simultaneous quads**. **Resolved: `MAX_INSTANCES = 4608`** (4,060 plus
~13% headroom, rounded to a clean power-friendly number) — the Engineer's
own budget math (`2400 × 8 floats × 4 bytes = 76.8KB` per upload) scales
linearly and trivially to this size; nothing about the recommendation
changes except the constant itself. Per-category soft caps (Engineer §7.1)
apply per the Game Designer's own category breakdown, not one
undifferentiated pool.

### 3. Vocabulary — declining to reuse Iridescent Cosmology's terms

The Game Designer's draft casually reused "Operator" for weapons ("player
auto-fires Operator-equivalent weapons... reusing that vocabulary term
directly") without writing the actual justification it referenced. Per
Infall's own established precedent (`GAME_4_PILLARS.md` §1: "Forcing
[Iridescent Cosmology's] vocabulary onto a [game] would be the same
mistake as porting Wonderland's narrative schema into a 60fps hot loop"),
and per the Visual/Art Director's own explicit deferral of this exact
question to the Game Designer — **decision: Game 8 does not inherit
Insight/Operators/Grimoire Research/Manifestations.** Swarmbreak's own
identity (Infection, Contagion, Relics, Chitin) is biological/swarm-themed,
not cosmological — a different register from Iridescent Cosmology's, the
same way Infall's physics-arcade identity earned "Flux" rather than
inheriting Game 1's terms. Weapons are called **Vectors** (a Vector
"carries" the infection/damage payload — literal biological term,
consistent register with Infection/Contagion, distinct from "Operator").

### 4. Infected-state visual treatment — neither blind pass covered the interaction

The Visual/Art Director's palette (§3 below) was drafted without knowledge
of the Game Designer's Infection mechanic (blind-pass timing). Infection
needs a visible state independent of the five threat-tier base colors
(chaff/brute/ranged/elite/boss) — a modifier layer, not a sixth tier.
**Resolved**: infected enemies get a pulsing white-desaturated overlay
(`shadeHex(baseColor, +40, -60)`, alternating at 4Hz) rather than a new
hue — checked against every reserved token: white-desaturated overlays
don't collide with gold/danger/ok/neon bands at any base color, since the
overlay reads as a brightness/saturation modulation of the entity's own
existing (already-cleared) color, not a new hex. This also directly serves
the Game Designer's own "cluster density, not individual tracking" framing
(§2c below) — a glowing/pulsing cluster reads as "this pocket is primed to
chain" at the cluster-legibility level the mechanic actually needs, without
requiring per-entity infection-state tracking by eye.

### 5. Color conflict — the genre-standard "plague green," flagged by the Game Designer, resolved here

Swarm/infection games conventionally use green for plague/toxic
identity. This studio reserves green (`--ok`) strictly for safe/health per
`color-language-audit`. **Resolved**: Infection's visual language (§4
above) uses white/desaturated pulsing, not a new green, avoiding the
collision entirely rather than picking a green that would misread as
"safe" on every infected enemy in the game.

---

## 1. What it is

**Genre**: swarm/roguelike-survivor (Vampire Survivors/Brotato lineage)
with a discrete relic-draft run-structure, not continuous XP leveling. The
player auto-fires Vectors at an ever-growing horde; enemies cluster
naturally under normal AI pathing; a Plague Vector applies Infection, and
an infected enemy's death jumps the infection to the nearest uninfected
enemy within a radius — a chain reaction whose visible size is purely a
function of how densely packed the horde was when it triggered.

**The one clear rule** (`STUDIO_BIBLE.md` §14's mechanics test): *an
infected enemy's death jumps its infection to the nearest uninfected enemy
within a fixed radius; whether that reads as one enemy dying or a whole
horde collapsing is purely a function of density at trigger time — the
same rule at every scale, no special case for a small chain vs. a big one.*

**Name**: **Swarmbreak** — names the actual payoff moment (a packed
cluster's chain reaction collapsing at once), the same way every prior
game's name does. "Locust" was rejected for naming the enemy, not the
moment (Infall's own "Singularity" mistake). "Cascade" was rejected as
genre-generic, carrying no identity specific to this game. "Contagion" was
rejected on tone — clinical/sterile, breaking the more evocative register
the rest of the portfolio shares.

**Grimoire Vocabulary check**: does not apply — see Resolved Conflict #3.
Swarmbreak earns its own terms (Vector, Infection, Contagion, Relic,
Chitin) rather than inheriting Iridescent Cosmology's cosmology-themed set.

**Portal card** (`index.html`): full art/copy pass deferred until mechanics
are locked in a real build, per Infall's own precedent of not fabricating
plausible-sounding stats ahead of real numbers. Genre line: **Swarm ·
Chain-Reaction**. Card preview should reuse the real chain-jump visual
(§4's infection-pulse treatment) once it exists, the same "reuse the real
technique, don't fake it" rule governing every other card.

### 1a. Story — kept deliberately simple, load-bearing for theme, not a script

> The Swarm isn't many creatures. It's one signal wearing many bodies —
> every member bound to the same shared nervous thread, which is exactly
> what let it grow this far unchecked. You carry the **Break**: a rare
> counter-signal that does nothing to a single host except spread,
> silently, to the next host still listening on the same thread. You're
> not here to kill the Swarm one at a time. You're here to make it kill
> itself.

One idea, chosen specifically because it requires zero new vocabulary —
every mechanic name already locked in §2 is a direct consequence of this
premise, not flavor text bolted on after: **Infection** is introducing the
Break to a host; **Contagion** is the shared thread it travels; **Vectors**
are delivery mechanisms; **Chitin** is harvested shed casing, paid per
host broken; **Relics** are found fragments that refine the Break itself.

**Why this is load-bearing for §3/§4, not just narrative color**: the
Swarm's palette (§3.4 — moss-olive/burnt-orange/violet-magenta/cobalt/
maroon) reads organic/decay-toned *because the story says it's a body,
not a machine*. The Break needs to be the one visibly non-organic thing
on screen — see §1b's new player/UI accent decision below, which this
story directly justifies rather than an arbitrary "needed a color that
doesn't collide." Same for §4's mode choice: this is a controlled-
demolition premise (a system understood well enough to turn against
itself), not a horror premise (a monster to fear) — the concrete reason A
Dorian ("grounded, determined, not hopeless") was the correct register
against Iridescent Cosmology's D Phrygian ("tension, dread"), not an
arbitrary "pick an unused mode."

**Deliberately not decided here**: whether any of this narrative
surfaces as literal on-screen text (a menu subtitle, a run-end line) or
stays purely a design-language framing device the way Infall's own
"Cinder"/"Wells" naming never appears as prose in-game — every other
shipped game in this portfolio is wordless/mechanical in actual UI copy
(Wardfall, Infall, Sigil Chain all name their mechanics without ever
narrating them to the player), and Swarmbreak should default to that same
established convention unless a specific screen genuinely needs a line
of text to land. Flagged as open in §9 below, not assumed either way.

**New color/audio decisions this story locks in, not previously in §3/§4**:
- **Player/Break accent color**: `#5ce8e0` (clean signal-cyan) — checked
  against every reserved token the same way §3.4's table was built:
  vs `--gold` 187.4, vs `--neon` 172.6, vs `--danger` 172.9, vs `--ok`
  100.4 (closest — a real, deliberate choice: the Break is the thing
  actually keeping the player alive, so a moderate kinship with the
  safety token is thematically correct, not an accident), vs `--neon2`
  147.1, vs `--ink` 189.6, vs `--ink-soft` 152.9. Clears every band above
  the 40-flag line by a wide margin, and — unlike every hostile-tier hue
  in §3.4 — is the only cool, clean, non-organic color in the entire
  roster, which is the actual design intent, not incidental.
- **UI chrome** (buttons, HUD accents, Relic Draft panel borders): reuses
  this same signal-cyan rather than the studio's default `--neon`
  gold-adjacent chrome, so the player's own interface reads as "part of
  the Break," not generic arcade UI layered on top of an organic game.

### 1b. Screens — the studio's real, established overlay set, not invented fresh

Grounded directly in what every shipped game already has
(`menuOverlay`/`pauseOverlay`/`deathOverlay`/`settingsOverlay`/
`achieveOverlay`/`shopOverlay`/`bugOverlay`, confirmed via
`infall.html:183-289`) plus Iridescent Cosmology's own `levelOverlay`
(the real precedent for a mid-run pick-one-of-several card screen,
`iridescentcosmology.html:1961`) and `crashOverlay`
(`iridescentcosmology.html:2079`, ported per §7.4):

| Screen | Overlay id | Purpose |
|---|---|---|
| Title / Main Menu | `menuOverlay` | Logo, play button, best-run stats, links to Settings/Shop/Achievements |
| In-game HUD | `hud` (always-on, not an overlay) | Health, Chitin count, elapsed/wave timer, equipped Relic icons |
| Relic Draft | `relicOverlay` | Mid-run 1-of-3 pick — direct rename of the `levelOverlay` shape for this game's own currency (Relics, not a level-up pool) |
| Pause | `pauseOverlay` | Standard |
| Run End | `deathOverlay` | Score, Chitin earned, share card |
| Settings | `settingsOverlay` | Standard |
| Chitin Shop | `shopOverlay` | Cosmetics + relic-pool expansion (§2e/§5) |
| Relic Codex | `codexOverlay` *(new — see §9)* | Browse every relic definition ever unlocked via §2e's relic-pool-expansion currency sink; the direct analog of IC's `evoLibraryOverlay` |
| Achievements | `achieveOverlay` | Standard |
| Crash Recovery | `crashOverlay` | Built in from kickoff per §7.4, not retrofitted |
| Report Issue | `bugOverlay` | Standard |

**Deliberately not scoped**: a mode-select screen (Swarmbreak is
single-mode; nothing in §2 names a second mode, unlike Rykndu's real
Gauntlet/Duel split) and a tutorial/onboarding overlay (no shipped game in
this portfolio has one — every prior game teaches its one clear rule
through play, per §14's own mechanics test, and Swarmbreak's rule is
stated to be exactly as legible). Both named here so neither reads as an
oversight if asked about later.

---

## 2. Core mechanics

### 2a. Contagion — the chain-reaction system, with compute-safety built in

```
CONTAGION_RADIUS_BASE     = 42px    // ~2x average enemy radius — deliberately
                                       // tight, so a chain only fires in genuinely
                                       // packed clusters
CONTAGION_RADIUS_MAX      = 120px   // hard clamp, independent of relic ranks —
                                       // direct precedent: Infall's MASS_MAX clamp
INFECTION_DPS_BASE        = 6       // scales via the shared dmgMult() — see §2b
INFECTION_DURATION        = 3.0s    // FLAT. No relic, rank, or formula anywhere
                                       // modifies this — see the named risk below
MAX_CHAIN_JUMPS_PER_TICK  = 400     // hard cap per queue-drain pass; excess jumps
                                       // queue into the next tick — a big chain
                                       // visibly ripples over ~1s instead of
                                       // resolving in one frame. A juice decision
                                       // and a perf-safety decision are the same
                                       // decision here.
```

Infection damage reads the same shared `dmgMult()` every direct-hit
formula reads (§2b) — never a second, independently-tracked scalar, per
Infall's own "one authoritative field, read never re-derived" discipline.

**The central named risk — this design has the exact same shape as the
studio's original Drain incident, closed by construction, not by hope**:
total per-target infection damage = `dps × duration`. If both dps *and*
duration were allowed to scale independently, total damage would compound
the way Drain's heal-per-hit did. **`INFECTION_DURATION` is a flat
constant no relic, rank, or formula touches — only `dps` scales.** Worked
check, minimum (no relics): `totalDoT = 6 × 1 × 3.0 = 18`. Worked check,
maximum (`dmgMult` at its own computed ceiling, §2b): `totalDoT = 6 × 2.74
× 3.0 = 49.3`. Bounded, single-axis, verified.

**Second named risk, a reuse not a new design**: does standing inside a
dense, touching horde multiply contact damage by toucher count? Verified
against Iridescent Cosmology's shipped code (`iridescentcosmology.html:
4605-4614`): contact damage is iframe-gated to exactly one hit per
`iframes=0.55s` window, regardless of how many enemies are touching the
player simultaneously — a proven, already-shipped pattern, reused verbatim
here, not reinvented. This matters *more* for Swarmbreak than it did for
Game 1: standing deliberately inside dense clusters is this game's entire
premise, at densities several times Game 1's own 320-enemy cap. Regressing
this pattern would be substantially more dangerous here than there.

**Third named risk, caught by the Game Designer's own recomputation, not
assumed away**: worst-case radius scaling (all 8 relic slots on
Radius-tag relics, rank cap 3) computes to `42 + 24×8 = 234px` — large
enough that the entire visible horde would functionally be one connected
chain component almost always, quietly erasing the risk/reward tension
the mechanic depends on. **This is why `CONTAGION_RADIUS_MAX = 120px`
exists as a hard, relic-independent clamp** — a fix the recomputation
itself surfaced, not a pre-existing design decision.

### 2b. Vectors and the shared damage formula

```
dmgMult(r) = 1 + min(r,5)×0.12 + max(0,r-5)×0.06   // r = summed Damage-tag relic ranks
                                                       // curve reused from Iridescent
                                                       // Cosmology's shipped dmgMult()
                                                       // (iridescentcosmology.html:3413-3415)
```
**Correction, caught by the Game Designer's own recomputation, not
assumed away**: this was originally cited as "reused verbatim" — it
isn't, and the doc shouldn't claim it is. Game 1's real shipped function
carries a second factor, `× (1 + Persist.data.upgrades.output×0.08)`,
Game 1's permanent Grimoire-shop bonus. Swarmbreak correctly excludes
that factor — consistent with §5's "no gameplay-affecting unlocks"
decision — but the curve above is the *base* formula only, deliberately
missing one term Game 1 has, not a verbatim port. Worst case, all 8 slots
Damage-tag at rank 3 (`r=24`): `dmgMult = 1 + 5×0.12 + 19×0.06 = 2.74×`.

### 2c. Relic draft — replacing continuous leveling

`MAX_RELICS = 8` slots, drafted 1-of-3 at scripted break points (every
~30-40 kills or ~20-30s, whichever comes first), not a continuous XP bar.
Every relic answers exactly one of three questions — the relic system's
own §14 "one clear rule": **how hard do you hit, how far does a chain
reach, or how well do you survive being close enough to trigger one.**
Damage-tag (§2b), Radius-tag (§2a, clamped), Survival-tag (flat
HP/armor). The shared 8-slot economy is itself the thing bounding total
power — a slot spent on one axis is a slot not spent on another,
load-bearing, not incidental.

### 2d. Mass legibility, resolved against Infall's own precedent

Infall capped simultaneous Wells at 3 specifically because a player can't
visually decompose 4+ overlapping force fields — more instances past a
legibility ceiling is noise, not spectacle. Checked directly against that
precedent rather than assumed not to apply: **Swarmbreak's readable unit
is cluster density, not individual enemy tracking** — the contagion chain
resolves systemically (via the queue), never asking a player to manually
trace individual jump paths, the same way a fog-density read doesn't
require counting fog particles. This is the honest resolution, not an
exception to Infall's rule: raw entity count scaling doesn't violate the
legibility principle here because the player's actual task is
fundamentally different from Infall's per-source force decomposition.

### 2e. Meta-progression — Infall's rule, checked against Game 1's actual precedent

Iridescent Cosmology's own shipped meta-shop (`iridescentcosmology.html:
3413-3415, 3294`) is a real, permanent, gameplay-affecting power
multiplier (`+0.08 dmgMult`/rank, `+15 max HP`/rank) — worth stating
honestly: Infall's "no gameplay-affecting unlocks, ever" rule is *newer*
than, and contradicts, Game 1's own shipped implementation. **Decision for
Swarmbreak: follow Infall's rule, for Infall's own stated reason** — a
permanent flat multiplier would need folding into §6's compound-ceiling
proof forever, reopening it on every future currency-shop addition.

**Chitin** (meta-currency) spends only on cosmetics (Vector VFX skins,
chain-ripple palette themes, victory motif) and **relic-pool
expansion** — unlocking new relic *definitions* into the draft pool, never
buffing an existing relic's numbers, never granting starting stats. This
gives real roguelike-deckbuilder replay variety (a wider pool changes what
builds are *possible*) without ever reopening §6's proof.

### 2f. Player HP — a real gap, found by independent recomputation, blocking everything else

**Found during the quality-consolidation pass (2026-08-09), not present
in the original consultation**: this document states real infection-DoT
numbers (18–49.3 damage over 3s, §2a) and a real compound-multiplier
ceiling (§6), but **never once states a player base-HP value anywhere** —
confirmed by grep, not assumed. That's not a cosmetic omission: every
damage number in this document is a rate without a denominator, the exact
shape of the original Drain incident's own root cause ("358hp/sec against
a ~200-300hp pool" — the pool mattered as much as the rate). Nothing about
whether infection DoT, contact damage, or the new Feedback Pulse (§2g,
below) is dangerous or trivial can actually be evaluated until this
number exists. Survival-tag relic magnitude (§2c names the category, no
number) is the same gap one level down.

**Resolved by producer decision (2026-08-10): `PLAYER_BASE_HP = 100`,
flat, no per-run scaling.** Deliberately simpler than Game 1's `100 +
vitality×15` (`iridescentcosmology.html:3294`) — Swarmbreak's relic
system (§2c), not a leveling stat, is the intended power curve, so HP
itself stays a fixed denominator every other number reads against,
consistent with the "one clear rule" discipline §14 already holds the
rest of the doc to. **Damage numbers scale as percentages of this pool**,
not as independent flat values — the convention going forward for any
new damage source: state it as "≈X% of `PLAYER_BASE_HP`," the same way
§2g's worked numbers already (coincidentally) did against the borrowed
placeholder below. This closes what was the single highest-leverage open
item in this document — every Estimated damage number elsewhere (§2a,
§2g, §6) now has a real pool to be checked against, though the numbers
themselves stay Tier-0/Estimated (`SWARMBREAK_QUALITY_PLAN.md`'s
calibration gate) until a real playtest measures them.

**Survival-tag relic magnitude** (§2c names the category, no number) is
the immediate next number this unblocks — Estimated starting point:
each Survival-tag rank adds `+15 max HP` (mirroring Game 1's own
per-rank increment exactly, `iridescentcosmology.html:3294`), so a full
3-slot/rank-3 Survival build reaches `100 + 9×15 = 235` max HP — real
enough to size against Feedback Pulse and infection DoT below, still
Tier-0 until measured.

### 2g. Boss encounter — "Feedback Pulse," an extension of the core rule, not a new one

Closes §9's own previously-named gap ("no boss-fight design despite
bosses being a required entity type") with a real proposal, not just an
acknowledgment. Per §14's mechanics test, the boss should extend the
game's one clear rule, not introduce a second one.

**The boss is not immune to Infection** — a Plague Vector applies it
normally, and a boss that dies while infected attempts a normal
death-jump against nearby adds, same rule as every other entity.
Carving out boss-immunity would be exactly the kind of unrelated
exception §14 warns against, with no design reason behind it.

**The boss's one signature ability reads the existing chain-adjacency
graph rather than writing a new system**: on a timer, it finds the
nearest currently-infected enemy within `CONTAGION_RADIUS_MAX` (120px,
the existing clamp — no new constant) of itself, walks that enemy's live
infection chain toward the player up to a capped hop count, and — if the
walk reaches the player — fires, with damage scaling by **hops found**,
not by anything the player directly controls. No infected enemy near the
boss means the pulse does nothing. This inverts the game's own core
incentive (get dense, get infected, chain for score) into a real
liability near a boss specifically — the same rule, a new context, not a
new mechanic.

**Phase structure as one continuous function of `healthMargin`** (reusing
the audio team's own signal, §4), not three hand-scripted, unrelated
phases — a low-HP boss's pulse reaches farther and hits harder, one
underlying value driving the escalation.

**Compounding-multiplier check, run preemptively rather than discovered
in playtest** — every multiplier Feedback Pulse's damage formula does and
does not read, stated explicitly:
- `Feedback Pulse damage = FEEDBACK_BASE × min(hops_found, FEEDBACK_HOP_CAP)`.
- **Must NOT read `dmgMult()`** — a player stacking Damage-tag relics for
  their own offense would otherwise simultaneously buff the boss's
  counter-attack against them, the same "two reasonable-looking
  multipliers on the same stat" shape already closed once in §2a.
- **Must NOT read `comboMult()` or route through `CHAIN_KILL_BASE`** —
  this is a damage mechanic, not a scoring one; the word "chain" being
  shared by both systems is a real naming-collision risk for whoever
  implements this, flagged explicitly so it isn't wired into the score
  pipeline by accident and reopen §6's proof.
- **Should read `CONTAGION_RADIUS_MAX`** (reused, not duplicated) and its
  own small, boss-specific hop cap — distinct from `MAX_CHAIN_JUMPS_PER_TICK`,
  which caps a per-tick real-time cascade across the whole horde; this is
  one bounded query fired occasionally and needs a much smaller cap, not
  the same 400.
- **Should interact with Survival-tag relics** exactly like any other
  damage source — the intended counterplay axis, not a bug.

**Worked numbers, Estimated, now real against §2f's resolved
`PLAYER_BASE_HP=100`**: max infection DoT (49.3) is ≈49% of the pool; a
conservative starting `FEEDBACK_BASE=8`, `hop cap=6` → 48 flat damage,
≈48% of the pool in one hit — threatens without guaranteeing a kill for a
no-Survival build, and drops to ≈20% against the 235-HP full-Survival
build named in §2f. Deliberately starting conservative: walking a
punishing number down after a bad-feeling playtest is cheaper than
un-killing players during it. **No longer placeholders on a placeholder**
— Tier-1 (Estimated, with a stated intended outcome) per
`SWARMBREAK_QUALITY_PLAN.md`'s calibration gate; promotion to Tier-2/3
still needs real playtest data.

---

## 3. Visual identity

### 3.1 The genuinely hard problem this game creates that Game 1 never had to solve

Iridescent Cosmology's `FxRenderer` (`iridescentcosmology.html:2759-2968`)
is real and shipped, but narrowly scoped: it draws `particles`/`gems`, a
decorative burst layer on `#fxCanvas`, *above* `#gameCanvas` — every
enemy a Game 1 player actually reads as a threat is still Canvas-2D,
hand-authored-or-parametric, on the layer underneath. The shader itself
supports exactly two per-instance shapes (a soft analytic circle, an
L1-norm diamond — `iridescentcosmology.html:2797-2811`), no rotation, no
arbitrary silhouette, no texture (single-file-no-build rules out external
image assets). Swarmbreak inverts this: if the horde itself — the
entities a player must read as distinct threats in real time — renders
through this shader, that two-shape vocabulary has to carry actual combat
legibility, not ambient flourish, for the first time in this studio's
history.

### 3.2 Shape proposal within real shader constraints, plus one scoped extension

**Within what exists today**: assign the soft circle to the weakest, most
numerous tier (chaff) and the hard diamond to progressively tougher tiers
— the theory-correct pairing (`visual-theory-shape-motion-mapping`: circles
read safe, angular shapes read dangerous), unlike Game 1's own `swarmer`
(a fast, hostile enemy rendered as the shape theory says should read
safest — a real, still-unresolved tension that skill names explicitly).
Swarmbreak's chaff tier makes the same shape choice deliberately, with
compensating cues (count, speed, saturation) doing the "actually hostile"
work — the skill's own permitted pattern, stated here rather than left
implicit.

**Scoped shader extension, worth doing at kickoff**: two shapes is thin
for 3+ legible horde tiers. Extend `i_shape` from boolean to a small enum
(0/1/2) and add one more branch to `FRAG_SRC` computing a triangle SDF in
local space — the identical architecture the diamond already uses
(`iridescentcosmology.html:2804-2811`, "computed cheaply in the fragment
shader instead of pre-baked triangles"), no new vertex attributes, no
buffer-layout change. Per-instance rotation (for an elite "about to lunge"
telegraph) is a real, separate, larger ask (a 9th float/instance) —
flagged as a later, independently-justified addition, not bundled into
kickoff scope.

### 3.3 Hand-authored vs. parametric, per entity type

- **Player**: hand-authored, Canvas 2D, singular/permanent — reuses the
  Cinder's exact two-layer pattern (`GAME_4_PILLARS.md` §3.2: hand-authored
  base silhouette at rest, continuous velocity/thrust-driven transform on
  top), not re-derived.
- **Boss / named mini-boss**: hand-authored, full stop, per
  `faceted-gem-rendering`'s unambiguous rule — this studio has already paid
  for "reused a mass-produced entity's generation logic, scaled up" twice.
- **Elite (recurring but unnamed, embedded in the horde)**: parametric,
  GPU-batched — one of several simultaneously on screen, distinguished via
  the shape-enum + `i_size` + hue (not silhouette), the exact reasoning
  Infall applied to its interchangeable attractor wells. Explicitly the
  thinnest parametric call in this table: if playtesting shows elites still
  read as indistinguishable chaff at real density, that's evidence for a
  small hand-authored Canvas-2D overlay (the way Game 1's own `elite` gets
  an hp-ring), not evidence the parametric call was wrong on paper.
- **Chaff (the swarm bulk)**: parametric, GPU circle, correctly generic —
  load-bearing for the performance budget, the same exemption Infall's
  debris and Game 1's particles both already correctly claim.
- **Pickups (Chitin drops)**: parametric, diamond shape + `var(--gold)`
  directly — a solved, reused pattern.

### 3.4 Palette — real RGB-distance numbers against every reserved token

Checked against `--gold #ffd76b`, `--neon #ffcb5c`, `--danger #ff4d70`,
`--ok #5eff9c`, `--neon2 #b98aff`, `--ink #f4ecff`, `--ink-soft #9687c1`
(confirmed byte-identical across all shipped games' `:root{}` blocks).

| Entity | Color | Nearest reserved token | Distance | Call |
|---|---|---|---|---|
| Chaff (circle) | `#6b8f4a` (moss-olive) | `--ok` | 129.9 | Clears every band; deliberately cool/desaturated so shape+color don't both fight the "actually hostile" read — count/speed carry that instead. |
| Brute (diamond) | `#c0432e` (burnt red-orange) | `--danger` | 91.8 | Semantically correct (red family = threat); at/above Sigil Chain's own 72-94 shipped floor. Screenshot check recommended, not a violation. |
| Ranged/caster (diamond) | `#8a3fae` (violet-magenta) | `--neon2` | 120.0 | Below Infall's 130 informal comfort line but not a reserved-band collision. Screenshot check recommended. |
| Elite (larger diamond) | `#2f6fb0` (cobalt blue) | `--ink-soft` | 107.1 | Clears every band comfortably. |
| Boss (hand-authored) | `#7a1030` (deep maroon), accent-over-near-black, never base fill | `--danger` | 159.7 | Mirrors Infall's own "danger as accent, never base fill" rule — used as a direct fill this hex sits only 102.1 from `--bg`, a recede risk the accent convention avoids. |
| Chitin/pickup | `var(--gold)` directly | is gold | 0 | Reused verbatim — correct reward-band usage. |
| Infection overlay | `shadeHex(base, +40, -60)` pulsing white-desaturated | n/a — modulates existing color, not a new hex | — | See Resolved Conflict #4/#5 — avoids the green-plague collision entirely. |

**Internal-distinctness flags** (below the 130-comfort heuristic, not a
reserved-band violation): chaff-vs-elite and ranged-vs-elite both land in
the 100-125 range — a real, structural consequence of needing several
simultaneously-legible *hostile* tiers rather than one hostile entity
among mostly-neutral ones (Infall's own five-entity roster leaned mostly
cool/neutral; Swarmbreak's leans warm/hostile across four of five tiers by
genre necessity). Needs a real screenshot at actual render density before
calling this settled, not blocking kickoff.

### 3.5 The `swarmer` tension, now load-bearing for the whole game, not one enemy type

`visual-theory-shape-motion-mapping` names Game 1's `swarmer` as a real,
unverified tension — one enemy among five reading as friendlier-shaped
than it should. Swarmbreak reproduces the same mismatch **at the scale of
the entire core loop**: the soft-circle chaff tier isn't one enemy among
several, it's the overwhelming majority of every pixel a player looks at
for an entire session, compensated for entirely by non-shape cues. That
compensation is real and precedented (the skill's own "a swarm of bees is
small and round but unambiguously dangerous" reasoning) but has never been
checked at this studio, at this scale, for this genre. **Design-taste
risk: high** — needs a real screenshot/clip at actual render density and
speed before this is called solved, the same bar `STUDIO_BIBLE.md` §14
already sets for the player rig, applied here to the entire horde instead.

**Code risk: moderate.** The shape-enum extension is small and bounded;
instance-count and context-loss handling are ports of proven patterns
(§7.2). The real unmeasured risk is JS-side simulation cost (AI, targeting,
collision) for hundreds-to-thousands of independently-behaving entities —
only the rendering side has real numbers today (§7.1); simulation cost is
explicitly not yet measured, named here rather than assumed free.

---

## 4. Audio

**Sonic identity, decided for genre-correct reasons, not novelty**:
**both `PeriodicWave` wavetable synthesis and Karplus-Strong physical
modeling — doing two different jobs, not stacked as a gimmick.**

`PeriodicWave` builds the swarm pad's oscillator from hand-picked,
deliberately non-integer partials (e.g. `n`, `n×1.02`, `n×2.97`,
`n×4.01`), producing an actual beating/chittering quality no built-in
oscillator reaches — the technique's mechanism (many close, non-integer
partials) directly models the subject (many close, non-identical bodies).
Karplus-Strong (noise burst → feedback `DelayNode` loop, lowpass in the
loop) fits because this genre's core verb is continuous, repeated,
mechanical weapon fire — inherently percussive/decaying, unlike this
studio's existing sustained-oscillator pulse layers. **Genre-correctness
justifies both, not "these are on the underused list."**

**Deliberately not reached for**: Schroeder/FDN algorithmic reverb — real
and cheap, but reverb character isn't this game's identity axis (the pad
and pluck bus are); reaching for it here would be exactly the
"use-it-because-it's-unused" trap this whole exercise exists to avoid.
Held explicitly, not silently skipped. The existing synthesized
convolution-burst technique (proven, reused verbatim) covers this game's
reverb need.

**Mode: A Dorian**, not Game 1's D Phrygian — reads "minor-feeling but
optimistic/grounded" per `music-theory-mood-mapping`'s table, the correct
register for "outnumbered and fighting," distinct from Phrygian's
tension/dread. Root moved off D so the two games are audibly in different
keys, not just different modes on the same root.

**Graph scope**: Sigil Chain's scoped base plus **four** deliberate
additions (one more than Infall's three): (1) the `PeriodicWave` swarm
pad, filtered per `swarmDensity`; (2) a Karplus-Strong pluck bus,
tempo-scheduled via a lookahead JS scheduler; (3) a sidechain duck bus
(reused verbatim from Game 1) — justified more strongly here than for
Infall, since Swarmbreak's per-actor kill events are denser than Infall's
player-initiated captures; (4) **a voice-count ceiling with a steal
policy** (`adaptive-game-audio`'s documented-but-never-built
`MAX_VOICES`/oldest-first-steal pattern) — that skill names its own
trigger condition explicitly ("the moment a design starts firing audio
per-actor rather than per-local-player-action") and Swarmbreak's per-kill
stinger is the first design in this studio that actually satisfies it.
Sized against the spawn director's real kill-rate ceiling once measured,
not guessed here.

**Live mood mapping** — three zero-extra-cost signals the spawn/combat
loop already tracks: `swarmDensity` (normalized active-enemy count) →
tempo (88→138 BPM, est.) and pad filter cutoff (200→3600Hz, the one true
per-frame direct `.value` write, gated behind an `isPadActive` flag per
the bug-prevention note below); `healthMargin` → harmonic tension (open
root+6th → detuned minor-2nd/tritone, verbatim reuse of Infall's own
threshold-crossing idiom); `waveIntensity` (structural run-depth clock,
distinct from instantaneous `swarmDensity`) → section arc/instrumentation
layering, sub-bass anchor entering once and never stopped (Rykndu's
"gravity" precedent).

**Signature motif — "the Swarm Call"**: a four-note A Dorian cell (root →
♭3 → 4 → 6), three ascending Karplus-Strong plucks answered by a
`PeriodicWave` pad swell. Quoted across every cue: unaltered rising at
wave-spawn; re-colored into **Lydian** (this studio's first real
production use, not just a Trial-tier entry) at relic-draft moments, for
the "discovery/wonder" read distinct from Dorian's "grounded/determined";
degraded (pitch-shifted down, faster decay) as `healthMargin` crosses
warning thresholds; full resolution at run end, major-colored on a
survival milestone, tritone-collapsed on death.

**Bug-prevention, one documented pattern plus one genuinely new one**:
(1) the pad filter's per-frame write, gated behind `isPadActive`, same
shape as every prior game's continuous-param guard. (2) **New to this
studio**: the Karplus-Strong feedback `DelayNode`'s `delayTime` must be
set exactly once per note via `setValueAtTime`, never as a continuous
per-frame write — changing a feedback loop's delay time mid-recirculation
is a discontinuous phase shift (an audible zipper/click), a different
failure mode from the gain-ramp races this studio's existing patterns
guard against. Should be folded into `adaptive-game-audio` as its own
line item once this ships, the same way sidechain-duck became documented
after its first real use.

**Honest apex-test answer**: this design should pass "describe what's
happening from the music alone," on paper — but no code exists yet, so
this is a proposal, not a confirmed pass, stated plainly rather than
implied resolved.

---

## 5. Meta-progression

See §2e — Chitin, cosmetics + relic-pool expansion only, no
gameplay-affecting unlocks. Achievements reuse the `Achievements` module
shape verbatim (~8-10 defs: first clear, a large-chain threshold, a
Surge-survived milestone, a no-infection-triggered-death run, a
relic-pool-completion milestone). Best-stat tracking: `best: {score,
largestChain, longestComboStreak, totalChitinLifetime}`, same shape as
every existing game's `best` object.

---

## 6. Scoring (independently recomputed, worked min/max, compound-ceiling proof)

```
KILL_BASE       = 10     // per direct (player-aimed) kill
CHAIN_KILL_BASE = 4      // per contagion-chain kill — FLAT, never through comboMult,
                          // deliberately lower than a direct kill (automatic
                          // follow-on, not an aiming action) — structurally caps
                          // runaway score from an oversized chain by construction
COMBO_STEP = 0.10, COMBO_CAP = 10
comboMult(streak) = 1 + 0.10 * min(streak-1, 9)     // caps at 1.9x

killScore      = round(KILL_BASE * comboMult(streak))
chainKillScore = CHAIN_KILL_BASE                     // never multiplied
```

**Worked check, minimum**: first kill, `streak=1` → `killScore =
round(10×1) = 10`. **Worked check, maximum**: `streak=10` (cap) →
`comboMult=1.9` → `killScore = round(10×1.9) = 19`. **Worked check, a
Surge-peak chain**: `N=2,400` (this doc's own §7.1-reconciled peak range)
→ `chainScore = 2400×4 = 9,600` — large, but earned only by deliberately
standing in lethal density first.

**Every multiplier a formula actually reads, named exhaustively** (not
just the one that opened this section): `comboMult` (max 1.9x, score
only); `dmgMult` (max 2.74x, combat only — kill *rate*, never a scored
*value*); `CONTAGION_RADIUS` (clamped 120px, chain reach only, never
score); `INFECTION_DURATION` (flat, unreachable by any relic — §2a's
central fix); the contact-damage iframe gate (flat, reused verbatim);
`CHAIN_KILL_BASE` vs `KILL_BASE` (both flat, neither routed through
`comboMult` — direct precedent, Infall's `FUSION_BONUS` staying outside
`wellMult`/`comboMult`); `MAX_CHAIN_JUMPS_PER_TICK` (caps the actually
unbounded axis — computational cost — not a proxy for it).

**Compound ceiling, reported as two separate real numbers rather than one
number that would misrepresent the system**: score-multiplier ceiling =
**1.9x** (narrower than Infall's 4.26x or Wardfall's 4.7x/7.1x,
deliberately, since only one axis touches score at all here); combat-power
ceiling = **2.74x `dmgMult`, radius-clamped at 120px** — verified closed,
separately, since folding combat power and score into one ceiling number
would imply more precision than this two-axis system actually has.

**Meta-currency**: `chitin = floor(finalScore / 60)` (divisor set above
Infall's/Wardfall's `/50` deliberately — chain-wipe bonuses structurally
produce larger raw totals than either prior game's scoring, a tuning
choice to keep per-run Chitin comparable, not an oversight). Worked
modest run: 80 kills at `comboMult≈1.4` (1,120) + one mid-run chain of 300
(1,200) → `finalScore≈2,320` → `chitin=38`. Worked strong run: 400 kills
at `comboMult≈1.7` (6,800) + three Surge chains (26,400) →
`finalScore≈33,200` → `chitin=553`.

---

## 7. Engineering notes

### 7.1 WebGL2 scope — exactly which entities render batched, from day one

Inherits Iridescent Cosmology's own real split, not a new invention:
**batched WebGL2 from day one** — chaff/elite/brute/ranged enemies
(generic, high-count, told apart by shape-enum/color/size per §3.2-3.3),
player Vector projectiles, hit/death/chain-arc particles, Chitin pickups.
**Canvas 2D, stays**: the player rig (needs the continuous hand-authored
transform a batched quad can't carry), boss/mini-boss (hand-authored,
non-negotiable), floating damage text (the skill's own still-real,
unclosed gap — no glyph rendering exists), HUD/UI.

**Budget, reconciled** (Resolved Conflict #2): `MAX_INSTANCES = 4608`,
sized to the Game Designer's real peak breakdown (2,500 enemies + 500
projectiles + 600 chain-arc VFX + 400 pickups + 60 floating-text quads ≈
4,060, plus headroom). Cost is trivial regardless of exact size
(`4608 × 8 floats × 4 bytes ≈ 147KB`/upload, far under the skill's own
cited PixiJS reference of 200K-1M particles at 60fps on the identical
technique). **The real, unremoved constraint this number doesn't
capture**: CPU-side per-entity JS work — the `instanceData`-population
loop and, more importantly, collision/targeting queries for
hundreds-to-thousands of independently-pathing enemies (§7.6). Batched
instancing removes render as the bottleneck at these scales; it does not
remove simulation as one — stated explicitly so it isn't assumed solved
by the render-budget math alone.

Per-category soft caps apply inside the shared budget (mirroring Game 1's
own five separate hard caps), so a large chain-kill particle burst can't
starve the same frame's enemy-render budget.

### 7.2 Context-loss handling — inherited verbatim, not reinvented

Port `iridescentcosmology.html:2868-2887` directly: capture
`loseContextExt` at init while the context is live (the extension returns
`null` for every lookup once actually lost); `webglcontextlost`
(`preventDefault()` + `contextLost=true`) and `webglcontextrestored`
(`buildResources()` rebuild) listeners; `buildResources()` stays one
function rebuilding every GL resource from scratch, called identically
from both `init()` and the `restored` listener. Port the
`_test.simulateContextLoss()`/`simulateContextRestore()` hooks too, so
`tests/game8-fxrenderer.js` (mirroring `iridescentcosmology-fxrenderer.js`'s
naming) can actually exercise this path in Playwright, not trust it
untested.

**One real wrinkle beyond Game 1's precedent, left open rather than
silently assumed**: Game 1's Canvas 2D fallback only ever covered
cosmetic particles/gems. If Swarmbreak's batched path covers the horde
itself, a context-loss event on a low-end device pushes the *entire enemy
population* onto the exact Canvas-2D path measured at 176ms avg/1,283ms
worst under comparable load — not cosmetic degradation, potentially
unplayable.

**Resolved, per the Engineer's own quality-pass recommendation**: the
Canvas 2D fallback carries its own reduced entity cap — a degraded mode,
named as degraded, not a silent frame-rate collapse. Starting hypothesis
`FALLBACK_CAP ≈ 320`, taken directly from Iridescent Cosmology's own
measured Canvas 2D ceiling (176ms avg at that population, the same file
§7.2 already cites) rather than invented fresh. This is explicitly a
starting hypothesis, not a locked number: Swarmbreak's per-entity draw
cost is not Game 1's (different shape budget, `dmgMult`-driven visual
states, Infection-pulse overlay per §3.4) — the real Milestone-C
profiling pass (§ below, capability sign-off) must confirm or revise
`FALLBACK_CAP` against Swarmbreak's own measured per-entity cost before
this ships, the same "measure, don't assume" discipline `CELL` sizing in
§7.6 is held to. When the cap is exceeded, excess enemies past
`FALLBACK_CAP` stay in simulation (still contagion-eligible, still
dealing/taking damage) but skip their own draw call — a rendering
truncation, not a gameplay one, so a low-end player never sees invisible
damage sources.

### 7.3 Persistence — `localStorage` + `SCHEMA_VERSION`

Per Resolved Conflict #1: no IndexedDB for initial ship. Port Runeshatter's
proven pattern (`runeshatter.html:580-638`) directly — top-level
`SCHEMA_VERSION` constant, independently-versioned outer envelope and
nested session state, hard drop-to-defaults-never-migrate on mismatch
(the studio's own established policy, not a guessed migration). This
answers §2e's Chitin/relic-unlock/best-stat save shape completely; no new
persistence architecture needed.

### 7.4 Crash-safety net — built in from kickoff, the studio's own top-named open gap closed

Port `iridescentcosmology.html:5729-5803` as the actual pattern: a
`crashed` flag gates `update()`/`render()` from re-running once tripped
(so a persistently-broken render path can't re-throw every frame);
`handleCrash()` captures message/stack/a narrow breadcrumb context and
shows a state-independent recovery overlay; `recoverFromCrash()` does a
**full state reset** (every entity array, not a targeted repair) — the
file's own comment documents the live-confirmed reason: a first draft
that only reset camera state let the exact same crash recur next frame,
because stale poisoned state elsewhere re-triggered the same throw; `loop()`
wraps risky work in try/catch with `requestAnimationFrame(loop)` called
*unconditionally* at the bottom, regardless of crash state — that
unconditional reschedule is the actual fix. Keep this independent of
§7.2's context-loss recovery — different failure classes, different
correct responses, don't merge into one function. Global
`window.onerror`/`unhandledrejection` listeners registered early in
startup, per the Phase 3 registration-timing lesson.

### 7.5 Module count — enters at the top of the studio's observed range, named as a live watch item

Baseline (`Persist`, `Events`, `Input`, `Game`, `Juice`, `Music`,
`Settings`, `Achievements`, `Shop`, `FullscreenCtrl`, `Bugrep`) = 11,
matching the studio's mid-to-high range. Plus `FxRenderer` and `Grid`
(§7.6, independently justified below) = **13 total** — above Wardfall's
12, just under Game 1's 15. Checked against the three-trigger pattern:
module-count pressure is real (one trigger, borderline); real git history
and a persistent `tests/game8-adversarial.js` from initial scope (both
mandated by current studio convention) keep the other two triggers absent.
One of three doesn't cross the stated architecture-pass threshold — but
it's the axis to watch, the same flag raised for Wardfall entering Game 4.
Hold the line at 13: crash-safety and `SCHEMA_VERSION` are code patterns
inside existing modules, not new modules; meta-progression routes through
`Persist`, not a split-out module, unless real complexity earns it later
(Rule of Three).

### 7.6 Spatial-hash grid — genuinely needed, with the real caveat named, not hidden

Infall rejected a grid because that design has no O(N²)/O(N×M) mechanic
at all. Swarmbreak's core mechanic is structurally the opposite: hundreds
of independently-pathing enemies queried against the player and
potentially hundreds of Vector projectiles each frame — the exact shape
Iridescent Cosmology's own production `Grid` (`iridescentcosmology.html:
2301-2329`, `CELL=96`, `rebuild()`/`queryCircle()`, 12+ real call sites
against a real 320-enemy population) already solves, at the same order of
magnitude and the same query shape, not a coincidentally-similar different
genre's technique. **The real caveat, not glossed over**: Infall's own
finding that a grid can make things *worse* under clustering (bucket
pruning erodes when everything converges into a few cells) is a real risk
here too — Swarmbreak's whole premise is deliberately dense clustering,
exactly the condition that erodes a grid's benefit.

**Resolved, per the Engineer's own quality-pass recommendation**: the
horde gets a minimum-separation/anti-stack rule — a **soft steering
force** (boids-style separation: each enemy nudged away from neighbors
within `SEPARATION_RADIUS`, proportional to overlap, blended with its
existing seek-player steering), not a hard positional clamp. A hard
clamp fights the player's own movement and reads as rubber-banding; a
soft force degrades gracefully under the exact peak-density conditions
the caveat above names. **The one constraint this force must respect,
stated so it can't be gotten wrong silently**: `SEPARATION_RADIUS` must
stay measurably smaller than `CONTAGION_RADIUS_BASE = 42px`. If
separation force ever pushed the *typical* inter-enemy gap past 42px, it
would suppress Infection chain formation by construction — the anti-stack
fix would quietly break the game's own core mechanic. Starting value
`SEPARATION_RADIUS ≈ 18px` (well under the 42px floor, leaves room for
`CONTAGION_RADIUS_MAX`'s relic-scaled 120px to still connect separated
enemies). **Verification the Engineer specifically asked for**: an A/B
chain-length-distribution test — run identical horde-density scenarios
with the separation force on vs. off, histogram the resulting Infection
chain lengths, confirm the "on" distribution isn't measurably shifted
down from "off." If it is, `SEPARATION_RADIUS` is too large and must
shrink, not `CONTAGION_RADIUS_BASE` grow to compensate. This closes the
open design choice; `CELL` sizing itself still waits on real profiling
once code exists, per the "no fabricated numbers" discipline below.
**No fabricated profiling numbers**: no prototype exists yet; the correct
next step is porting Game 1's `Grid` implementation as a starting point,
then measuring brute-force vs. grid at real peak numbers before
finalizing `CELL` size, the same methodology Infall's own team used once
real code existed.

### 7.7 Test coverage, built in from initial scope

`tests/game8-adversarial.js` written as part of initial scope, matching
Infall/Wardfall's precedent, not Iridescent Cosmology's or Sigil Chain's
original gap. `tests/game8-fxrenderer.js` and `tests/game8-crash-recovery.js`
(mirroring `iridescentcosmology-fxrenderer.js`/`-crash-recovery.js`'s real,
shipped shape) from day one, not retrofitted after the fact — directly
answering `ENGINEERING_TEAM_UPGRADE_2026-08.md`'s own top-named open gap.

---

## 8. PWA / offline

Same three-file satellite pattern as every existing game
(`swarmbreak.webmanifest`, `swarmbreak-sw.js`,
`icons/swarmbreak-{192,512,512-maskable}.png`), built in from the first
commit per `pwa-offline-games`, service worker scope explicitly set to
`./swarmbreak.html` (never left to default to `/`, the named gotcha the
skill exists to prevent). Per `STUDIO_BIBLE.md` §13: any post-ship edit to
`swarmbreak.html` requires bumping `swarmbreak-sw.js`'s `CACHE_NAME` in
the same commit.

---

## Capability sign-off summary (Capability Auditor's real trigger conditions, restated for this doc)

| Capability | Status this doc | Real trigger for Adopt (not "because it's available") |
|---|---|---|
| WebGL2 batched instancing (horde-scale) | **Adopt** | Steady-state alone (150-400 enemies) already exceeds Game 1's proven 320-enemy Canvas 2D breaking point — the criterion fires without even invoking the Surge peak. |
| IndexedDB | **Not adopted this ship** (Resolved Conflict #1) | A genuine replay/run-history data shape, not a capped counters blob — real, not forced. |
| `PeriodicWave`/Karplus-Strong | **Adopt** | A specific instrument-voice need the built-in oscillator vocabulary can't reach — named in §4, not listed because it was unused. |
| Crash-only recovery | **Adopt** | Unconditional — this is baseline infrastructure inherited from an already-paid-for lesson, not a capability-maximization line item. |
| `SCHEMA_VERSION` | **Adopt** | Unconditional — every shipped game persists state; this is save-integrity hygiene, not optional technique. |
| Web Workers/OffscreenCanvas, WebGPU, multiband EQ, object-spatial audio, `IIRFilterNode` | **Held** | No measured bottleneck or design need justifies any of these for Swarmbreak specifically — named explicitly per the Capability Auditor's own sign-off, not silently omitted. |

**The meta-finding this document itself is evidence for or against**: five
specialists were each independently briefed toward their domain's own
underused capability. The real test — per the Capability Auditor's own
stated risk — is whether each capability above traces to a specific,
citable in-game mechanic or moment (it does, per the table) rather than
appearing because a producer directive said "use capability." That
distinction is what makes this document a real pillars doc and not five
technique demos stapled together — checkable again, the same way, once a
build exists.

---

## 9. Open items, named plainly — real gaps, not implied covered

Per this studio's own "name the gap, don't smooth it over" standard, a
direct check of this document against itself and against the studio's own
established pillars-doc convention (`GAME_4_PILLARS.md`'s full shape, used
as the rigor bar throughout) surfaces real items still open:

**Resolved since first written, per the Engineer's quality-pass
recommendations — no longer open**:
- §7.2: WebGL2 context-loss now falls back to a *reduced* Canvas 2D
  entity cap (`FALLBACK_CAP ≈ 320`, starting hypothesis pending real
  Milestone-C profiling), not a silent degraded mode.
- §7.6: the horde now has a minimum-separation/anti-stack rule (a soft
  boids-style steering force, `SEPARATION_RADIUS ≈ 18px`, held under
  `CONTAGION_RADIUS_BASE=42px` by explicit constraint) — the choice that
  determines whether the spatial-hash grid keeps its real benefit at Surge
  peak is made, with a named A/B verification test to confirm it in code.

**Resolved by producer decision, 2026-08-10 — see §2f**:
- **Player base HP** — `PLAYER_BASE_HP = 100`, flat. Was the single
  highest-leverage open item in the document (every damage-rate number
  had no pool to check against); now closed, with Survival-tag relic
  magnitude (`+15 HP`/rank) resolved alongside it as the next number down.
  Every Estimated number in §2a/§2g/§6 is Tier-1 (real target stated) as
  of this decision, not yet Tier-2/3 — still needs real playtest data per
  `SWARMBREAK_QUALITY_PLAN.md`'s calibration gate.

**Also resolved, 2026-08-10**: Resolved Conflict #1 (IndexedDB vs.
`localStorage`) — confirmed `localStorage` for initial ship, no
replay/run-history feature in scope. See §1's own updated note.

**Still open, restated here so they don't get lost in a 900+-line
document**:
- §1a: whether any story beat surfaces as literal on-screen text, or
  stays a pure design-language framing device (the portfolio default).
  Not decided.

**Not previously named — found by re-checking this doc's own shape
against `GAME_4_PILLARS.md`'s, the same cross-check discipline that
caught the five Resolved Conflicts in the first place**:
- **No control scheme.** Every prior pillars doc has one (Infall's §2
  "Launch & Control" — keyboard/stick/touch inputs stated explicitly).
  This doc never says how a player actually moves, aims, or fires a
  Vector. A real, load-bearing gap for an action game specifically, not
  a cosmetic omission.
- **No accessibility section.** Infall's §3.6 (`prefers-reduced-motion`
  scope, informational-vs-decorative split) has no Swarmbreak
  counterpart. Given §3.5 already names a high design-taste risk around
  the horde's shape-legibility, an accessibility pass (colorblind-safe
  check on the five-tier hostile palette specifically, not just the
  reserved-token RGB-distance table) is a real, not-yet-done item — the
  five-tier palette in §3.4 has never been run through a colorblind
  simulation, only a raw-RGB-distance check.
- **No WCAG contrast-ratio check on the new UI accent.** §1a's new
  `#5ce8e0` signal-cyan and the Chitin-gold HUD numbers were checked
  against `color-language-audit`'s reserved-hue distance rule, but never
  against `visual-art-director`'s own now-standing WCAG 2.2 AA
  contrast-ratio sweep (the same live Playwright check that found and
  fixed `--ink-soft` studio-wide in August). Real text-on-background pairs
  don't exist yet since there's no build, but this should be the first
  thing checked once one does, not assumed to pass because the hue
  cleared a different test.
- **Boss-fight design — now partially closed by §2g ("Feedback Pulse").**
  A real proposal exists: reads the existing chain-adjacency graph,
  damage scales by hop count found, phase structure as a continuous
  function of `healthMargin`. What's still open: it's a single boss
  concept, not a roster (no second/third boss archetype exists yet, and
  §3 implies multiple Surge climax moments across a run), and every
  number in §2g is explicitly marked contingent on §2f resolving first —
  so "partially closed," not closed.
- **No UI copy pass beyond mechanic names.** §1a's story gives Health,
  Chitin, and the Relic Draft a real thematic frame, but no actual
  HUD/menu label text is written (does the HUD say "Health" or something
  thematic? What does the Relic Draft's title read?) — left fully open,
  correctly deferred alongside the portal card per §1's own stated
  reasoning, but worth being explicit that "deferred" and "decided" are
  different things here.
- **§7.7's test-plan is thinner than its own precedent.** Infall's §7
  names the two genuinely novel pieces of logic needing explicit
  adversarial coverage (pixel→pull-target resolution, fusion
  candidate-pool edge cases). This doc's §7.7 only names test *file
  names*, not which of Swarmbreak's own novel logic (the contagion
  chain-jump queue under `MAX_CHAIN_JUMPS_PER_TICK` pressure, the 8-slot
  relic economy's edge cases, the Surge-peak instance-budget ceiling)
  needs the same explicit treatment. A real gap versus the rigor bar this
  doc claims to match, not a nitpick.
- **Every numeric constant in §2/§3/§6/§7 is Estimated, zero playtest
  data** — stated honestly throughout the document already, restated here
  as one consolidated fact rather than scattered across a dozen
  individual disclaimers, per `difficulty-curve-calibration`'s own
  reporting discipline.

**See `SWARMBREAK_QUALITY_PLAN.md`** for the full cross-team
quality/robustness consolidation report — six specialist verification
plans (Game Designer, Visual/Art, Audio, Engineer, Capability Auditor,
QA/Playtest), each stating a pre-registered, checkable bar for its domain
before any implementation exists, and a bounded, honest answer to "does
this surpass what's typical for browser gaming" per domain.

**What is genuinely NOT a gap, stated so it isn't re-litigated**: the
five Resolved Conflicts already caught and closed the cross-role
consistency risks this kind of blind-consultation process exists to
catch (vocabulary, entity-count budget, IndexedDB, infected-state color,
the plague-green collision) — those are closed, not open. The capability
sign-off table above is a real, checkable commitment, not aspirational.
This section is the honest remainder, not a signal the rest of the
document is shaky.
