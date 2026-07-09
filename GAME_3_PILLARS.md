# Game 3 Pillars — Wardfall

**Status: decided.** This replaces `GAME_3_DELIBERATION.md` — deliberation is over,
genre and name are chosen, and this document is the source of truth going into the
build. It's the synthesis of a full team consultation (Game Designer, Visual/Art
Director, Audio Designer, Engineer, Community/Marketing), not one person's take.

---

## 1. What it is

**Genre**: bubble-pop puzzle shooter (Puzzle-Bobble/Bust-a-Move lineage). A censer
at the bottom of the screen fires ward-orbs at a player-aimed angle (with wall
bounce) into a hex-packed cluster of bound spirits hanging from the ceiling.
Landing an orb that completes a connected group of 3+ same-color orbs breaks the
ward-knot in a banishing flare; anything the popped group was anchoring falls loose
too ("a wardfall of its own").

**Name**: **Wardfall**. Chosen over "Censer Rite" and "Confluence" because it names
the actual in-game payoff moment (the mechanical event of a cluster physically
collapsing) the same way "Sigil Chain" names its own core action rather than its
genre — and it does double duty as both the magical banishing term and a literal
description of the falling-orb mechanic.

**Portal card** (`index.html`, replacing the "More Worlds" placeholder):
```
Badge:      Stage III · Live Now
Title:      Wardfall
Genre line: Puzzle · Cluster-Clear
Desc:       Swing censer-fire into a rising thicket of bound ward-spirits. Bind
            three of the same ward-color and the knot breaks in a banishing
            flare — everything it was anchoring crashes free in a wardfall of
            its own. The ceiling doesn't wait on a timer; it just keeps
            descending, so the arc tightens with you.
Button:     ✦ Sound the Wardfall
Meta line:  [fill in real numbers once mechanics are locked in build — do not
             fabricate plausible-sounding stats the way the other two cards'
             meta lines report real, finalized feature counts]
```
Card art breaks from both existing cards' visual language on purpose: soft-lit
radial-gradient spheres (not faceted-shard polygons — that silhouette language is
already "claimed" by the other two cards), loosely hex-packed, with a periodic
banishing-flare beat (a trio flashes and dissolves into rising motes every few
seconds) that previews the actual core mechanic in miniature, plus a faint
upward aim-trail from the bottom edge hinting at the censer without a literal
sprite. Same `IntersectionObserver` offscreen-pause as the other two cards —
non-negotiable.

**"Expand systems" answer** (the roadmap names this as Game 3's milestone without
defining it — this is the concrete answer): a real continuous-aim, wall-bounce
trajectory/reflection system. Confirmed genuinely new — neither Wonderland's
auto-attack radius nor Sigil Chain's drag-a-chain-across-cells computes a reflected
ray. This is the system-expansion this game contributes to the studio's toolkit.

**What carries over as a hard requirement**: color-language rules, arcade-portal
back-nav (`sigilchain.html:163`'s exact anchor pattern), no accounts/no installs,
PWA/offline support built in from the start (not retrofitted, unlike Games 1-2),
accessibility designed in from the start (also unlike Games 1-2), meta-progression
as a first-class system from day one.

**What's deliberately left behind**: Sigil Chain's fixed-timer round framing
(90-second rounds) — Wardfall uses ceiling-descent as its sole pressure mechanic
instead, a genuinely different failure framing from both existing games. No
in-file changelog (Wonderland's 900-line prose changelog is a studio-recognized
anti-pattern per the Engineer's review below — rely on git history instead, the
way Sigil Chain already correctly does).

---

## 2. Core mechanics

### Grid & matching
Offset `(col,row)` 2D array (matches Sigil Chain's `grid[row][col]` idiom,
`sigilchain.html:499-500`), not axial — keeps the code readable against its
closest sibling. A new `hexNeighbors(col,row)` primitive (row-parity-indexed
6-neighbor deltas) is the only hex-specific addition. One shared
`floodFill(seeds, matchFn)` helper generalizes Sigil Chain's stack-based DFS
(`sigilchain.html:522-546`) for two purposes: single-seed match-check on the
newly-attached orb, and a multi-seed ceiling-connectivity pass that detects
orphaned (no-longer-anchored) orbs after a pop, which fall and score.

Cascading is **single-wave by construction**: pop the matched group, run the
ceiling-connectivity pass once, clear whatever's disconnected, done — not an
iterative match-3-style chain where falling orbs re-trigger further matches.
This is a deliberate simplification (stated explicitly per the studio's
"provably guaranteed, not assumed" lesson) and it's also what keeps the fall-bonus
scoring term safe from recursive multiplier risk.

### Aim & fire
Reuse Sigil Chain's unified pointer-event input as-is (`sigilchain.html:805-821`,
`setPointerCapture`) for continuous aim (mouse hover / touch drag) + fire
(tap/click). Trajectory preview: fixed-step ray march with single-axis velocity
reflection off the side walls, **capped at 2 bounces** — an explicit cap, per the
studio's compounding-scale lesson, applied here to geometry instead of a stat.
Landing cell resolved via pixel→nearest-hex-cell snap (new, bounded local search —
no closed-form inverse exists for an offset hex grid).

