---
name: visual-theory-shape-motion-mapping
description: Use when designing a new entity's silhouette/shape, choosing a color's temperature/saturation for mood (a different question from color-language-audit's reserved-hue collision check), or tuning an animation's easing curve. Covers real shape-language theory (circle/square/triangle read as friendly/solid/dangerous), the studio's own proven "pop-then-settle" easing idiom formalized as a reusable convention, and color-temperature-as-mood grounded in real design theory plus this studio's own already-proven-but-unformalized usage — the visual-craft counterpart to music-theory-mood-mapping's mode/tempo/leitmotif conventions. Read this before picking a shape, curve, or color-mood pairing from scratch.
---

# Visual Theory: Shape, Motion, and Color-as-Mood

`faceted-gem-rendering` covers the entity-*rendering technique* (facet-
shading). `color-language-audit` covers reserved-hue *collision*
(gold/red/green semantic conflicts). Neither covers the craft-theory
layer underneath both: why a given silhouette reads as dangerous, why a
given easing curve reads as "produced," why a color's temperature (not
just its reserved-hue category) sets a mood. This is the direct visual
counterpart to `music-theory-mood-mapping` — same shape, same discipline:
extract real theory, check it against what this studio's code already
does (correctly, in most places, just never formalized), name the real
tensions honestly rather than only the successes.

## Shape language: real theory, checked against real entity data

Real design theory (silhouette exercises, character-design practice):
geometric shapes carry pre-verbal meaning before any detail is added —
**circles read as friendly/safe/non-threatening, squares read as
solid/dependable/defensive, triangles/sharp angles read as
dangerous/aggressive/fast.** Roughly 70% of a design's read comes from
silhouette alone, not surface detail — the standard production test is
"readable in grayscale, at a distance, in motion."

Checked against Iridescent Cosmology's actual `ENEMY_TYPES`
(`iridescentcosmology.html:2554-2569`):

| Enemy | Shape | Theory says | Checks out? |
|---|---|---|---|
| `husk` | `tri` (triangle) | dangerous/sharp | Yes — a real triangle read on a genuinely aggressive melee enemy |
| `bulwark` | `hex` (hexagon) | semi-geometric, closer to "solid/defensive" than a pure square but in that family | Roughly — the highest-HP, slowest, most tank-like enemy in the roster (hp:90, speed:36, the slowest) reads as "solid" via a many-sided near-regular shape, consistent with theory even if not a literal square |
| `elite` | `diamond` | sharp, elevated threat | Yes — by far the highest HP (600) and highest XP reward (30), a diamond's sharper silhouette than a hexagon correctly signals "this one is different" |
| `shard` | `spike` | maximally dangerous/sharp | Yes — the stage-2-exclusive fast/erratic enemy, the most aggressive shape name in the roster matches its most aggressive behavior |
| **`swarmer`** | **`dot` (circle)** | **friendly/non-threatening** | **A real, worth-naming tension** — `swarmer` is the *fastest* enemy in the roster (speed:105, faster than every other type) and genuinely hostile, but rendered as the one shape theory says should read safest. Not asserted as a bug — a swarm of small fast circles can still read as threatening through count/speed/color cues overriding a single shape's baseline read (the same way a swarm of bees is small and round but unambiguously dangerous) — but this is a real, checkable tension nobody has verified resolves correctly at actual gameplay size/speed, not a confirmed-correct pattern the way the other four are. Worth a real look (screenshot/video at actual size, moving) before assuming it's fine. |

**The check, going forward:** when a new entity needs to read as
dangerous/safe/solid at a glance, start from this table's shape
vocabulary, not from whichever shape looks visually interesting. If a
design deliberately contradicts the table (like `swarmer`), that should
be a stated, deliberate choice with a compensating cue (speed, count,
color) named explicitly — not an unexamined default the way it currently
reads.

## Motion: the studio's own proven idiom, formalized

