---
name: music-theory-mood-mapping
description: Use when composing a new piece of adaptive/procedural score, choosing a scale/mode for a game's musical identity, mapping mood/intensity to musical parameters (tempo, harmony, density), naming a game's musical genre reference point, or writing/extending a leitmotif. Covers real music-theory technique (mode-to-mood mapping, tempo-by-context convention, harmonic tension via interval choice, leitmotif practice) grounded in this studio's own already-proven-but-undocumented usage plus real film/game-scoring theory — read this before picking a scale or tempo from scratch, or before assuming "make it sound X mood" has no more specific answer than "add more layers."
---

# Music Theory, Mood, and Genre Mapping

`adaptive-game-audio` covers the Web Audio *signal chain* (nodes, gain
idioms, reverb, compression). `game-audio-production-suite` covers *what
categories* of music/SFX a game needs and the studio's process/convention
maturity. Neither covers *composition theory* — how a mood/intensity input
actually becomes a specific scale, tempo, or interval choice, as opposed to
"louder" or "more voices." That gap is real: this studio already has
genuinely sophisticated, evidenced music-theory technique in production
(a D-Phrygian boss arpeggio, a live continuous tempo-push system, a
tier-gated harmonic buildup, a real leitmotif quoted across two pieces) —
it's just never been extracted from the one file each technique happens to
live in into something the next game's score can start from. This skill is
that extraction, checked against real theory so it isn't just "what we
already do, restated."

## Mode → mood, grounded in real theory and our own proven usage

| Mode/interval | Real-world connotation (film/game scoring) | This studio's own evidence |
|---|---|---|
| **Major** | Bright, resolved, safe, triumphant | Runeshatter's tier-4 baseline: "major 2nd, major 3rd, perfect 5th... a bright open fifth" landing tone (`runeshatter.html:1911`) |
| **Minor** | Melancholy, dramatic, loss | `GAME_3_PILLARS.md:305`: game-over "descending minor-flavored figure" |
| **Phrygian** | Tension, mystery, exotic/unresolved dread | Iridescent Cosmology's boss theme: "150 BPM: kick + a plucked D-Phrygian bass arpeggio" (`iridescentcosmology.html:6189`) — already this studio's single clearest example of a deliberate modal choice driving a specific emotional read, not chosen incidentally |
| **Minor 2nd / tritone (as color, not full mode)** | Acute, localized tension without committing the whole piece to a dark mode | Infall's `tensionOsc` at `ROOT * 2^(1/12)` — a detuned minor 2nd above the drone root (`infall.html:1745`); `GAME_4_PILLARS.md`'s own table maps `hullMargin` thresholds directly to "open 5th → detuned minor-2nd/tritone fades in across .5→.9→0" — the same technique, independently named as a reusable idiom in that game's own design doc already |
| **Open fifth (root + fifth, no third)** | Ancient, anthemic, tonally ambiguous (neither happy nor sad) — a "held breath" | Used studio-wide as the default drone/anchor shape: Rykndu's `MOTIF_ROOT`/`MOTIF_FIFTH` (C6/G6, `prototypes/rykndu-doll-rig.html:2921`) and `SUB_C2`/`SUB_G2` sub-bass anchor; Runeshatter's tier-4 landing tone is explicitly this shape before major/minor color gets added on top |
| **Dorian** | Minor-feeling but optimistic, grounded, "cool" rather than dark — jazz/fusion register | **Confirmed unused anywhere in this studio.** A real, ready opportunity for a mood that needs to read as serious-but-not-hopeless (a mid-tier tension state, a "determined" register) without reaching for full minor's melancholy |
| **Lydian** | Dreamy, floating, wondrous | **Confirmed unused anywhere in this studio.** A real opportunity for a victory/discovery/title moment that wants "wonder" rather than "triumph" (major) or "tension" (Phrygian) |

**The check:** when a new piece needs to "feel like X," the first question
is which row above X maps to — not which existing voice/technique to reuse
louder. A mood that needs "tense but not hopeless" is a real, different
answer (Dorian, unused) from "tense and unresolved" (Phrygian, already
proven) — conflating them because both get called "tense" in a design doc
is exactly the kind of imprecision this table exists to catch.

## Tempo, grounded in real genre convention and our own proven usage