Gamepad: reuse Wonderland's poll-based `Input` pattern (`wonderland.html:1539-1620`,
0.15 deadzone, rising-edge fire-button guard) for left-stick aim + fire button.
**Decision**: pointer-aim and stick-aim are an explicit mode switch (whichever
device last produced input owns the aim state), not blended per-frame the way
Wonderland blends movement axes — aim direction driving a rendered trajectory line
needs one clear active source, not a continuous blend.

### Queue fairness
The genre-appropriate analogue to Sigil Chain's solvability guarantee: a newly
queued orb color may only be drawn from colors currently present among resting
orbs in the cluster (falling back to the full palette only when the cluster is
fully empty) — enforced at generation time, so a color already shown to the
player is never silently swapped out.

**Decision, stated explicitly rather than left implicit**: this is a *weaker*
guarantee than Sigil Chain's true reachability check — it's possible for every
remaining color to exist only as scattered singletons with no reachable 3-match.
That's accepted. The run still ends cleanly via ceiling descent in that case, it
doesn't hang or softlock, and that's the intended failure path for this genre, not
a gap to close later.

**Implementation note (Engineer's flag)**: build `presentColors` as a plain
rescan-on-mutation, matching Sigil Chain's own precedent of a full-board flood-fill
scan on every refill (`sigilchain.html:522-546`) — do not reach for incremental
O(1) counter bookkeeping up front. At this board size a rescan costs the same
order of magnitude Sigil Chain already pays per event, and incremental counters
introduce a real stale-state bug class for a performance win with no evidence
behind it yet. Only revisit if real profiling after play shows an actual cost.

### Difficulty curve
Ceiling descent driven by **total shots fired** (not misses-only — an explicit
decision, since misses-only pressure would let skilled players who never miss
never actually face escalation, quietly defeating the point) is the sole pressure
mechanic. No separate countdown timer stacked on top.

Both ramping axes (shots-per-descent, color count) are staggered so they don't
peak simultaneously — hitting both maxima at once stacks two difficulty axes at
once, the difficulty-curve version of the studio's "check every multiplier"
lesson:

| Phase | Colors | Shots per descent |
|---|---|---|
| 1 | 3 | 8 |
| 2 | 3 | 7 |
| 3 | 3 | 6 |
| 4 | 4 | 5 |
| 5 (endless tail) | 4 (held) | 4 (floor, held) |

Color count is capped at **4, not 6** — see §3's palette findings below for why;
a 5th/6th hue is a post-launch stretch item gated on a dedicated screenshot
legibility pass, not initial scope. Phase-boundary shot counts (`[15, 35, 60, 90]`
as a starting estimate) need real playtest calibration once shot timing exists —
flagged as an estimate, not a tuned value. Special-orb (bomb/rainbow) spawn rate
needs its own explicit bounded schedule tied to this same phase table — an
uncapped/drifting spawn rate would act as an invisible difficulty *reducer* that
silently undermines the staggered curve above.

Game over: ceiling reaches the cannon row. Score is the persisted best-run metric.

---

## 3. Visual identity

Full audit confirmed the existing cross-game `:root{}` token block
(`--bg`, `--panel`, `--panel2`, `--ink`, `--ink-mid`, `--ink-soft`, `--neon`,
`--neon2`, `--gold`, `--danger`, `--ok`, `--border`, font stacks) is byte-identical
across `index.html`/`sigilchain.html`/`wonderland.html` — Wardfall adopts this set
as-is, adds nothing that duplicates an existing value under a new name.

### Regular-orb palette — the color-language rule is more load-bearing here than in either prior game
A real RGB-distance audit (not eyeballing) found the safe zone clearing the
gold/reward, red/danger, and green/safe bands by a comfortable margin is
genuinely narrow — roughly a blue-through-violet-through-teal wedge. Every warm
hue tested collided with an existing reserved band.

**Decision**: ship 3 core colors initially, reusing existing tokens where possible
rather than inventing new hexes:
1. **Sapphire** — reuse `sigilchain.html:319`'s `#4ea8ff` verbatim (clears every
   band by 130+).
