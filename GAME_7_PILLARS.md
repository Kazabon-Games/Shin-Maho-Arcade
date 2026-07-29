# Game 7 Pillars — Runeshatter

**Status: decided.** This is the synthesis of a full team consultation (Game
Designer, Visual/Art Director, Audio Designer, Engineer, Capability
Auditor), matching `GAME_3_PILLARS.md` and `GAME_4_PILLARS.md`'s process.
It resolves every open item left in the Phase 1 intake handoff (`GAME 7 —
CLAUDE CODE HANDOFF.md`, §8) with a producer decision and stated rationale,
the same shape as Infall's Core/Cinder merge in `GAME_4_PILLARS.md`.

---

## 0. Pre-Phase-0 findings (resolved before any of this was written)

Per the handoff's own §0 instruction — check repo state, flag contradictions
instead of silently overwriting — three things surfaced and were resolved
before this document was drafted:

1. **Numbering.** The handoff assumed "Game 7" without verifying the
   portfolio actually has an unclaimed Game 6/7 slot. Repo audit found: Game
   1 (Iridescent Cosmology), Game 2 (Sigil Chain), Game 3 (Wardfall), Game 4
   (Infall) are shipped; **Game 5 is Rykndu** — a side-view fighting game
   with a full doll-rig/IK system, in progress in `prototypes/`, unshipped,
   with no portal entry and no `studio-internal` handover doc yet (a real
   gap, not this document's problem to fix). **Game 6 is the Wonderland RPG**
   project living in the separate `age-of-wonder` repo (`wonderland/`) — a
   diceless Final Fantasy Tactics-lineage engine, confirmed by Kazabon as
   the real Game 6, currently engine-complete with no UI/content layer yet.
   Neither is in this repo, so neither was visible to a Shin Mahou
   Arcade-only search — that's why it needed the producer's confirmation
   rather than a repo grep. **Game 7 stands as correctly numbered.**
2. **Skill/pattern claims.** The handoff's claim that `multi-step-intake-form`
   is one of "the existing `.claude/skills/`" and that a `goTo(n)` navigation
   function is already "consistent with existing studio pattern" don't hold
   literally: this repo's `.claude/skills/` contains only
   `adaptive-game-audio`, `faceted-gem-rendering`, `pwa-offline-games`
   (confirmed against `GAME_4_PREP.md`'s own verified count, which matches).
   `multi-step-intake-form` is a session-level build skill, not a
   repo-vendored one — fine to use, just not literally "already in
   `.claude/skills/`." No shipped game actually uses a function named
   `goTo(n)`; screen flow so far has been ad hoc per game. Both are sound
   design choices on their own merits — adopted below — not citations of
   precedent that turned out not to exist.
3. **Genre collision.** No shipped game is a true swap-adjacent match-3
   (Wardfall is click-to-pop cluster-clear; Sigil Chain is drag-chain
   connect). "Match-3-style" appears only as a description of Wardfall's
   cascade behavior. Genre is clear to claim.

---

## 1. What it is

**Genre**: swap-adjacent match-3+ with bomb creation and bomb-chain
detonation (Bejeweled/Candy Crush lineage), arcane/explosive theme — runes,
sigils, elemental bursts, mana-shatter. Single-player, single self-contained
document.

**Name: Runeshatter.** Names the actual in-game payoff moment — a matched
rune cluster shatters, and a shattering bomb can shatter its neighbors in
turn — the same way "Wardfall" and "Sigil Chain" name their own core action
rather than their genre. Distinct in sound and construction from all four
existing titles (no `-fall`, no `-chain`, no `-cosmology`).

**Core mechanic** (unchanged from the Phase 1 intake, confirmed sound):
standard swap-adjacent match-3+; a match of 4 creates a **line-clear bomb**;
a match of 5 creates a larger **area bomb**; bombs chain when a detonation
reaches a neighboring bomb tile; board starts at 4 tile types and scales to
6 as difficulty thresholds cross (mechanic shared across all three modes,
only the threshold *basis* differs).

## 2. Board

**8x8, confirmed over the alternative of a larger or smaller grid** —
recomputed, not assumed. For an R×C grid, the count of 3-in-a-row match
windows is `R*(C-2) + C*(R-2)`. At 8x8 that's 96 windows; expected
pre-existing matches on a random fill at `96/colors²` gives 6.00 (4 colors)
→ 3.84 (5 colors, −36%) → 2.67 (6 colors, −31% further, −56% total from 4
colors). This confirms 4→5→6 colors is the right difficulty lever (each
step removes roughly a third of obvious matches) and that 8x8 keeps the
floor at 6 colors (2.67 expected matches) safely above frequent-deadlock
territory — a 6x6 board would drop to 1.33 at 6 colors, a real risk given
bombs clear large chunks at once and can starve the board of matches faster
than a plain match-3 would. 8x8 also matches Sigil Chain's own precedent
(`sigilchain.html:383-410`) and keeps bombs feeling screen-filling rather
than diluted. **Build a reshuffle-on-no-legal-move guard into the
mode-agnostic core from day one** — the 6-color state is the one actually
near the risk floor.

## 3. Tile-type tier mapping

**Base four (ship at tile-tier 1): fire, frost, verdant, lightning.**
**Tier-5/6 unlocks: void, then light** (light gated last as the
reward-adjacent capstone element, kept visually and semantically clear of
gold/`--ok`/`--danger` tokens per the cross-game consistency remit).

Per-mode thresholds (Game Designer's numbers, **explicitly estimates
pending real playtest data** — same honesty standard Wardfall's
`PHASE_BOUNDS_SHOTS` and Infall's phase table both stated for themselves):

| Mode | Basis | 5th tile (void) | 6th tile (light) |
|---|---|---|---|
| Endless | cumulative score | 3,000 | 15,000 |
| Timed Survival | elapsed time | 45s | 110s |
| Levels | level number | level 6 | level 16 |

Survival's gap is deliberately between Sigil Chain's compressed single-round
pacing (20/45/70s) and Infall's stretched multi-minute ramp (40/90/150s),
since a Survival run is longer than one Sigil Chain round but resets on
board-clear. Endless's 5x gap between tiers (not linear) reflects that score
accrues faster once combo multipliers build, so a flat-time-equivalent
threshold would under-gate the later tier.

**Flag for whoever builds the scoring formula next**: tile-type count is
currently the *only* scaling axis. Bomb-chain frequency naturally rises when
tile-type count is low (more matches → more bombs → more chains) — if a
combo/chain score multiplier is added later, check it against tile-type
count the same way Wardfall checked `groupMult`×`comboMult`, so "fewer
colors = harder" and "fewer colors = bigger payout" don't silently become
two multipliers reading the same axis unexamined.

## 4. Levels mode — structure

20-level initial list, `{level, tileTypes, objectiveType, target, moveCap}`:

- **1–5** (4 types): tutorial arc, alternating `clearColorCount` and
  `reachScore` objectives, `moveCap` 20 → 18.
- **6–15** (5 types): both objective types combined per level (e.g. L10:
  reach 4,000 score in 16 moves), `moveCap` tightens 18 → 15.
- **16–20** (6 types, held): `moveCap` continues tightening 15 → 13 as a
  *second*, independently-staggered difficulty axis — tile-count and
  move-budget deliberately don't both peak at once, the same "don't hit
  both maxima simultaneously" discipline Wardfall/Infall both used.

All numbers here are estimates pending a human playthrough — treat as
untuned until measured, exactly like §3's thresholds.

## 5. Visual identity

Runeshatter is the **third** rune/orb tile-clearing game in this portfolio
(after Sigil Chain's drag-chain runes and Wardfall's click-pop orbs) —
distinctness from both is a real, checkable requirement, not a nice-to-have,
per `faceted-gem-rendering`'s own warning it has "shipped generic twice and
been fixed twice."

- **Shape idiom**: a faceted-gem base (shared studio technique, hand-authored
  asymmetric vertex lists per the skill's mandatory rule — no `ngonVerts(sides)`
  reuse across types) with a **rune sigil line-drawing overlay carved on
  top** — a third silhouette language, distinct from Sigil Chain's single
  hand-authored silhouette and Wardfall's orb-plus-colorblind-pip.
- **Motion signature**: tiles **idle-pulse** (slow breathing glow keyed to
  element) — a motion language neither sibling game has. **Lightning is a
  deliberate, named exception**: no idle-pulse, instead an instant
  snap/flicker with no rest state, because lightning read as *discontinuous*
  is the more honest expression of the element than a slow breathing glow
  would be. Named explicitly here as an intentional exception, not an
  inconsistency to fix later.
- **Element color/shape language** (fire: sharp jagged spikes, fast upward
  flicker, warm red-orange; frost: crystalline hexagonal facets, slow
  drift/shimmer, cold blue; verdant: organic curved/leaf-notch silhouette,
  gentle sway, green; lightning: angular zigzag, snap motion, cool
  white-blue `#c9e8ff` — kept off pure gold to avoid colliding with reward
  semantics; void: inward-notched, near-black body **with a cold cyan rim
  (`#4fe6ff`)** — deliberately *not* a purple family, since `#b98aff` is
  already used twice in this portfolio (Sigil Chain's shadow rune, Wardfall's
  amethyst) and a third near-identical hue would be exactly the
  few-RGB-units-apart collision the cross-game consistency remit flags;
  light: radiant starburst using outward *ray strokes* beyond the
  silhouette, not just more spikes, to read as distinct from Sigil Chain's
  own light rune).
- **Particle signature**: **directional shatter-shards** along the match
  axis for normal clears (angular fragments, additive `lighter` blend,
  studio-wide technique) — visually distinct from Sigil Chain's radial glow
  flares and Wardfall's ring shockwaves.
- **Bomb objects**: match-4 → an elongated glyph with directional
  arrow-facets along the match axis, idle-rotating to signal "primed."
  Match-5 → a radial rune-circle glyph with orbiting satellite shards.
  Detonation: line bomb fires a fast directional shard-sweep down its
  row/column (linear adaptation of Wardfall's shockwave concept); area bomb
  fires Wardfall's actual ring-shockwave idiom verbatim
  (`wardfall.html:1449-1451` — "this is a blast, not a flock of flares" is
  already the correct read, reuse it rather than reinvent it).
- **Chain detonation**: when a detonation reaches a neighboring bomb, that
  tile visibly **flash-primes for one beat** before its own detonation fires
  ~80–120ms later — staggered, not simultaneous, so a chain reads as a
  legible cascade.
- **Reach for genuinely unused technique** (Capability Audit, zero hits
  anywhere in the portfolio today — apex standard means reaching for these,
  not settling for the proven-safe subset again): `ctx.clip()` for a
  rune-reveal/mana-drain mask effect on tile creation/removal;
  `createPattern()` for a subtle arcane-parchment/cracked-stone board
  backdrop (distinct from Sigil Chain's flat panel); `createConicGradient()`
  used *inside actual gameplay* (currently only used in portal/menu chrome)
  for the area-bomb's "mana surge" detonation sweep.
- **Verification requirement, not optional**: the paired-glyph tile concept
  and the void color choice both need a real screenshot/video comparison at
  render size against Sigil Chain's and Wardfall's tiles side by side before
  shipping — a code read is not sufficient, per this skill's own repeated
  lesson.

## 6. Audio — mood engine, built in from Phase 0/1

**Decision: procedural audio ships from day one, not deferred.** The
"silent v1" option from the intake's §8 is rejected. Per
`STUDIO_BIBLE.md` §14, a mood engine designed in from the start (not
discovered as a later "still sounds flat" identity pass) is the floor since
Game 4, and Sigil Chain already proves a live per-frame mood engine is cheap
to wire the moment match-resolution events exist — there's no dependency on
final visual work, only on the event shape being stable.

**Three live inputs into one drone/filter/distortion graph** (a real mood
engine, not a bigger switch statement):
- **Tile-tier count (4→6)** drives harmonic color and filter brightness —
  root+fifth at 4 tiles, each added tier layers one color tone (b7, then
  tritone) and opens the filter — a structural/difficulty signal, so it
  shifts harmony, not tempo.
- **Chain "heat"** — a decaying value incremented per bomb-chain link, decayed
  per frame — is the climax driver: opens the filter sharply, adds a
  rhythmic pulse layer, raises distortion amount. This is the one parameter
  that reads as "something big is happening," independent of mode.
- **Mode-specific urgency** reuses Sigil Chain's exact `urgency = (10 -
  remaining)/10` idiom verbatim: keyed to time-remaining in Survival,
  moves-remaining in Levels, and elapsed-run-time-vs-current-tier in
  Endless (which has no natural "remaining" counter, mirroring Iridescent
  Cosmology's elapsed-time escalation instead).

**New synthesized SFX** (all built from primitives already proven in this
codebase — oscillators, noise buffers, biquad filters, envelope gain,
WaveShaper distortion, convolution reverb; no new synthesis technique, only
new mappings): bomb-charge rising sweep (~200→900Hz through a sweeping
bandpass, 250-400ms, layered filtered noise); detonation (noise burst
through a fast-closing lowpass envelope + pitch-swept sine thump for line
bombs, wider burst + 3-note `bell()` chord through reverb for area bombs);
chain escalation (extends Wardfall's `comboBell` step-up idiom per
detonation within a chain window, distortion tied directly to the mood
engine's heat variable); tier-up fanfare (a short original 3-5 note
ascending motif — Runeshatter's own signature, not Iridescent Cosmology's
halo motif reused).

**Reach for genuinely unused technique**: `notch`/`peaking` `BiquadFilterNode`
types (zero uses anywhere in this portfolio today — only lowpass/highpass/
bandpass have ever shipped) for chain-escalation filter sweeps;
`setValueCurveAtTime()` (zero uses anywhere) for a non-monotonic
crack–rebound–decay shatter-impact envelope; spatial `PannerNode` mapped to
grid column (currently only static `StereoPannerNode` width exists) so a
chain reaction sweeping across the board pans with it.

## 7. Engine architecture

**Module layout** (IIFE-per-concern, the studio's proven convention,
staying under Wardfall's 11-module ceiling): `Persist`, `Events`, `Board`
(the mode-agnostic engine — grid, swap-validate, match-detect,
bomb-creation/chain-resolve; **must never contain a mode-name branch**),
`ModeRuleset` (three thin objects — Endless/Levels/Timed — exposing only
`checkWin`/`checkLose`/`difficultyForTurn`, consumed by `Board` through a
small interface), `Nav` (the `goTo(n)`-style screen switch — this
establishes the pattern for this repo, it doesn't reuse an existing one),
`Juice`, `Music`, `Settings`. 8 modules, real headroom before the ceiling.

**Cascade resolution — new territory, not a Wardfall port.** Wardfall's own
cascade code is explicitly single-wave by its own comment
(`wardfall.html:1008-1010`): match once, one orphan-drop pass, done, no
re-check loop — correct for a board with no gravity-refill and no
bomb-triggers-bomb mechanic, but a **correctness bug if ported naively
here**, since a popped cell refilling and causing a new match, or a bomb
landing next to another bomb, both require actual re-checking.
`Board.resolveToFixedPoint()` runs pure, synchronous logic — match → clear →
gravity → refill → re-check-for-matches, looped until stable, bomb
detonations flattened into the same clear-set before gravity runs — so
board *state* is always instantly correct. Visual *playback* drains from a
separate animation queue at its own pace, decoupled from state resolution
(mirrors the implicit split already in Wardfall's `Juice` module, made
explicit here because chain length is unbounded in a way Wardfall's isn't).
Build a deterministic test hook (`Board._test.setBoard`, matching Wardfall's
`Grid.setRows` pattern) from day one for testing cascades and chain triggers
deterministically — not after the first cascade bug.

**Save schema** — two top-level keys, not one blob, because they have
different lifetimes:
```
{
  schemaVersion: 1,
  highScores: { endless: n, levels: n, timedSurvival: n },
  session: null | {
    schemaVersion: 1, mode, boardGrid, tileTierIndex,
    score, movesOrTimeRemaining, levelIndex, rngSeed
  }
}
```
`highScores` is append-only, rarely migrates. `session` is discarded (not
migrated) on any schema mismatch — resumability is a convenience, not a
save-file contract. This deliberately does not follow `infall.html`'s
`Persist` module, which has no explicit version field and migrates ad hoc —
a real gap in existing precedent, not something to copy forward for a
board-shaped state that's much harder to hand-patch.

**File-growth risk**: a bomb-chain match-3 with 3 modes, a live mood engine,
and cascade animation state is architecturally closer to Iridescent
Cosmology's scope (6,304 lines, the studio's own named example of
"changelog-as-version-control, no persistent test suite" risk in
`STUDIO_BIBLE.md` §9) than to Sigil Chain's (1,779 lines). `tests/
runeshatter-adversarial.js` ships in the initial commit, not bolted on,
covering fixed-point cascade termination, bomb-chain-triggers-bomb, and
save-schema-mismatch/corrupt-session recovery — the three genuinely novel
logic pieces here.

## 8. Screens

Mode select → (Level select, Levels only) → Main board → Pause/resume →
Game over/results, driven by the `Nav.goTo(n)` function established in §7.
No light/dark theme toggle — dark arcane is the fixed identity.

## 9. Build order (unchanged from the intake, now grounded)

1. `phase0-scaffold` — version marker + changelog
2. Mode-agnostic `Board` engine + `ModeRuleset` wrappers + deterministic test hook
3. `local-state-persistence` — the two-key schema in §7
4. `multi-step-intake-form` navigation pattern → `Nav`
5. `adaptive-game-audio` → `Music`, built in parallel with core mechanics per §6, not deferred
6. `browser-test-harness` once real features exist
7. `bug-report-widget` pre-ship
8. `worldbreaker` — adversarial pass, last gate

## 10. Portal integration note

When Runeshatter ships, it becomes the **5th title live in the Shin Mahou
Arcade portal** (Stage badge tracks portal shipping order, not internal Game
number — Games 5 and 6 are real but neither is in this portal yet). Portal
card badge: **Stage V · Live Now**. Confirm this framing with the producer
at ship time in case Rykndu (Game 5) ships into the portal first.
