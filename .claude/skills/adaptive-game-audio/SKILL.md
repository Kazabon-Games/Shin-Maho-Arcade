---
name: adaptive-game-audio
description: Building, extending, or debugging synthesized (no audio-file-asset) Web Audio music/SFX for a Kazabon Game Studio browser game. Use before writing or debugging any Web Audio code — covers real, previously-shipped bugs and their fixes, not general Web Audio API documentation. Read this before touching a game's Music module, and before deciding how much of the full technique a new/smaller game actually needs.
---

# Adaptive Game Audio

This studio's games are 100% synthesized — no audio file assets, no
samples, everything built from oscillators/noise buffers/filters at
runtime. Reference implementation: `wonderland.html`'s `Music` module
(the full technique) and `sigilchain.html`'s `Music` module (the same
primitives, deliberately reduced graph — see "How much do you actually
need" below). Read both before writing new audio code; don't invent a
new synthesis approach when one of these two already covers the need.

## The one rule that has actually caused a shipped bug

**One-shot automation and continuous per-frame updates are different
patterns — mixing them is the single most common real bug in this
codebase's audio history.**

A long ramp across a fixed duration (a riser leading into a boss, a fade-out
on stop) should be **one** scheduled `exponentialRampToValueAtTime` /
`linearRampToValueAtTime` call, left alone to finish. A value that's already
being smoothed continuously in JS every frame (a drone gain tracking a
live `intensity` variable) should be **set directly** each frame, not
ramped again on top of an already-smoothed value — a fresh ramp cancels
whatever ramp was already in flight before it completes.

**The real incident this rule exists because of** ("dying sticks the
music"): a fade-to-0 on stop was scheduled to *end* before a per-frame
tick's own ramp — scheduled one frame earlier — had finished. Per the Web
Audio spec, an automation event with an earlier end time than an
already-scheduled future one is undefined behavior; in practice the fade
was silently dropped and the drone never actually stopped.

**The fix, and the mandatory idiom for every gain change in either game's
`Music` module** (`wonderland.html:4287-4301` / near-identical in
`sigilchain.html`'s `rampGain`):

```js
function rampGain(param, target, seconds){
  const t = ctx.currentTime;
  param.cancelScheduledValues(t);   // clear whatever's already queued
  param.setValueAtTime(param.value, t); // anchor the ramp to the CURRENT actual value
  param.linearRampToValueAtTime(target, t+seconds);
}
```

Cancel-then-set-then-ramp, every time, no exceptions. A gain change that
skips this is the exact bug class that already shipped once.

## Reference techniques (both proven in production, cite line numbers when reusing)

**Sidechain duck-bus** (`duckBus`/`duckPump`, `wonderland.html` Music
module) — the actual "pumping produced mix" trick: route the pad/drone
through an extra gain node (`duckBus`) instead of straight to the music
bus; on every kick hit, briefly duck that gain down and let it recover
(`linearRampToValueAtTime` down fast, `exponentialRampToValueAtTime` back
up). This is what separates a "layered synths on top of each other" mix
from one that reads as actually produced.

**Synthesized convolution reverb, no audio file** — build a `ConvolverNode`
whose buffer is a short burst of exponentially-decaying stereo noise
(`Math.random()*2-1` scaled by `Math.pow(1-i/len, decayExponent)`),
generated once at `ensureCtx()` time. Gives bell/stinger voices real space
without a single audio asset. Both games' `reverb` nodes use this — copy
the buffer-generation loop verbatim, don't hand-tune a new decay curve
per game unless there's a specific reason.

**Per-voice stereo width via `StereoPannerNode`** — Wonderland's supersaw
lead pans 2-3 detuned oscillator voices across a small spread
(`pan: -0.28/0/+0.28`) using real `createStereoPanner()` nodes per voice,
not a manual dual-mono-with-gain trick. This is the reference pattern any
future multi-voice stack should reuse for width.

**One shared `bell(freq, dur, vol)` primitive, reused for every stinger
tier** — a two-oscillator (fundamental + slightly-sharp overtone) sine bell
with an exponential attack/decay envelope. Both games use one `bell()`
function for every accent event (level-up, victory, a rune clear, a
"Closing the Circle" moment) — only the frequency/duration/volume differ
per event, and a *composed* moment (Wonderland's `playVictoryPhrase()`, a
5-note motif + landing chord; Sigil Chain's `circleChord()`, a 3-note
triad) is built by calling `bell()` multiple times at once or in sequence,
not by inventing a new synthesis voice per moment.

## How much do you actually need — don't default to the full graph

Wonderland's full chain (master → distortion waveshaper → compressor →
destination, with a musicGain/sfxGain split, a sidechain duck bus, a step
sequencer, and a phrase/intensity system) exists because it's driving a
continuous, adaptive trance/hardstyle score across a long action run. A
smaller or calmer game does **not** automatically need all of that.

Sigil Chain's own Music module is the worked example of scoping down
correctly: one master gain → one `DynamicsCompressor` → destination, no
duck bus, no distortion, no step sequencer — just `rampGain`, `bell()`,
and the shared convolution-reverb technique, because a puzzle game's
audio need is a stinger set, not a continuous produced mix. When starting
a new game's audio, default to Sigil Chain's smaller shape and only add a
piece of the full graph (ducking, distortion, a scheduler) when there's an
actual in-game reason for it — not because Wonderland has it.

## Verification — this is not optional

**Verify live, not by reading the code.** This environment often has no
real speakers. "Verify live" means driving the actual `AudioContext` via
Playwright and reading real `AudioParam`/gain values at runtime, or
patching `AudioContext.prototype.createOscillator` to record actual
`start()` call times/frequencies and asserting on those — not trusting that
correct-looking code produces the intended sound. Before restructuring an
audio graph (splitting a bus, adding a send), grep every `.connect(...)`
call site first and enumerate them explicitly — a missed connection is a
silent partial regression (a volume slider that "mostly" works, one voice
immune to it), not a crash, so it ships unnoticed unless checked.
