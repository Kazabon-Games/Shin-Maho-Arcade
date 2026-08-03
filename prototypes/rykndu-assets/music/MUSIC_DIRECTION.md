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
