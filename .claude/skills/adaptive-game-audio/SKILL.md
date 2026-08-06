---
name: adaptive-game-audio
description: Building, extending, or debugging synthesized (no audio-file-asset) Web Audio music/SFX for a Kazabon Game Studio browser game. Use before writing or debugging any Web Audio code — covers real, previously-shipped bugs and their fixes, not general Web Audio API documentation. Read this before touching a game's Music module, and before deciding how much of the full technique a new/smaller game actually needs.
---

# Adaptive Game Audio

This studio's games are 100% synthesized — no audio file assets, no
samples, everything built from oscillators/noise buffers/filters at
runtime. Reference implementation: `iridescentcosmology.html`'s `Music` module
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
`Music` module** (`iridescentcosmology.html:4308-4322` / near-identical in
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

**Sidechain duck-bus** (`duckBus`/`duckPump`, `iridescentcosmology.html` Music
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

## A node existing is not evidence it's connected

**This has already shipped as a real bug twice, in the same shape both
times:** a gain node gets created, gets wired to a UI slider that reads and
writes its value, and every individual line of code looks correct in
isolation — but nothing ever actually routes a signal into it, so the node
sits there doing nothing. Sigil Chain's `musicGain` node was exactly this:
created, connected onward to the master bus, UI-wired to a working slider,
and never once had an upstream source `.connect()`ed into it — caught by
`capability-auditor`, not by reading the code, because a code read sees a
plausible node graph, not a live one. Iridescent Cosmology shipped the same
failure mode a second time under a different name (fixed as "dead musicGain
routing" when the continuous mood-engine pad/drone was added) — two
independent instances of the identical bug class on two different games,
which is exactly the signal this skill exists to stop from becoming a third.

**The check, not just the reminder:** a node's existence, its `.connect()`
to a downstream destination, and a UI control that reads/writes its
`.gain.value` are three separate facts. None of them implies the other two.
Before calling any bus/node "wired up," trace the signal path in the
*upstream* direction too — confirm something actually calls `.connect()`
**into** this node, not just that this node connects onward. A node with a
working slider and a downstream connection but no upstream source is the
exact shape both real incidents took.

## Reliability under load and long sessions (added 2026-08-05)

Every technique above was proven against this studio's actual games —
single-player or local-2-player, short sessions, a human-authored, bounded
set of sound-triggering actions. A real capability audit (2026-08-05,
prompted by the producer asking whether the current architecture would
"carry its weight" if a future project needed far more concurrent sound
sources and far longer sessions than anything shipped today — an MMO-shaped
scenario named explicitly, not assumed) checked that assumption directly,
with live evidence, not speculation. Two findings below are real, live
today, independent of any future project; one is a real gap correctly not
yet worth building against.

**Mandatory idiom, now: resume the AudioContext on visibility restore, not
just pause on hide.** Real browsers suspend a page's `AudioContext` when a
tab is backgrounded — documented, common, especially on mobile — and every
game in this studio except one shipped with *zero* path back to sound
afterward, discovered by literally suspending a live context, restoring
visibility, and checking whether `ctx.state` ever returned to `'running'`.
The subtle trap: a `visibilitychange` listener that only pauses on hide
*looks* like it handles this (a shallow grep for `visibilitychange` finds
it) but does nothing on restore — Iridescent Cosmology shipped exactly this
disguised version, its own changelog reading as if the concern was closed
when the resume half was never written. `runeshatter.html`'s pattern is the
correct, proven shape — copy it verbatim, don't reinvent:

```js
document.addEventListener('visibilitychange', () => {
  if(document.hidden){
    if(running && !paused) togglePause();
  } else if(typeof Music !== 'undefined'){
    Music.ensureCtx(); // must actually resume an existing-but-suspended ctx, not just create-if-missing
  }
});
window.addEventListener('blur', () => { if(running && !paused) togglePause(); });
```

The trap inside the trap: most games' `ensureCtx()` is written as
`if(ctx) return;` — a pure create-if-missing guard that does nothing for a
context that already exists but is `suspended`. Confirm (don't assume)
that whatever function the restore branch calls actually checks
`ctx.state === 'suspended'` and calls `ctx.resume()` in that case, or the
listener is present and still silently does nothing.

**A real, currently-masked gap, correctly not yet built: no voice-count
ceiling or steal policy anywhere in the studio.** Every `bell()`/`uiClick()`/
stinger call unconditionally creates new nodes — there is no cap on
simultaneous active voices and no eviction policy (oldest-first, quietest-
first, priority-based) anywhere. This is genuinely safe *today*: a live
stress test firing 150 overlapping one-shot voices through a real
compressor measured a peak output sample of 0.7257, nowhere near clipping,
and the compressor's `.reduction` swung from -13.89dB to -1.42dB — visibly,
measurably absorbing the load. It stays safe only because no shipped game
currently wires audio to a high-density event source (per-enemy hit/kill
events fire zero audio in every game checked; the human player's own
actions are the only trigger path today). The moment a design starts
firing audio per-actor rather than per-local-player-action — the literal
MMO shape, many *other* sources of sound competing for the same bus — this
becomes load-bearing. **The pattern, ready to use when that day comes, not
before:**

```js
const MAX_VOICES = 24; // tune per game; this is a starting point, not a measured value
const activeVoices = []; // { osc, gain, endsAt }
function spawnVoice(freq, dur, vol){
  const now = ctx.currentTime;
  // prune anything that's already finished
  for(let i = activeVoices.length - 1; i >= 0; i--){
    if(activeVoices[i].endsAt <= now) activeVoices.splice(i, 1);
  }
  if(activeVoices.length >= MAX_VOICES){
    // steal the oldest (or lowest-priority) voice instead of letting a 25th
    // voice stack on top and push the bus toward clipping unmeasured
    const stolen = activeVoices.shift();
    stolen.gain.gain.cancelScheduledValues(now);
    stolen.gain.gain.setValueAtTime(stolen.gain.gain.value, now);
    stolen.gain.gain.linearRampToValueAtTime(0.0001, now + 0.02); // fast fade, not a hard stop/click
  }
  // ...create osc/gain, schedule normally, then:
  activeVoices.push({ osc, gain, endsAt: now + dur });
}
```
Building this now, with no real high-density design to validate the cap
number or steal heuristic against, would be exactly the kind of padding
this studio's own "no padding" rule exists to prevent — this section
documents the pattern so it's a known, ready move rather than a cold
start, the same role the taxonomy in `game-audio-production-suite` plays
for music/SFX categories. Adopt when a real design needs it, not before.

**Confirmed, proven, no action needed:** one-shot node cleanup does not
leak. A live test firing 150 one-shots, waiting past every voice's
scheduled `.stop()` time, and forcing real garbage collection (`WeakRef`-
tracked node references, 5 forced-GC passes) found every one of 300
oscillators and 450 gain nodes correctly collected — only the permanent
drone/bus nodes survived. Web Audio's spec-guaranteed GC of stopped source
nodes works correctly here; this studio's code doesn't accidentally defeat
it with a lingering array/closure/listener reference. Re-check only if a
future voice-cap implementation (above) introduces its own tracking array
— that array itself would need the same no-lingering-reference discipline
this test just confirmed the rest of the codebase already has.

**Confirmed, proven, no action needed: every game's bus routes through a
real compressor before output.** No game in the studio sends a one-shot
straight to `ctx.destination` — every signal path funnels through exactly
one `DynamicsCompressorNode` first (four of six games share byte-identical
tuning: threshold -20dB, knee 12, ratio 4:1, attack 3ms, release 250ms).
This is the actual foundation "many simultaneous sounds don't clip" rests
on, and it's already correct studio-wide — nothing to change here, just
confirmed rather than assumed.

## Verification — this is not optional

**Verify live, not by reading the code.** This environment often has no
real speakers. "Verify live" means driving the actual `AudioContext` via
Playwright and reading real `AudioParam`/gain values at runtime, or
patching `AudioContext.prototype.createOscillator` to record actual
`start()` call times/frequencies and asserting on those — not trusting that
correct-looking code produces the intended sound. Before restructuring an
audio graph (splitting a bus, adding a send), grep every `.connect(...)`
call site first and enumerate them explicitly, in **both** directions
(what does this node connect to, and what connects into it) — a missed
connection is a silent partial regression (a volume slider that "mostly"
works, one voice immune to it, or a whole bus like `musicGain` carrying no
signal at all), not a crash, so it ships unnoticed unless checked.