2. **Amethyst** — reuse `var(--neon2)` / `#b98aff` directly.
3. **Deep teal** — a new hex (`~#2d8f9e`), deliberately pushed further from `--ok`
   (140+ units) than Sigil Chain's own existing rune-wind/rune-earth margin
   (72-94 units) — Wardfall should not import the studio's existing weak spot,
   it should improve on it.

A 4th color (candidate: indigo `#5c6fe0`) is **not approved for initial ship** —
it's numerically safe against the reward/danger/ok bands but too close to
sapphire/amethyst *against each other*, and a puzzle game needs orb colors
distinguishable from each other more than it needs a wide hue count. Any 4th+
color requires a real screenshot check at actual in-game orb render size before
it ships, per the faceted-gem-rendering skill's own verification standard — not
a distance-math approval alone.

**Secondary discrimination cue, from day one**: each color also carries a subtle
per-color facet micro-pattern or pip glyph (à la Sigil Chain's shape-plus-color
rune identity), both as a colorblind-accessibility measure and as the mechanism
that makes a future 4th/5th hue safer to add later without relying on hue alone.
A colorblind-safe alternate palette is a natural cosmetic-shop unlock (see §4).

**Canvas color-token drift guard**: define bomb/stone/rainbow/regular-orb colors
once in a single JS constants block mirroring the CSS tokens (Canvas can't consume
`var()` directly) — not as scattered hex literals across each sprite-builder
function, which is exactly the mechanism that let Sigil Chain's own `#ffd76b`
literal drift from `--gold` unnoticed.

### Special orbs
Each earns a mechanic a plain color-match can't do, and — per the
faceted-gem-rendering skill's twice-shipped lesson — each gets its own
**hand-authored, asymmetric** vertex list. Three distinct silhouette *grammars*,
not just three differently-colored versions of one generator:

- **Bomb** — 1-ring area-clear utility. Shape: sharp outward spikes, hand-authored
  irregular angles/magnitudes (explicitly *not* an evenly-spaced
  `for(i<n) alternate long/short` loop — that's still a formula, not
  hand-authoring, even if it superficially looks spiky). Color: near-black
  obsidian base with a hot glowing-crack/fuse accent inside a couple of facets
  (an accent, not a base fill — doesn't touch `--danger`).
- **Rainbow / wildcard** — matches any adjacent color in the flood-fill check.
  Shape: soft outward asymmetric lobes (a "gentle bloom," few/no sharp points) —
  deliberately the opposite grammar from bomb's spikes. Fill: 4+ distinct hues
  cycling across facets (not the standard binary lit/dark alternation every other
  sprite uses — a rainbow orb built with the usual `i%2` two-value alternation
  will read as "a two-color gem," not rainbow).
- **Stone / hazard** — cracks over 2 adjacent pops before clearing on the third
  (direct analogue of Sigil Chain's cursed tile). Shape: jagged inward notches,
  reusing `CURSED_VERTS`'s "sharp inward notches read as broken" *principle*
  (`sigilchain.html:411-417`), not its literal vertex numbers. Color: lighter
  true ash-grey — deliberately split in lightness/saturation from bomb's
  near-black, since both starting from "neutral slate" was a real collision risk
  flagged during review.

Regular color-match orbs are correctly **exempt** from hand-authoring — per the
skill's own rule, a mass-produced/interchangeable entity with nothing else to be
told apart from can stay parametric (a uniform hexagon/circle per color is
correct here; distinctness should come from color+pip, not shape).

### Juice
Reuse proven idioms rather than inventing new ones: `comboPulseScale`/`Ease.popSettle`
(`sigilchain.html:1070`/`275`) for chain-pop escalation, scaled by event severity
the way `addShake` already is (`sigilchain.html:1024`). Distinct overlay-entrance
animations for win/level-clear vs. loss/board-overflow (the `panelPop` vs.
`roundFade`/`newBestPop` split, `sigilchain.html:61-72`) — not one generic overlay
animation for both emotional registers. The censer itself needs its own
recoil/muzzle-punch juice on fire, separate from the orb-landing pop — the direct
analogue of the enemy-attack-anticipation gap Wonderland shipped without and had
to retrofit (`wonderland.html:3333-3341`); this game's one "attack" is the censer
firing, and it needs its own signature-action feedback, not just a landing-impact
reaction. Bomb detonation gets its own shockwave/flash distinct from a plain
3-match pop; stone's crack-progression visibly reacts on *each* of its two hits,
not just the final clear.

### Accessibility (designed in, not retrofitted this time)
`prefers-reduced-motion` split exactly as already proven
(`sigilchain.html:73-78`, `wonderland.html:3346-3347`): CSS-level reduction only
touches overlay/panel entrance; canvas-drawn juice gets **amplitude-reduced**, not
zeroed or delayed; anything informational — the trajectory/aim-guide line, stone
crack visibility, bomb-radius telegraph — stays **completely untouched** by the
reduced-motion flag regardless of setting. ARIA `role="dialog"`/`aria-modal`/
`aria-label` on every panel from the first commit, matching Sigil Chain's pattern
(`sigilchain.html:156-213`).

---

## 4. Audio

Default to Sigil Chain's scoped-down graph (master → compressor → destination,
`rampGain`/`bell()`/shared convolution reverb, no duck bus, no distortion, no
sequencer) **plus exactly one deliberate addition**: a continuous low-drone voice
whose gain (and optionally lowpass cutoff) tracks `ceilingDistance` every frame.
Justification: unlike Sigil Chain's abstract, off-screen escalation (a timer/phase
index), Wardfall's danger is a literal, continuously-visible shrinking gap the
player watches during their own aiming time — one-shot stingers alone go silent
between threshold crossings and can't carry that ongoing tension. No duck bus
(nothing to pump against), no return to Wonderland's full complexity.

**Stinger map** (all via the shared `bell()` primitive except where noted):
- Shot fire — a short percussive click/noise burst (Wonderland's `playKick`-click
  style, `wonderland.html:4364-4384`), *not* `bell()` — it's a repeated action tick,
  not an accent event, and would wear out fast if melodic.
- Orb attach, no match — soft, deliberately low-key `bell()`, minimal reverb send,
  so a miss reads as neutral, not an accidental mini-reward.
- Group pop (base match) — the real `bell()` tier (Sigil Chain's `runeBell`
  weight). Pitch mapped to orb color via a fixed color→root-frequency table —
  ties the game's sound identity directly to its own visual language.
- Chain/cascade pop — pitch/volume climb per consecutive pop using the same
  equal-tempered-step technique `circleChord` already proves
  (`sigilchain.html:1147-1154`), **capped at `MAX_CASCADE_STEP = 6`** (~one octave)
  beyond which further pops in the same cascade hold flat — the direct audio
  analog of the studio's uncapped-heal-per-hit incident, applied to a pitch/volume
  ramp instead of a gameplay stat, and capped up front for the same reason.