Real-world convention (game-scoring practice, cross-checked against this
studio's own actual BPM usage):

| Register | Real-world BPM convention | This studio's own evidence |
|---|---|---|
| Ambient / non-metric bed | ~60-90 BPM *felt*, often not beat-locked at all | Sigil Chain, Wardfall, Infall, Runeshatter's drones: no fixed BPM anywhere — felt through slow LFO/pulse timing, not a scheduled beat grid. This is the studio's default, not an oversight — a non-metric bed is the right choice for a background texture that must never fight a player's own sense of pacing |
| Puzzle / exploration | Slower, often 70-100 BPM, minimizes mental load competing with the puzzle itself | No shipped game currently runs a metric puzzle-tempo score — all puzzle games in this studio use the non-metric drone register above instead, a real, confirmed design choice (not a gap) |
| Action / combat | 120-140 BPM, sharpens reaction pacing | Iridescent Cosmology: `BPM = 150` base (`iridescentcosmology.html:6223`), live-modulated by `mood.tempo` (`target.tempo = (bossMode ? 1.04 : 0.94 + intensity*0.06) + nearDeath*0.035`, `:7525`) — an effective range of roughly 141-161 BPM depending on state, confirmed via the exposed `effectiveBpm: () => BPM*mood.tempo` test hook (`:7814`), not just read from a comment |
| Title / attract, reflective | Often deliberately non-metric even in an otherwise metric game — establishes calm before commitment | Rykndu's `TitleTheme`: no fixed BPM, a free-timed breathing pulse (explicitly "not beat-locked" per its own design) plus a real elapsed-time section arc (Intro→Statement→Build→Full→Tail) — structure without a beat grid |

**The check:** "should this piece have a BPM at all" is itself a real
design decision, not a default. This studio's actual practice — non-metric
for ambient/puzzle beds, a real scheduled BPM only for a piece that's
carrying primary gameplay pacing (Iridescent Cosmology's action score) —
already matches real genre convention. State which register a new piece
is in explicitly, rather than picking a BPM number because "music needs a
tempo."

## Live mood-as-input: what this studio's approach actually is (and isn't)

Real adaptive-game-music theory names two standard techniques: **horizontal
resequencing** (switch between discrete pre-composed segments — explore
music stops, combat music starts) and **vertical layering** (stems mixed
in/out live — add the drum stem for combat, remove it for exploration).
Neither describes this studio's core technique precisely, because both
assume pre-composed/pre-recorded material being selected or mixed — this
studio has none; everything is generated at the oscillator level in real
time. The honest mapping:

- **Iridescent Cosmology's mood engine is closest in spirit to vertical
  layering, but generative rather than stem-based** — `target.tempo`,
  `target.tension`, `target.density`, `target.brightness` etc. are
  continuous values recomputed every frame from live game state (HP,
  boss phase, elapsed time), not discrete layers being toggled. This is
  actually a step past vertical layering, not an approximation of it —
  a real note/filter/tempo value gets computed fresh, not selected from a
  fixed set of pre-built layers.
- **Rykndu's `TitleTheme` is the studio's one real horizontal-resequencing
  analogue** — a genuine section arc (Intro→Statement→Build→Full→Tail)
  with new material actually arriving at each boundary, the closest this
  studio gets to "switch to a different composed section," except every
  section is still generated, not pre-recorded.
- **Every drone-only game (Sigil Chain, Wardfall, Infall, Runeshatter) uses
  neither** — a single continuous generative texture with threshold-gated
  color additions (the harmonic-tension table above), which is its own
  third pattern: not sectioned, not layered, just one live signal
  responding continuously to one or two state inputs.

**The check:** don't reach for "add vertical layers" as the default answer
to "make this piece more responsive" — check which of the three patterns
above actually fits what the piece needs to respond to. A single continuous
drone with tension-color and a mood engine are different tools for
different jobs, already both proven here.

## Leitmotif: already proven, now a named, deliberate practice

Rykndu's `ringOutStinger` (the studio's existing SFX signature for a
round-winning point) was later *quoted*, not just referenced, inside
`TitleTheme`'s FM lead — the exact same root-then-fifth gesture (C6 then
G6, 70ms apart) opens the title theme before extending into a full
C-pentatonic phrase (`prototypes/rykndu-doll-rig.html:3271`). This is real
leitmotif practice (a recurring melodic cell establishing identity across
multiple pieces for the same game), done correctly once, not yet named as
a standing rule for the next game.

**The check, made explicit:** a game's signature stinger interval (the
2-3 notes used for its most important recurring moment — a win, a
level-up, a discovery) should be treated as reusable raw material for
every other piece written for that same game, not a one-off. When writing
a title theme, victory fanfare, or any second piece for a game that
already has a signature stinger, open by quoting it before writing new
material — the same test Rykndu's `TitleTheme` already passed.

