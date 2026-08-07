---
name: webgl-batched-instancing
description: Use when scoping a new game whose content genuinely involves potentially hundreds of simultaneous small entities (swarm/bullet-heaven combat, mass particle bursts, dense tile floods) — NOT a default rendering choice for every new game. Covers a real, benchmarked WebGL2 instanced-quad technique (no library, no CDN, single-file-compatible) that solves a specific, measured Canvas 2D failure mode, plus the explicit criterion for when this is the right call vs. when Canvas 2D remains correct. Read this before reaching for WebGL reflexively — the exact "signature technique becomes an unexamined default" mistake this skill exists to prevent already happened once with faceted-gem-rendering.
---

# WebGL2 Batched Instancing

**A subset technique, not a new studio default — stated first, deliberately,
because the last technique this skills library documented
(`faceted-gem-rendering`) had to be corrected for exactly the framing risk
this skill is written to avoid from day one.** Canvas 2D remains this
studio's correct default for five of the studio's six games (all
puzzle/tile/1v1 shapes — never hundreds of simultaneously moving/dying
entities). This technique exists for the one real, measured case where
Canvas 2D's own CPU-bound per-draw-call cost becomes a real problem, not
as a general upgrade to reach for on the next game by default.

## The decision criterion, before anything else

**Does this game's actual content involve potentially hundreds of
simultaneous, independently-moving-or-dying small entities in the same
frame** — swarm/bullet-heaven combat, a mass particle burst, a dense
tile-flood? If yes, this technique is the right tool. If no — a
turn-based puzzle, a 1v1 fighting rig, calm exploration, anything closer
to this studio's other five games' actual shape — Canvas 2D is still
correct, simpler, and lower-risk (no context-loss handling to build, no
second rendering paradigm to maintain). Scope this per-game, at kickoff,
the same way `faceted-gem-rendering` gets scoped per-entity, not adopted
studio-wide by default.

## The real, measured problem this solves

