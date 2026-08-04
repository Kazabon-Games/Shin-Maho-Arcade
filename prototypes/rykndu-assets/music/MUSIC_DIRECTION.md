# Rykndu — Music Direction

**Status: v2 shipped 2026-08-03** (same day as v1 — part of the Rykndu
apex-standard showcase pass's audio-designer consultation, closing all
four of v1's own named deferred-scope items in full — see "v1's four
named... items — status" below). v1 was the first
real adaptive score for Rykndu — `GAME_5_PILLARS.md` §1 named "an
adaptive score via `adaptive-game-audio` (currently four dry one-shots)"
as deferred scope; v2 pushes it the rest of the way to
`STUDIO_BIBLE.md` §14's actual apex-standard bar ("a player should be
able to describe what's happening just from the music") rather than
leaving Gauntlet and Duel as one shared bed distinguished only by volume.

## Why this repo, not a game file

Every other studio asset — code, agents, skills — lives inline in a
single HTML file, no exceptions but PWA. Music is the first thing in this
studio's history staged outside a game file *before* integration: the
canonical, tested logic lives in `rykndu-doll-rig.html` itself (single-file
convention intact); this folder holds the design brief and a **reference
copy** of that same module, kept in sync manually, the same relationship
a `.claude/skills/` file has to the game code it documents — read this
before touching the Music module, don't treat the reference copy as a
second source of truth.

## The one hard constraint that shaped every choice here

`tests/rig-audio.js` §6 asserts **zero `ConvolverNode`s created across the
entire session** — a deliberate, already-tested design decision from the
v0.1.6 quality pass: Rykndu's four SFX one-shots (windup whoosh, strike
impact, miss buzzer, proximity pulse) stay dry on purpose, because "a
reverb tail would blur the exact transient onset" combat feedback depends
on. `adaptive-game-audio`'s standard synthesized-convolution-reverb
technique is **not used here** — not an oversight, a real existing
invariant this score had to work within rather than override. If a future
pass wants reverb on the music bed specifically (not the SFX), that's a
deliberate decision to make explicitly, updating the test's own asserted
scope in the same commit — not something to add quietly.

## What v1 already did (unchanged in v2)

- **A continuous 3-voice detuned drone** (sawtooth, low register — root
  ~65Hz/C2, a near-unison detune, a fifth at ~98Hz/G2) through a lowpass
  filter whose cutoff and second-voice level both track a single
  `intensity` value, 0–1, smoothed per-frame (**never** a scheduled ramp —
  see the one-shot-vs-continuous rule below).
- **`setIntensity(v)`** is the actual "mood as live input" mechanism,
  called every frame from `frame()` — v2 changes *what feeds it* in Duel
  (see below), not the mechanism itself.
- **`duck()`** — a sidechain-style pump on strike/parry connects, called
  alongside `SFX.strikeImpact()`/`SFX.parryChime()` at their existing call
  sites: a fast dip + `setTargetAtTime` exponential recovery on a
  dedicated duck-gain stage between the drone and the shared bus. This is
  the one *scheduled* automation among v1's writes — a real one-shot
  event, not a per-frame value, so it correctly uses `rampGain`'s
  cancel-then-set-then-ramp idiom (the dip) plus `setTargetAtTime` (the
  recovery), never colliding with `tick()`'s continuous writes because
  they touch different AudioParams (duck gain vs. filter cutoff / voice
  gain).
- **Shares SFX's `AudioContext` and compressor** — `Music.ensureCtx()` is
  called from inside `SFX.ensureCtx()`, so it comes alive at exactly the
  same real-user-gesture moments SFX already does (no separate call sites
  needed anywhere else in the file), and routes into the same
  `DynamicsCompressor` → `destination` chain rather than a second,
  uncoordinated signal path.

## What v2 adds — per-mode identity, closing all four named v1 gaps