## Harmonic tension as a reusable idiom, not a per-file reinvention

The specific technique — a dissonant color (minor 2nd or tritone above the
root) crossfaded in via threshold-gated `rampGain` as a tension value
rises, then faded back out as it falls — already exists independently in
at least two places (`infall.html:1745`'s `tensionOsc`, `GAME_4_PILLARS.md`
§ hullMargin table) without either citing the other. This is the same
"proven twice, never extracted" shape that produced `bell()` and the
cancel-then-set-then-ramp gain idiom in `adaptive-game-audio` — formalized
here so a third instance reuses the pattern instead of re-deriving it:

```js
// tension: 0 (consonant) -> 1 (max dissonance), already a live mood input
// in every game with a mood engine -- reuse it, don't invent a second one
const tensionInterval = ROOT * Math.pow(2, 1/12); // minor 2nd above root; use 6/12 for a tritone instead
rampGain(tensionGainParam, tension * MAX_TENSION_GAIN, RAMP_SEC);
```

## Genre identity: a real, evidenced documentation gap

`MUSIC_DIRECTION.md` (Rykndu) names its own genre reference points
explicitly — Sayonara Wild Hearts, Bastion, Sword & Sworcery — as the
target register for `TitleTheme` before a note was written. No other
game's design doc does this for its own score; `GAME_3_PILLARS.md`,
`GAME_4_PILLARS.md`, and `GAME_7_PILLARS.md`'s own Audio sections describe
technique (which nodes, which mood inputs) without ever naming a genre or
reference-artist anchor the way the visual sections routinely name a
visual reference. **Not retroactively added to the 3 shipped games' own
docs in this pass** (a genre label added after the fact to already-shipped
work is retrofit narrative, not real design guidance) — adopted **going
forward**: every future game's pillars doc names an explicit
genre/reference-artist anchor for its score in the same pass it signs off
the mood-engine's technical design, the same way visual identity already
gets a named reference.

## The real ceiling here: two proven-elsewhere techniques, unused

Placed on the same Adopt/Trial/Assess/Hold radar `game-audio-production-
suite` Part C uses, for consistency:

- **Trial — Dorian mode** for a "determined, not hopeless" mid-tension
  register (see table above). Cheap: it's a different set of scale-degree
  offsets on an already-proven oscillator/bell architecture, not a new
  synthesis technique.
- **Trial — Lydian mode** for a wonder/discovery register (victory
  screens, a new-area reveal) distinct from major's triumph or Phrygian's
  tension. Same cost profile as Dorian above.
- **Assess — true horizontal resequencing with discrete pre-authored
  segments** (beyond `TitleTheme`'s single section arc) for a game whose
  mood needs to jump between genuinely incompatible registers (calm
  exploration vs. full combat) rather than continuously interpolate.
  Iridescent Cosmology's live mood engine already covers continuous
  interpolation well; discrete segment-switching solves a different
  problem (an instant, decisive mood change) this studio hasn't needed
  yet — correctly Assess, not Adopt, until a game's actual design calls
  for a hard cut rather than a live blend.
- **Hold — polychords / chromatic-mediant modulation** for maximum
  tension moments. Real, cited film/game-scoring techniques, but this
  studio's harmonic vocabulary (open fifths, threshold-gated minor-2nd/
  tritone color, modal choice) already has headroom nobody's used yet
  (Dorian/Lydian above) — reaching for full polychordal harmony before
  using the simpler tools already at hand would be complexity without a
  proven need, the same "no padding" call `game-audio-production-suite`
  Part C already made for multiband EQ.

## Shared studio context (every agent carries this)

You work inside Kazabon Game Studio, publishing to Shin Mahou Arcade. Full
detail lives in `STUDIO_BIBLE.md` and `KAZABON_BIO.md` in this repo — read
them if you have file access before doing substantive work. If you don't,
operate from this summary:

- **Measure, don't assume.** Every real bug fix in this studio's history
  was caught by actually running the number, reading a live value, or
  taking a screenshot — never by re-reading code and calling it correct.
- **No padding.** Don't recommend a technique because a "real composer"
  would reach for it — only where a real, evidenced gap or opportunity
  exists, per this skill's own Adopt/Trial/Assess/Hold placement above.
- **This skill is Shin-Maho-Arcade-scoped** — `age-of-wonder` has no
  Web Audio music of its own.
