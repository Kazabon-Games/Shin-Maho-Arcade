---
name: game-audio-production-suite
description: Use when scoping a new game's audio pillars before writing any code (what music/sound categories does THIS game actually need, genre-agnostic), or when auditing an existing game's audio completeness against the full production suite. Also the reference for how far past the basic Web Audio node graph this studio has actually pushed — read the "ceiling" section before assuming a technique is out of reach or already tried.
---

# Game Audio Production Suite

**Why this exists (added 2026-08-04):** Rykndu shipped a full apex-standard
showcase pass — Music v2, a new attack, a visual-identity integration, a
qa-playtest gate — and still had zero title-screen music until someone
asked for one directly, not because a checklist caught the gap. The
`TitleTheme` that closed it is real, produced work (see
`prototypes/rykndu-assets/music/MUSIC_DIRECTION.md`), but the fact that a
whole *category* of game audio went unbuilt through an entire pillars pass
is the actual finding here: **nobody had ever written down what a game
needs musically, in general, so every game re-derives it under deadline
pressure, one gap at a time.** A grep-verified capability audit run
alongside this skill's own creation confirmed the pattern is worse than
one missing category — see Part B below.

## Part A — The taxonomy, genre-agnostic

Two families: **music** (tied to a screen/state, usually wants its own
identity) and **event-driven sound** (tied to a moment, not a screen).
For each: what it's for, the cheap Web Audio pattern this studio already
knows how to build it with, and real precedent if one exists.

### Music, by screen/state

| Category | What it's for | Cheap pattern | Studio precedent |
|---|---|---|---|
| **Title/attract** | First impression before any commitment — sets tone. | A short (20-40s) composed cycle, own module, own lifecycle (starts on first gesture, stops on commitment) — see `MUSIC_DIRECTION.md`'s `TitleTheme` section for the full pattern (6-voice split, lookahead scheduler, not `tick()`). | **Rykndu only** (`TitleTheme`, 2026-08-04). Confirmed absent everywhere else — see Part B. |
| **Menu/pause** | The player stepped OUT of tension, not into it — usually calmer than both title and gameplay. | Cheapest real option: reuse the title theme's own pad/ambience layer (bus already exists, split by voice) with the lead/percussion muted — a `rampGain` on the existing sends, not a second composition. | **Nobody has a distinct pause piece.** Every shipped game's "pause music" is the live gameplay drone forced toward silence or a muted mood-branch — a modifier on the same track, not its own identity. Real, confirmed gap (Part B). |
| **Main gameplay OST** | The bulk of playtime. Static (one loop) fits low-interactivity genres; adaptive (state-driven) fits anything with a real tension curve. | `adaptive-game-audio`'s whole existing skill — this is the one category the studio is already strong at. | **Universal and adaptive** across all 6 games — the one category with zero real gap. |
| **Victory/defeat/results** | The moment of consequence — silence here reads as unfinished. | A resolving phrase or stinger distinct from mid-run stingers — see Rykndu's `matchWinStinger()` (a 4-note sequence vs. `parryStinger`'s single grace-note) for the "bigger event = bigger stinger" principle. | Iridescent Cosmology and Rykndu have real, distinct stingers. Wardfall/Infall have one shared round-end cue (no real binary win state to differentiate). **Runeshatter has a real win state and ships silence for it — a confirmed bug, not a design gap, see Part B.** |
| **Transition/loading** | Usually skipped; a 2-3s sting instead of dead air reads as intentional, not free. | A short, low-cost bell/riser — Iridescent Cosmology's transition riser (a one-shot buffer, `:6773`) is the closest existing precedent, though it's framed as an FX cue, not a formal category. | Not formally tracked anywhere; worth naming as its own line item next time a game's pillars doc gets written, not assumed covered by "the game just cuts." |

### Event-driven sound