- **A real Duel-specific intensity signal**, replacing v1's flat "match
  live" baseline. `frame()` now computes, only while Duel is the visible
  mode and the match is undecided: `0.25` base + `proximity * 0.40`
  (`1 - dist/(ARENA_BOUND*2)`, 0 walled-apart → 1 clinch-close) +
  `guardRisk * 0.20` (either fighter's `1 - guardMeter/GUARD_BREAK_RISK_THRESHOLD`
  while actively guarding below that threshold, `GUARD_BREAK_RISK_THRESHOLD
  = GUARD_METER_MAX * 0.25` — the same 0.25 cutoff `drawGuardMeter()`
  already uses for its own warning-color state) + `matchPoint * 0.15`
  (either score one below `MATCH_TARGET_SCORE`) — the four terms sum to
  exactly 1.0 at their combined max, so the scale still matches Gauntlet's
  own 0–1 range.
- **Per-mode identity, not just a different curve on the same bed**:
  `setMode('gauntlet'|'duel')`, called every frame alongside `setIntensity`,
  drives the drone filter's own `Q` (0.7 calm/Gauntlet vs. 2.2 tense/Duel —
  a sharper resonant peak, not just a louder one) and gates two mode-
  exclusive elements below (the clash voice, the heartbeat) so the two
  modes are now genuinely distinguishable by ear, not just by volume.
- **A Duel-only clash voice** — a fourth oscillator (sawtooth, 185.00Hz,
  the tritone of the C2 root) whose gain tracks `setDuelProximity(v)`
  directly (its own smoothed 0–1 signal, not blended through the general
  `intensity`), silent whenever Gauntlet is the visible mode. A tritone
  has no home key — the one deliberately dissonant interval in the score,
  reserved for two evenly-matched opponents in unresolved conflict.
- **A Gauntlet-only heartbeat pulse** — a real elapsed-time lookahead
  scheduler (`nextHeartbeatAt`, checked every `tick()`) firing a sub-bass
  sine sweep (90Hz → 42Hz over 180ms) at an interval that shortens as
  intensity rises (1.15s at zero intensity down to a 0.4s floor) — physical
  threat made audible as a literal pulse, silenced entirely whenever Duel
  is the visible mode or `setReducedAudio(true)` is active.
- **A signature-motif stinger** via a new `bell(freq, dur, vol)` primitive
  — the same fundamental + 2.01×-overtone sine pair `sigilchain.html`/
  `iridescentcosmology.html` already use, routed to `SFX`'s own
  `sfxGain` bus (never through `droneFilter`, so a stinger can't get
  swallowed by whatever the drone's lowpass cutoff happens to be at that
  instant). One fixed open-fifth motif (C6 1046.50Hz / G6 1567.98Hz,
  checked clear of every existing SFX/drone frequency) covers all three
  accent moments: `parryStinger()` (one quiet grace-note under
  `SFX.parryChime()`'s existing tones), `ringOutStinger()` (root then
  fifth, 70ms apart, on every scored point), and `matchWinStinger()` (a
  fuller four-note root/fifth sequence, fired *alongside*
  `ringOutStinger()` on the specific point that also decides the match —
  both fire together, not one instead of the other).
- **Reduced-audio parity** — `setReducedAudio(v)` silences the Gauntlet
  heartbeat (the audio equivalent of screen shake) and `frame()` caps
  `musicIntensity` at 0.5 whenever `prefers-reduced-motion` is active,
  mirroring `shakeMag`'s existing `reducedMotion`-gated convention
  elsewhere in the file — a player who wants combat feedback without a
  rising bed now has one.

## The one-shot vs. continuous rule, applied here specifically