Iridescent Cosmology's own named "500-mob nova" design concern
(`iridescentcosmology.html:5893`'s float-text cap comment) is real,
confirmed via a live capability audit (2026-08-06): a hooked-
`requestAnimationFrame` measurement of the actual nova-kill burst (real
hard caps — 320 enemies, 150 particles, 40 nova rings, 40 floating-text,
300 gems, `iridescentcosmology.html:2626/2635/3223/4074/5894`) found
**176ms average frame time (5.7fps) and a 1,283ms worst single frame**
during the burst — a real, visible freeze on a mechanic that already
ships today, not a hypothetical. This is squarely a CPU-bound "hundreds
of individual `drawImage`/path draw calls per frame" cost — the exact
shape real-world Canvas 2D benchmarks name as the technology's actual
ceiling, not this studio's implementation being wrong.

## The technique

One shared unit-quad geometry (4 vertices) + one per-instance buffer
(position, size, color, shape-flag — 8 floats/instance) uploaded once per
frame via `gl.bufferSubData`, drawn with **exactly one**
`gl.drawArraysInstanced` call regardless of entity count. This is the
real mechanism behind libraries like PixiJS's `ParticleContainer`
(confirmed via research: batches many sprites into one/few draw calls,
benchmarked at 200K-1M particles/60fps) — reimplemented directly rather
than depending on a library, matching this studio's own established
Path B convention (`STUDIO_BIBLE.md` §5: proven technique, not shared
code/runtime) and this session's explicit choice not to add an external
dependency (vendored or CDN) for a technique this small.

Reference implementation, fully working, tested, checked in:
**`reference/webgl-batched-quad-poc.html`** (Shin-Maho-Arcade) — copy the
shader pair and instance-buffer setup verbatim the way `bell()` gets
copied verbatim for audio; adapt the per-entity simulation logic to the
actual game.

## Real, measured comparison — same methodology, same load, both sides

Both measured identically: real `requestAnimationFrame` deltas hooked at
the page level (not either side's own synthetic FPS counter), same
390×844 mobile viewport, same real entity counts (the actual game's own
hard caps, not an arbitrary stress number).

| Phase | Canvas 2D (the real game) | WebGL2 batched-quad PoC |
|---|---|---|
| Idle baseline | 4.3ms/frame | 16.7ms/frame (properly vsync-locked to 60fps — the Canvas 2D number reflects an unthrottled headless baseline, not a meaningful comparison point on its own) |
| 320 entities present, no burst | 23.4ms avg, **267ms worst** | 22.6ms avg, **33.4ms worst** |
| **The actual burst** (150 particles + 40 rings + 300 gems + 40 text, same frame) | **176ms avg (5.7fps), 1,283ms worst** | **16.9ms avg (59fps), 33.4ms worst** |

Roughly **10x better average, ~38x better worst-case** during the exact
scenario that's currently a real, visible freeze.

## What this PoC does NOT yet cover — real gaps, not hidden

- **Context loss handling — not built.** A real WebGL-specific failure
  mode Canvas 2D simply doesn't have: the GPU context can die mid-session
  (driver crash, VRAM pressure, tab backgrounding, Chrome's ~16-context-
  per-tab limit) and every texture/buffer must be explicitly re-uploaded
  via a `webglcontextlost`/`webglcontextrestored` listener pair, or the
  game goes blank and stays blank. **Required before any real production
  use of this technique** — not optional, not deferred as polish.
- **No real sprite/texture rendering.** Solid-color quads with a cheap
  procedural gem-facet fragment shader (angle-based alternating tint,
  same spirit as `shadeHex()`'s facet-fan idiom, computed in-shader
  instead of pre-baked triangles) — not real art assets. Texture
  atlasing for actual sprite art is real, separate work.
- **No text glyph rendering.** Floating damage numbers were represented
  as quad stand-ins for load-budget purposes only — real text in WebGL
  typically needs a signed-distance-field font atlas, a genuinely
  separate sub-problem, not solved here.
- **Not wired to real game logic, input, or a mood/juice system.** A
  synthetic stress harness proving the rendering technique, not a
  playable slice.
- **One unexplained minor variance**, stated honestly rather than
  smoothed over: the "320 entities, no burst yet" phase showed an
  occasional 33ms frame in testing, not fully diagnosed (likely GC/
  scheduling jitter, not confirmed) — small in absolute terms, real
  enough to name rather than claim a clean result across the board.

## Why not just use a library (PixiJS, Three.js)

Researched and deliberately rejected for this pass, not overlooked:
Three.js is a 3D engine, the wrong shape for this studio's 2D content.
PixiJS is well-matched in principle (research confirms real CDN/script-
tag usage with no build step required, so it wouldn't have broken
single-file-no-build), but the studio's own explicit choice this round
was to build the specific, minimal technique needed rather than add an
external dependency — vendoring the library inline would meaningfully
bloat every file that used it, and CDN-loading it would introduce a new,
more consequential supply-chain trust boundary (executable code, not a
font) that `security-reviewer`'s OWASP A03 checklist would need to
evaluate for real. The batched-instancing technique above gets the same
core payoff (few draw calls regardless of entity count) at a fraction of
the surface area.

## Shared studio context (every agent carries this)

You work inside Kazabon Game Studio, publishing to Shin Mahou Arcade. Full
detail lives in `STUDIO_BIBLE.md` and `KAZABON_BIO.md` in this repo — read
them if you have file access before doing substantive work.

- **No padding.** This skill's own existence is the proof of the rule,
  not an exception to it — built after a real, measured problem, scoped
  to the specific game shape that has it, not adopted as a studio-wide
  default because it's newer or more impressive than Canvas 2D.
- **Measure, don't assume.** Every number in this doc came from a real,
  hooked-`requestAnimationFrame` measurement against the real game's own
  entity caps — not an industry benchmark cited without a matching local
  test.
- **Single-file-no-build is the convention** (`STUDIO_BIBLE.md` §5). This
  technique is fully compatible — no build step, no bundler, no CDN
  dependency required.