**Confirmed already in real, consistent, cross-domain use — not a gap,
a genuine strength that had never been named as a reusable convention.**
One easing curve, `cubic-bezier(.2,.9,.3,1.3)`, is used identically in
raw CSS (`iridescentcosmology.html:1721,1734,1859`) AND has a matching
hand-written JS equivalent, `Ease.easeOutBack`
(`iridescentcosmology.html:2225`: `1 + c3*Math.pow(t-1,3) +
c1*Math.pow(t-1,2)`), used for every Canvas-driven pop-in (enemies,
chests, helpers — `iridescentcosmology.html:5035,5065,5212`, each citing
the shared idiom explicitly in their own comments: "same idiom regular
enemies use"). This is real application of the animation-theory
principle of **overshoot/exaggeration** (real, cited 12-principles-of-
animation theory: squash-and-stretch's core idea, applied here as a
scale-overshoot-then-settle rather than a squash) — a value animates
past its target before settling back, reading as "produced" rather than
a linear or simple-ease-out arrival. **The formal rule, now named:** any
new spawn-in/reveal/pop animation should reuse this exact curve
(`cubic-bezier(.2,.9,.3,1.3)` in CSS, `Ease.easeOutBack` in Canvas/JS),
the same way `bell()` gets reused for every audio stinger — not a new
curve invented per effect.

**Also confirmed already in real, extensive use: the anticipation
principle** (real animation theory: a short lead-in action signals a
bigger one is coming, or the payoff reads as sudden/unearned). This
studio's "telegraph" mechanics — attack-anticipation leans
(`iridescentcosmology.html:565`), boss entrance telegraphs
(`:1389,1493`), full-arena beam telegraphs (`:1397,2739`) — are real,
extensive, already-correct anticipation-principle application, confirmed
via grep across dozens of real call sites. **Not a gap** — stated here
so it's recognized as proven, reusable technique rather than
rediscovered as new territory on the next game.

**Confirmed NOT yet used anywhere, a real Trial-tier opportunity:**
overlapping/follow-through action (a real animation principle — a
character's cloak/hair/weapon continuing to move a beat after the main
body stops) and secondary action (a small supporting motion that adds
personality without competing with the primary read) — both real,
named, well-documented principles this studio's motion vocabulary
doesn't currently reach for. Cheap to add to an existing rig (Rykndu's
limb-segment system is the natural first candidate) without new
synthesis technique, the same "reach for a genuinely unused capability"
spirit `capability-auditor` already applies elsewhere.

## Color as mood: temperature and saturation, a different question from reserved-hue

`color-language-audit` answers "does this new color collide with a
reserved semantic band (gold=reward, red=danger, green=safe)." **A
separate, real question this studio has never formalized: what mood does
a color's *temperature* and *saturation* set**, independent of semantic
collision. Real design theory: warm hues (red/orange/yellow) read as
close/energetic/emotional, cool hues (blue/green/purple) read as
distant/serene/unsettling; higher saturation and brightness read as
positive/forward, desaturated/darker reads as negative/tense — the
studio's own violet-heavy palette (Iridescent Cosmology's `--ink-soft`,
`--gold` warm-accent-on-cool-base pattern, confirmed via the recent
contrast-sweep work) is already a real instance of exactly this
technique (a cool base with a warm accent for "reward stands out against
a calm/mysterious backdrop") — again, correct in practice, never named
as a deliberate convention.

**The check:** when scoping a new game or a new UI moment's palette,
name the intended temperature/saturation mood explicitly (a boss arena
should read tense — desaturated, cooler, or a jarring warm-on-cool
clash; a shop/reward screen should read positive — warmer, more
saturated) as a real design decision alongside the reserved-hue check,
not only after it, the same way `music-theory-mood-mapping` treats mode
choice as a real decision alongside tempo, not an afterthought.

## Shared studio context (every agent carries this)

You work inside Kazabon Game Studio, publishing to Shin Mahou Arcade. Full
detail lives in `STUDIO_BIBLE.md` and `KAZABON_BIO.md` in this repo.

- **Measure, don't assume.** Every claim above traces to a real grep or
  a real cited file:line — the `swarmer` shape tension is named as a
  real, unresolved question, not asserted as a confirmed bug, precisely
  because it hasn't been checked live yet.
- **No padding.** This skill documents what's real (proven idioms,
  genuine tensions, confirmed-unused principles) — not a generic
  animation/color-theory primer padded in because "a real studio would
  have one."
- **This skill is Shin-Maho-Arcade-scoped** — `age-of-wonder` has no
  Canvas-rendered game entities of its own.