| Category | What it's for | Cheap pattern | Studio precedent |
|---|---|---|---|
| **UI sound** | Menu nav, hover, confirm/cancel, settings toggles — sound turning an interface from decoration into something that responds. | A single shared `uiClick(freq, dur)`-style primitive (the same fundamental+overtone `bell()` idiom already used for stingers, just quieter/shorter/pitched lower — no new synthesis technique needed) wired into every `.btn`/menu `onclick`. | **Confirmed zero across all 6 games and every menu/settings/pause control in the studio's history.** The single largest, cheapest, most universally-applicable gap this audit found — see Part B, it's not close. |
| **Gameplay SFX / foley** | Sound tied to physical action (hits, whooshes, footsteps). | The studio's own four-to-five-voice one-shot pattern (Rykndu's `windupWhoosh`/`strikeImpact`/`missBuzz`/`proximityPulse`, each game's own equivalent set). | Universal — every game has this, well-established. |
| **Stingers/jingles** | Short musical punctuation on a specific event, distinct from both the ambient score and a plain SFX hit — sits between the two. | `bell()`-family primitives (fundamental + ~2× overtone sine pair), built on a fixed signature-interval motif per game. | Rykndu (`parryStinger`/`ringOutStinger`/`matchWinStinger`, all built on the same open-fifth motif) is the cleanest example in the studio; other games have narrower equivalents. |
| **Ambience/room tone** | A continuous, NON-melodic background bed — gives a space a sense of *place*, distinct from the tonal score. | Filtered noise (pink/brown-ish via a lowpass on white noise) at very low level, or a very slow-moving non-harmonic texture — deliberately NOT tied to the mood engine's root note, or it's just another drone voice, not ambience. | **Confirmed zero anywhere.** Every "drone"/"atmos" bed in this studio's games is tonal and harmonically tied to the mood engine's root — real music, not ambience, even where the name suggests otherwise. Worth building once, properly, before assuming any current bed already covers this. |
| **Notification/unlock cues** | Achievement unlocks, new-best-score, etc. — a sound to go with the visual toast. | A short 2-3 note ascending motif fragment, cheap. | **Split**: Wardfall and Infall pair `Achievements.toast()` with a real sound (`Music.achieveFlourish()` / `Music.stingerAchievement()`); Sigil Chain and Iridescent Cosmology's `Achievements` module is toast-only, silent. Not a universal gap, but an inconsistent one — worth closing on whichever game gets touched next. |

## Part B — Real, grep-verified gap audit (2026-08-04, not estimated)

Full per-game table and every grep command run lives in the capability
audit that grounded this skill (available in this session's own history;
summarized here so this skill stays self-contained):

- **UI sound: zero, everywhere, no exceptions.** Every `.btn`/menu/
  settings/pause `onclick` across all 6 games calls a state/logic function
  directly — `grep -rn "playClick|playUI|playMenu|playSelect|playConfirm|
  playCancel|playToggle|uiBeep|menuBlip"` across the whole studio returns
  zero hits outside Rykndu's gameplay-only attack SFX. This is the single
  highest-leverage, lowest-cost fix available — the pattern already
  exists (`bell()`), it just needs wiring into controls nobody's wired it
  into yet.
- **A real bug, not a design gap: Runeshatter's win/lose musical
  silence.** Runeshatter has a genuine binary win state (`levels` mode,
  `won` flag, distinct `LEVEL CLEARED`/`RUN ENDED` result text,
  `runeshatter.html:1357`) and emits `Events.emit('game:over', ...)` on
  it (`:1267`) — but **zero listeners exist for that event anywhere in
  the file**, confirmed by grep. The drone just silences because
  `droneTick` gates on `Game.isRunning()`. This is the exact "correct in
  isolation, disconnected in practice" shape `adaptive-game-audio`
  already names for Sigil Chain's dead `musicGain` bus — a real,
  fixable, single-cause finding, not a scoped-out design choice like
  Wardfall/Infall's lack of a binary win state.
