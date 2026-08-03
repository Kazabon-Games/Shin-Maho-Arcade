# Rykndu — Music Direction

**Status: v1 shipped 2026-08-03.** First real adaptive score for Rykndu —
`GAME_5_PILLARS.md` §1 named "an adaptive score via `adaptive-game-audio`
(currently four dry one-shots)" as deferred scope; this closes that gap at
a scope appropriate to a still-prototype game, not the full apex-standard
mood engine `STUDIO_BIBLE.md` §14 describes for a shipping title.

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

## What v1 actually does

- **A continuous 3-voice detuned drone** (sawtooth, low register — root
  ~65Hz/C2, a near-unison detune, a fifth at ~98Hz/G2) through a lowpass
  filter whose cutoff and second-voice level both track a single
  `intensity` value, 0–1, smoothed per-frame (**never** a scheduled ramp —
  see the one-shot-vs-continuous rule below).
- **`setIntensity(v)`** is the actual "mood as live input" mechanism,
  called every frame from `frame()` with a value derived from real combat
  state:
  - **Gauntlet**: the closest live enemy's travel fraction (`e.t`, 0 at
    spawn → 1 at melee range) — tension rises as a threat closes in, the
    same signal `proximityPulse()`'s own three SFX stages already key off.
  - **Duel**: a flat elevated baseline while the match is live and
    undecided — a real proximity/exchange-based signal (closing distance,
    guard-break risk) is named as v2 scope below, not faked here.
  - **Either mode, resolved** (`sessionState==='lose'` while Gauntlet is
    showing, or `matchOver` while Duel is showing): intensity eases toward
    a low, settled value — the fight is over, the bed should say so.
- **`duck()`** — a sidechain-style pump on strike/parry connects, called
  alongside `SFX.strikeImpact()`/`SFX.parryChime()` at their existing call
  sites: a fast dip + `setTargetAtTime` exponential recovery on a
  dedicated duck-gain stage between the drone and the shared bus. This is
  the one *scheduled* automation in the module — a real one-shot event,
  not a per-frame value, so it correctly uses `rampGain`'s
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

## The one-shot vs. continuous rule, applied here specifically

Per `adaptive-game-audio`'s own "the one rule that has actually caused a
shipped bug": `tick()`'s per-frame writes (`droneFilter.frequency.value =
...`, `voices[1].g.gain.value = ...`) are **direct assignments**, never
`linearRampToValueAtTime`/`exponentialRampToValueAtTime` calls — those are
already being smoothed in JS (`intensity += (target-intensity)*0.03`
every frame), so scheduling a *second* ramp on top would fight the one
already implicitly happening via repeated direct sets, the exact
"dying sticks the music" failure shape. `duck()`'s dip is the only
scheduled automation in the whole module, and it's on a completely
separate AudioParam (`duckGain.gain`) that `tick()` never touches — no
collision is possible between the two by construction, not by luck.

## Verification (already done, live — not assumed)

`tests/rig-audio.js` re-run in full after adding this module: **14/14
still passing**, including §6's zero-convolver assertion. The new drone
oscillators (sawtooth, ~65Hz/65.3Hz/98Hz) don't collide with any existing
SFX assertion's type/frequency filters (`square` @ 200/206Hz,
`sine` @ 240/400/550/750/880/1320Hz) — checked deliberately, not by
coincidence, before picking these exact values.

## Named, deferred v2 scope (not this pass)

- A real Duel-specific intensity signal (player proximity, guard-meter
  state, a near-ring-out moment) instead of the current flat "match live"
  baseline.
- Per-mode motif/identity work — v1 is one shared bed for both modes,
  distinguished only by intensity curve; `STUDIO_BIBLE.md` §14's apex
  standard ("a player should be able to describe what's happening just
  from the music") wants Gauntlet and Duel to sound identifiably
  different, not just louder/quieter versions of the same bed.
- A signature motif/stinger tying into `bell()`-style accent moments
  (round win, a parry, a ring-out) — today those still only get SFX, no
  musical punctuation.
- Reduced-motion/audio-preference parity check — Rykndu already respects
  `prefers-reduced-motion` for visuals; no equivalent audio-intensity cap
  exists yet for a player who wants combat feedback without a rising bed.