Per `adaptive-game-audio`'s own "the one rule that has actually caused a
shipped bug": `tick()`'s per-frame writes (`droneFilter.frequency.value =
...`, `droneFilter.Q.value = ...`, `voices[1].g.gain.value = ...`,
`clashVoice.g.gain.value = ...`) are all **direct assignments**, never
`linearRampToValueAtTime`/`exponentialRampToValueAtTime` calls — those are
already being smoothed in JS (`intensity`/`duelProximity` both use
`+= (target-current)*0.03` every frame), so scheduling a *second* ramp on
top would fight the one already implicitly happening via repeated direct
sets, the exact "dying sticks the music" failure shape. Every genuinely
one-shot event in v2 — `duck()`'s dip, `fireHeartbeat()`'s pulse, and
`bell()`'s envelope (used by all three stingers) — correctly uses
scheduled automation instead (`rampGain`'s cancel-then-set-then-ramp,
`setTargetAtTime`, or `setValueAtTime`+`exponentialRampToValueAtTime`),
and each touches its own gain node or oscillator created fresh per call,
never a param `tick()` also writes — no collision is possible between the
continuous and one-shot writes by construction, not by luck.

## Verification (already done, live — not assumed)

`tests/rig-audio.js` re-run in full after v2 (now 15 sections, 29
assertions): **29/29 passing**, including §6's zero-convolver assertion
(v2's `bell()` stingers route to `sfxGain`, never a convolver, same as
v1) and eight new v2-specific sections (§7–14) covering: per-mode
`droneFilterQ` differentiation (0.7 Gauntlet / 2.2 Duel), clash-voice gain
tracking real proximity, the guard-break-risk and match-point intensity
terms each independently raising measured intensity above a calm/fresh
baseline, the reduced-audio cap converging real smoothed intensity back
to ≤0.5 (not just clamping the target instantaneously — verified with a
long-enough settle window to prove actual convergence, not a snapshot),
`parryStinger()`'s bell firing on a real parried connect, `ringOutStinger()`/
`matchWinStinger()` both firing (and stacking) on the point that decides a
match, and the Gauntlet-only heartbeat firing in Gauntlet and staying
silent in Duel. All other 11 stable `rig-*.js` suites re-run clean
afterward (`rig-side-profile.js`'s previously-noted flake did not
reproduce this run) — full regression, not just the new coverage.

## v1's four named "deferred v2 scope" items — status

All four closed by v2, not partially: a real Duel-specific intensity
signal (done — proximity/guardRisk/matchPoint composite, replacing the
flat baseline), per-mode motif/identity work (done — `setMode`-gated
`droneFilterQ` plus the Duel-only clash voice and Gauntlet-only
heartbeat), a signature motif/stinger (done — `bell()` plus
`parryStinger()`/`ringOutStinger()`/`matchWinStinger()`), and
reduced-motion/audio-preference parity (done — `setReducedAudio()` plus
`frame()`'s 0.5 intensity cap). No further music work is currently named
as open for Rykndu; the next thing that could surface new scope is a
real playtest pass once the vertical-slice showcase build is live.

## TitleTheme — the title/mode-select screen's own composed OST (v0.1.29, 2026-08-04)

A producer request, verbatim: "I want a soundtrack created that would have
people doubting it's web audio. The title screen for Rykndu must have the
cleanest most satisfactory OST created for a mobile game." Before this
pass the title/mode-select overlay played nothing at all — a real,
deliberate v1/v2-era decision ("audio should start on the first real
gameplay input, not the menu choice itself," `hideRyknduMenu()`'s own
comment), not an oversight. This pass keeps that reasoning intact for
gameplay's own Music module and adds a second, wholly separate module —
`TitleTheme` — scoped specifically to the screen Music was never meant to
cover.

**Why a separate module, not an extension of Music.** Music is the
adaptive GAMEPLAY score — its intensity/mode/duck machinery is built
around live combat state that doesn't exist on the title screen at all.
Bolting a six-voice composed piece onto Music's own graph would mean
either running that composition through combat-shaped plumbing it doesn't
need, or growing Music's own `tick()`/`ensureCtx()` in ways this doc's own
existing sections don't call for. `TitleTheme` shares Music's context/bus
the same way Music shares SFX's (`SFX.getCtx()`/`SFX.getBus()`, never a
second `AudioContext`) but is otherwise a fully independent module with
its own lifecycle, own master bus, own limiter, and its own lookahead
scheduler — see `rykndu-doll-rig.html`'s own `TitleTheme` module comment
(~line 2830) for the exact reasoning inline.

**The one constraint change this module makes.** This doc's own "one hard
constraint" section above pre-authorizes exactly this move: "if a future
pass wants reverb on the music bed specifically (not the SFX), that's a
deliberate decision to make explicitly, updating the test's own asserted
scope in the same commit — not something to add quietly." `TitleTheme`
builds one real `ConvolverNode` (the `adaptive-game-audio` skill's
documented exponentially-decaying stereo noise burst technique, ~1.3s
tail), fed only by the lead/countermelody/shimmer sends — never sub-bass
(would mud the low end), never the pulse (needs transient clarity), and
never SFX's four one-shots or Music's own drone, both of which remain
exactly as dry as before. `tests/rig-audio.js` §6's comment was updated in
this same commit to state precisely what it now proves (SFX/Music stay
convolver-free under that suite's programmatic-dismissal setup) rather
than implying no convolver exists anywhere in the file, per this
constraint. `tests/rig-title-theme.js` is the new suite that actually
exercises the real-gesture path and confirms the convolver count stays
pinned at exactly 1 through a run of real SFX one-shots.

**Activation and lifecycle — deliberately different from Music's own.**
Music activates as a side effect of `SFX.ensureCtx()`'s own existing
unconditional cascade (13 gameplay-input call sites). `TitleTheme` has its
own activation path: a capture-phase, self-removing `pointerdown`/
`keydown`/`touchstart` listener registered once at load. Since the menu
overlay blocks the entire page at first paint, the first gesture anywhere
is unambiguously "the player is looking at the title screen" — no
overlay-visibility check needed. On first fire it calls both
`SFX.ensureCtx()` (which, as an accepted, known side effect of its own
existing cascade, also starts Music) and `TitleTheme.ensureCtx()`.
`hideRyknduMenu()` gained one new line, `TitleTheme.stop()` — a real
scheduled fade (scheduler halted first, then the master bus ramped to
near-silence over ~1.6s, then the module's continuously-running
oscillators get a scheduled `.stop()` past the fade) rather than an
instant cut. Once stopped, `TitleTheme` never restarts for the rest of the
page session, even if `window.reopenRyknduMenu()` is used — layering a
second, uncoordinated six-voice piece back over a live adaptive gameplay
score would directly contradict the "produced, not mixed" goal this
feature exists for. No crossfade-coordination code was needed with Music:
both start on the same gesture, so Music's own independent fade-in and
TitleTheme's fade-out on stop simply overlap on the shared bus — that
overlap **is** the crossfade.

**One consistent tonal identity, not a coincidence.** `TitleTheme`'s
sub-bass layer uses the exact same two pitches Music's own drone root/
fifth already use (65.41Hz/C2, 98.0Hz/G2) — deliberately, because Music's
drone quietly starts as a side effect of the very same `SFX.ensureCtx()`
cascade `TitleTheme`'s own gesture handler triggers, so the incidental
bleed reinforces rather than clashes. The FM lead's opening phrase
literally quotes `ringOutStinger()`'s own exact gesture (root C6 1046.50Hz
then fifth G6 1567.98Hz, 70ms apart) before extending into a full
C-pentatonic phrase (C-D-E-G-A) built off the same root/fifth this file's
signature motif already establishes — one consistent melodic vocabulary
across SFX stingers, the gameplay score, and this new piece.

**Six real voices over a real 32-second section timeline** (Intro →
Statement → Build → Full restatement → Tail, `T_STATEMENT`/`T_BUILD`/
`T_FULL`/`T_TAIL` = 6/14/22/29s): a sub-bass continuity anchor that is
never stopped/restarted for the module's whole lifetime (same philosophy
Music's own drone voices already use, so every cycle after the first finds
it already running rather than re-attacking); a 5-oscillator unison-stack
pad (±14 cents spread, phase-randomized start) through a shared lowpass,
routed to both a dry tap and a chorus send (a ~22ms `DelayNode` LFO-
modulated per the standard chorus trick) with its own slow stereo-pan LFO;
an FM lead (real 2:1-ratio FM synthesis — a sine modulator into the
carrier's own `.frequency` AudioParam, not a filter/waveshaper
approximation) that states the signature motif and the extended phrase;
an FM countermelody using the same recipe at a gentler modulation index,
panned opposite the lead, entering only in the Build section (the piece's
one "a new instrument arrives" depth moment, not a wall-to-wall doubling
of the lead from the start); a free-timed soft pulse (a 110→55Hz sine
sweep, fired on its own elapsed-time interval — deliberately NOT locked to
the section timeline's own clock, this is a menu, not a rhythm cue); and a
sparse highpassed noise-burst shimmer, mostly wet through the reverb send.

**Scheduling: the lookahead pattern, not Music's `tick()`.** Per
`adaptive-game-audio`'s own "one-shot vs continuous" rule (also restated
in this doc's own section below), discrete note/section events need the
standard Web Audio lookahead-scheduler pattern (a `setInterval` re-checking
section-entry times against `ctx.currentTime` a fraction of a second
ahead) — the same idiom `iridescentcosmology.html`'s own `schedulerTick()`
uses, not Music's per-frame `tick()`/rAF pattern, which is right for
continuous smoothed parameters (Music has none of TitleTheme's own
per-frame writes at all — every write in this module is either a
fixed-duration section-entry `rampGain()` call or a note's own
self-contained envelope, so the "dying sticks the music" collision class
this doc already names cannot occur here by construction).

**`TitleTheme._test.previewFromSection(name)`** — a fast-iteration hook
(`'statement'|'build'|'full'|'tail'`, plus `'intro'`) that hushes every
layer but the sub-bass and fires the requested section immediately rather
than waiting out the real 32s cycle, used repeatedly while tuning this
composition by ear (or, in this environment's case, by live `AudioParam`
inspection — see the task report for the explicit statement that no
speakers exist here).

**Judgment calls, named plainly, not asserted as final.** The FM
modulation indices (`LEAD_FM_INDEX = 2.0`, `CM_FM_INDEX = 0.9` — Hz of
peak deviation is `carrierFreq * 2 * index`), the reverb's 1.3s tail
length, and the relative gain balance between the six voices were all
picked by ear/judgment during this pass and verified only to the extent
that every scheduled value lands exactly where the code says it should
(confirmed live via Playwright — see the task report for the actual
numbers read). None of this replaces a real human listening pass; that
pass is the actual gate for whether the piece hits the "doesn't sound like
Web Audio" bar it was written for.

**Verified live** (not read and judged plausible): the full node graph
traced by `.connect()` call type (exactly 1 `ConvolverNode`, 1 `DelayNode`,
3 `StereoPannerNode`s, 2 `DynamicsCompressorNode`s — SFX's own plus
TitleTheme's own separate limiter); every bus's `.gain.value` sampled at
real elapsed-time checkpoints through a full natural 32s cycle (not
`previewFromSection` shortcuts) confirmed each layer swelling in at its
own section and landing at its exact intended target (pad dry 0.16, lead
dry 0.5, countermelody dry 0.22, shimmer reverb send 0.55, etc.), decaying
in Tail, and the sub-bass holding rock-steady at 0.34 throughout; a second
natural cycle's own Statement re-firing correctly (pad/lead ramping back
up a second time) confirming the loop itself, not just one pass through
it; and `TitleTheme.stop()`'s master-gain decay sampled at four real
checkpoints (0.850 just before stop → 0.847 → 0.582 → 0.258 → 0.0001 across
~1.7s after stop) confirming a genuine, monotonic scheduled fade, not an
instant cut or a stuck ramp — see `tests/rig-title-theme.js` §7 for the
exact assertion.