- **Pause/menu music as its own identity: zero, everywhere.** Every
  game's pause behavior is a gain-gate or filter-shut on the live
  gameplay drone (`droneTick` zeroing gain on `isPaused()`/`isRunning()`,
  or Iridescent Cosmology's mood-modifier-without-branch-change) — not a
  separate composition. Real gap per Part A's own "menu/pause" row.
- **Ambience/room-tone: zero, everywhere** — every continuous bed in
  every game's music module is tonal, part of the adaptive score, not a
  non-melodic environmental layer.
- **A proven technique that hasn't propagated.** `runeshatter.html`
  (this studio's most recently authored game file) already uses real
  `PannerNode` 3D spatial panning (`makeColumnPanner()`, `:1592`) and
  `setValueCurveAtTime` non-monotonic envelope automation
  (`applyShatterEnvelope()`, `:1608`) — both live, connected, and
  self-cited in that file's own comments as a prior capability-audit
  finding acted on. **Neither technique exists in any of the other five
  games.** This is the exact "one file, and that file is the most
  recently worked-on one" signal `capability-auditor.md`'s own method
  names as "hasn't propagated yet, not unwanted" — a real Trial-quadrant
  retrofit candidate, not a fresh idea.

## Part C — The real ceiling: six techniques this studio has never used, researched fresh (2026-08-04)

Every technique below was checked against the actual codebase first
(confirmed zero real usage of all six, not assumed) and then researched
externally for how it'd actually get built here. Framed in
`capability-auditor.md`'s own Adopt/Trial/Assess/Hold vocabulary.

**Adopt (already proven, just needs to spread)** — not a new technique,
the propagation finding above: Runeshatter's `PannerNode`/
`setValueCurveAtTime` pair.

**Trial (a real, concrete opportunity, cheap enough to try soon):**

- **Wavetable synthesis via `PeriodicWave`.** Every oscillator in the
  studio's history uses only the 4 built-in types (sine/sawtooth/square/
  triangle) — confirmed by grep, 58 direct `.type =` assignments, zero
  `createPeriodicWave`/`setPeriodicWave` calls anywhere. `PeriodicWave`
  lets an oscillator's harmonic content be specified directly (an array
  of Fourier coefficients — real/imaginary partial amplitudes) instead
  of picking from 4 fixed shapes. Cheap to try: build a `PeriodicWave`
  with a few hand-picked harmonics (e.g., odd-only + a slightly detuned
  2nd partial) for a genuinely new timbre distinct from every existing
  voice in the studio, no new node types, no AudioWorklet, works today.
- **Schroeder/FDN algorithmic reverb as a `ConvolverNode` alternative.**
  Every reverb in the studio — Iridescent Cosmology, Sigil Chain,
  Wardfall, Infall, Runeshatter, and Rykndu's new `TitleTheme` — uses the
  same exponentially-decaying-noise-burst convolution technique,
  confirmed exclusively, zero exceptions. The classic alternative
  (Schroeder, 1962; still the standard cheap algorithmic reverb
  architecture): several parallel comb filters (a `DelayNode`, each with
  a different delay time in the ~30-50ms range, with its own output fed
  back into its own input through a feedback `GainNode` — the "comb"
  frequency response is the point) summed together, then run through 2-3
  series allpass filters (shorter delays, ~5-17ms, also self-feedback,
  but allpass so they diffuse without coloring the tone). Real advantages
  over convolution for THIS studio specifically: no buffer generation
  (cheaper to build, nothing to tune via `Math.pow(1-i/len, decayExp)`
  guessing), and every parameter (room size via delay times, decay via
  feedback gain) stays live-tunable via `AudioParam`s instead of baked
  into a buffer at `ensureCtx()` time — meaning a reverb that could
  genuinely respond to game state (a bigger "room" during a boss phase)
  the way `TitleTheme`'s convolver currently can't. Worth a real trial on
  the next game that wants reverb, compared directly against the existing
  convolution approach rather than assumed better.