- Ceiling-descent-step warning — a one-shot descending two-note figure at each
  threshold crossing, darker register as the run progresses.
- Near-game-over urgency — no second continuous system; the drone itself already
  carries this as `ceilingDistance` shrinks. One discrete alarm `bell()` (dissonant
  interval against the drone's root) layered on top at the first danger-threshold
  crossing.
- Game over — descending minor-flavored figure, and this handler **must**
  explicitly fade the drone via `rampGain` in the same call — see the bug-prevention
  note below.
- Achievement unlock — Wardfall's own new stinger (neither shipped game currently
  has one; achievements are silent in both today, verified by grep). Bright
  ascending two-note flourish, reusing the existing `i*900` multi-unlock toast
  stagger so audio and the visual toast queue stay in lockstep.

**Bug-prevention note, stated explicitly because it's the one place in this
design with a persistent per-frame-mutated `AudioParam`**: the drone must be
driven by exactly one pattern at a time — either a per-frame direct `.value`
write while active, or a single scheduled `rampGain` fade-out to stop it — never
both in the same window. Gate the per-frame write behind an `isDroneActive` flag
flipped false in the same call that triggers the game-over fade, or a live
per-frame write will silently clobber the in-flight fade exactly like this
studio's "dying sticks the music" incident, just in the opposite direction.
Verify live post-implementation: read `droneGain.gain.value` via Playwright at
game-over+1s and confirm it's actually near 0, not just that the ramp was
scheduled.

---

## 5. Meta-progression (first-class from day one, per the Game 2 lesson)

**Currency + cosmetics-only shop + achievements + best-stat tracking** — sized
between Sigil Chain's (achievements only, no shop — the studio's own retrospective
already calls this "far thinner" than intended) and Wonderland's full Grimoire
shop (out of scope here).

- **Currency** ("Shards"): `floor(finalScore / 50)` per run. Deliberately
  decoupled from the in-run scoring multipliers — currency is not a
  straight pass-through of `totalScore` with its own bonus layered on top, which
  would just create a fourth multiplier to check against the scoring formula's
  boundedness proof every time someone touches it later.
- **Spend on cosmetics only** — censer skins, orb palette themes (including the
  colorblind-safe alt palette from §3), background themes, pop VFX, victory
  jingle. **No gameplay-affecting unlocks, ever** — no permanent score multiplier,
  no starting bombs, no slower descent, no extra queue slot. This is the single
  most important meta-progression rule: it keeps §6's scoring-formula
  boundedness proof valid permanently regardless of how deep the cosmetic shop
  grows, instead of reopening the compounding-multiplier question on every future
  unlock.
- **Achievements**: reuse the `Achievements` module shape verbatim
  (DEFS/checkAll/toast, `sigilchain.html:1234-1251`). Target ~8-10 defs (vs.
  Sigil Chain's 3): first clear, a big-group-pop threshold, a combo-streak
  threshold, one each for bomb/rainbow/stone specials, a survival-phase-reached
  milestone, a score milestone, a no-miss-run achievement.
- **Best-stat tracking**: `best: {score, longestGroupPopped, longestComboStreak,
  totalOrbsPoppedLifetime}`, same shape as Sigil Chain's `best` object
  (`sigilchain.html:232`).

---

## 6. Scoring (independently recomputed, not asserted)

```
POP_BASE = 10   // per orb in the matched (popped) group
FALL_BASE = 20  // per orb detached and falling (genre convention: falls > pops)
BOMB_BASE = 10  // per orb cleared by a bomb blast — FLAT, never through groupMult

GROUP_STEP = 0.15, GROUP_CAP = 20
groupMult(n) = 1 + 0.15 * (min(n,20) - 3)

COMBO_STEP = 0.2, COMBO_CAP = 6
comboMult(streak) = 1 + 0.2 * min(streak-1, 5)

shotScore = round( (POP_BASE*n_popped*groupMult(n_popped) + FALL_BASE*n_fallen
                     + BOMB_BASE*n_bomb) * comboMult(streak) )
```
Worked check: minimum scoring shot (n=3, streak=1) → `10*3*1*1 = 30`. Large shot
(n=20 capped, 15 fallen, streak=6 capped) → `(710+300)*2.0 = 2020`. Compound
multiplier ceiling on the pop term: `3.55 × 2.0 = 7.1x` — higher than Sigil
Chain's own verified 4.7x ceiling, a **deliberate** deviation (bubble clusters run
physically larger than Sigil's chain lengths) not an oversight.

**Named compounding-risk items, each resolved by construction, re-verify once
real code exists**:
- Bomb stays flat-per-orb (`BOMB_BASE`, no `groupMult`) permanently. If a future
  "bigger bomb radius" upgrade is ever proposed, it needs its own explicit
  capped multiplier reviewed against `groupMult`+`comboMult` together — routing
  bomb pops through `groupMult` "for consistency" would reproduce the exact shape
  of the studio's original heal-per-hit bug (one capped axis, one uncapped
  amount, scaling through other multipliers simultaneously).