- **Karplus-Strong / physical-modeling synthesis for plucked/percussive
  timbres.** Confirmed unused (the studio's one `DelayNode`, Rykndu's
  chorus, is a one-way modulated send, never fed back into its own
  input — a genuinely different pattern). The core technique: a short
  buffer of noise (or any short excitation) fed into a `DelayNode` whose
  output is connected back into its own input through a feedback
  `GainNode` (< 1, so it decays) with a `BiquadFilterNode` (lowpass) in
  the loop to soften the signal each pass — the loop's own delay length
  sets the pitch (like a vibrating string's length), and the lowpass
  makes each repetition duller than the last, mimicking a real plucked
  string or struck object losing high-frequency energy over time. All
  stock nodes, no AudioWorklet, no buffer pre-generation needed beyond
  the initial noise burst. A real, cheap way to get a genuinely different
  *class* of timbre (plucked/struck/percussive-resonant) than anything
  the studio's oscillator-based voices can produce.

**Assess (real, but genuinely more complexity/risk than this studio's
current scale justifies trying blind):**

- **`AudioWorklet` for true custom DSP.** Confirmed zero usage. The
  actual frontier here — code running on the dedicated audio rendering
  thread with direct per-sample access, not just wiring together stock
  nodes. **The single-file-no-build concern is resolved, not a blocker**:
  `AudioWorkletProcessor` code can be registered via
  `audioWorklet.addModule(URL.createObjectURL(new Blob([processorSource],
  {type: 'text/javascript'})))` — the processor's own source stays an
  inline string in the same HTML file, same convention every other
  module in this studio already follows, no separate file, no bundler.
  What actually makes this Assess-not-Trial: real payoff (custom
  oscillator algorithms with proper anti-aliasing via PolyBLEP, granular
  synthesis at sample-accurate timing, genuinely novel DSP) requires
  writing and debugging real per-sample DSP code, a materially different
  skill and debugging model than composing with stock nodes — worth a
  deliberate, scoped first trial (one small, well-bounded voice) before
  treating it as a general new toolset, not a blind first attempt on a
  real deliverable's critical path.
- **Granular synthesis.** Confirmed zero usage. Real technique (many
  short, overlapping `AudioBufferSourceNode`s with staggered start times/
  durations/pitches, played from one source buffer) for evolving,
  textural, non-repetitive-sounding pads/atmospheres — genuinely useful
  for the "ambience/room-tone" gap Part B just confirmed is real and
  currently zero. Assess rather than Trial specifically because it's
  CPU-heavier (many simultaneous short-lived nodes, real garbage-
  collection pressure on mobile) than anything else on this list, and
  this studio's games are mobile-first — worth a real profiling pass
  before committing it to a shipping game, not assumed cheap.

**Hold (deliberately not pursued, named explicitly rather than silently
never mentioned):**

- **Multiband/dynamic EQ.** `WaveShaperNode` IS already used in 3 of 6
  games (Iridescent Cosmology, Sigil Chain, Runeshatter) — but only as a
  tension-gated whole-bus distortion/drive effect, never as steady-state
  per-voice warmth/saturation, and no multiband split (separate
  frequency-band processing via parallel `BiquadFilterNode` crossovers)
  exists anywhere. Held, not trialed, because the studio's existing
  single-band `DynamicsCompressorNode` limiters already do real, tested
  work at this studio's actual mix complexity (up to 6-8 simultaneous
  voices) — multiband processing solves problems (frequency-specific
  masking in a dense, 20+ voice orchestral mix) this studio's music
  doesn't yet have. Real technique, correctly not a priority yet — a
  confirmed non-finding per `capability-auditor`'s own convention, not an
  oversight.

## Part D — What this actually recommends, ranked

1. **UI sound** — the single highest-leverage, lowest-cost, most
   universally-applicable gap. Every game already has the `bell()`-style
   primitive; this is wiring, not new synthesis.
2. **Fix Runeshatter's dead `game:over` listener** — a real, confirmed
   bug (silence on both win AND loss despite a real win state existing),
   not a scope decision, cheap to fix once someone's back in that file.
3. **Propagate Runeshatter's `PannerNode`/`setValueCurveAtTime` pair** to
   the other five games — proven technique, confirmed not yet spread.
4. **Ambience/room-tone as a genuinely new, non-tonal bus** — real gap,
   real cheap pattern (filtered noise), not currently confused with the
   existing tonal drones.
5. Everything in Part C's Trial tier, tried on whichever game's next
   audio pass has room for it — not urgent, but no longer unresearched.

This skill does not implement any of the above — see `audio-designer`
for that. It exists so the next game's pillars doc, and the next
capability audit, start from this list instead of re-deriving it.