- Rainbow orbs must resolve to exactly one flood-fill call per shot — verify the
  match algorithm can't let a rainbow orb bridge two separate clusters and score
  both as independent events off one shot (a silent double-count).
- Stone/hazard orbs never enter `n_popped` on either cracking hit — only a flat
  "hazard cleared" bonus outside `groupMult` on the third (clearing) hit, since
  they were never part of an actual color match.

---

## 7. Engineering notes

- Module shape mirrors Sigil Chain's IIFE convention: `Persist`, `Events`,
  `Grid`, `Shooter`, `Match`, `Queue`, `Game` (fixed-timestep loop, same
  `SIM_DT=1/60`/`MAX_STEPS=5` spiral-of-death-guard convention as
  `wonderland.html:3468-3487`/`sigilchain.html:833-845`), `Juice`, `Music`,
  `Settings`, `Achievements`, `FullscreenCtrl`.
- **Watch scope**: this module list (11) is closer to Wonderland's count (13)
  than Sigil Chain's (9) — worth tracking as a soft ceiling, since "expand
  systems" is explicitly the mandate that invites scope creep.
- No in-file changelog — Wonderland's ~900-line prose changelog (36 entries vs.
  only 15 real commits for the whole repo, meaning granular rationale isn't
  git-recoverable) is a studio-recognized anti-pattern the Engineer flagged as
  already warranting its own future cleanup pass, separate from this game. Sigil
  Chain correctly never adopted it — Wardfall follows Sigil Chain's precedent.
- `tests/wardfall-adversarial.js` is written as part of **initial** scope, not
  bolted on after a later quality-pass commit the way Sigil Chain's was — this
  mirrors the same "first-class, not bolted on late" discipline applied to
  meta-progression elsewhere in this doc. Give the pixel→hex-cell snap function
  explicit adversarial coverage (extreme angles, corner/edge shots, near-full-board
  density) — it's the one genuinely novel piece of math in this design, and it's
  a correctness question best caught by targeted test cases, not a profiler.
- No proactive profiling needed before building: per-shot flood-fill and orphan
  detection are event-driven (not per-frame) on a Sigil-Chain-sized board; the
  bounce-capped trajectory preview is a handful of line-segment computations per
  frame, negligible. Build first, profile only if a real symptom shows up later
  — per the studio's own standing "measure before optimizing" discipline.

---

## 8. PWA / offline

Same three-file satellite pattern as both existing games (`wardfall.webmanifest`,
`wardfall-sw.js`, `icons/wardfall-{192,512,512-maskable}.png` generated from the
game's own inline-SVG favicon), **built in from the first commit this time**
rather than retrofitted the way both prior games' PWA support was. Service worker
scope explicitly set to `./wardfall.html` (the shared repo-root-directory scoping
gotcha the `pwa-offline-games` skill names) — never left to default to `/`.
