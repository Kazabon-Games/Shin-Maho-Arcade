---
name: faceted-gem-rendering
description: Rendering game entities (enemies, bosses, pickups, board tiles) as faceted cut-gem shapes on Canvas 2D — the studio's proven technique for exactly that job, NOT a default for all visual work. Use when a new entity genuinely wants a "crystalline"/"gem" identity (an enemy, a match-3-style board tile, a pickup), and especially before generating that shape's vertices — the technique has shipped generic twice and been fixed twice; read this first so a third game doesn't repeat it. Do NOT reach for this on a humanoid/rigged character, a reference map, or anything whose job is legibility over "juice" — see the "subset, not default" section below before defaulting to it.
---

# Faceted Gem Rendering

**A subset technique, not the studio's default visual language** (made
explicit 2026-08-06, after this file's own "signature"/"core visual
identity technique" framing risked reading as more universal than the
studio's actual practice has ever treated it). The full alternating-
facet-fan technique below is genuinely proven for one specific job — an
enemy, boss, pickup, or match-3-style board tile that wants to read as a
"cut gem" — and used, correctly, for exactly that job: every enemy in
Iridescent Cosmology, every tile in Sigil Chain and Runeshatter, pickups
in Wardfall/Infall (the radial-gradient variant, see below). It is
**not** the studio's rendering language for everything drawn on Canvas
2D, and two real, already-shipped precedents show the studio's own
practice already knows this:

- **Rykndu's fighting-game rig deliberately does NOT use the facet-fan
  technique for its character.** It reuses only the underlying
  `shadeHex()` color-shift *utility function* — a flat-shaded outline
  pass on each limb segment, its own comment explicit about the
  distinction: "flat fill instead of a linear gradient, with a same-hue-
  darker outline pass (`shadeHex(color,-38,-10)`, not a universal...
  [black])." Reusing the color-math tool while correctly rejecting the
  full crystal-shading treatment for a humanoid rig is the right call,
  already made once — the pattern to follow, not an exception to explain
  away.
- **`cartography` (see that agent's own file) exists specifically
  because this technique was the wrong call once already** — a GM's
  reference map needs a legend read in under a second, not a "juiced"
  crystalline shape, and that role's entire mandate is refusing the
  reflexive reach for this skill where legibility matters more than
  identity.

**The check, before reaching for this skill on anything new:** does the
entity's *job* actually call for a "cut gem" read (combat identity,
juice, a collectible's appeal), or does it call for something else
(legibility, a humanoid silhouette, a UI chrome element, a reference
diagram)? If the latter, this skill is the wrong tool — reuse only the
`shadeHex()` color-math primitive if it helps, the way Rykndu did, not
the full technique.

The *technique* itself (facet-shading), where it IS the right call, is
proven and cheap and should be reused as-is. The *shape data* fed into
it is where this has gone wrong, twice, in exactly the same way — read
the "the mistake, twice" section before generating vertices for anything
new.

## The technique itself — `shadeHex` + alternating-facet fill

`shadeHex(hex, dLight, dSat)` (`iridescentcosmology.html:1888-1906`, copied verbatim
into `sigilchain.html`): converts a base hex color to HSL, shifts
lightness/saturation, returns a new `hsl()` string. Pure, stateless,
one line to call.

Given a vertex list forming a closed polygon around a center `(cx, cy)`:
1. One solid base fill first (with `shadowBlur`/`shadowColor` set to the
   base color) so a soft glow sits behind everything.
2. For each edge `(a, b)`, draw a triangle `center → a → b`, filled with
   `shadeHex(color, lit ? +16 : -14, lit ? +8 : -6)`, alternating `lit`
   every other facet. This alternating lit/dark wedge-fan **is** the
   entire "cut gem" illusion — it's what makes a shape read as a faceted
   crystal instead of a flat colored polygon.
3. One extra flat white (`rgba(255,255,255,0.4)`) "specular" facet between
   the first and last vertex, to fake a highlight catching the light.
4. A translucent white outer stroke.

For a round/radial pickup instead of a polygon, the same idea becomes a
radial gradient: center → base color → `shadeHex(color, -18, 0)` at the
edge, `shadeHex(color, +26, +10)` at the center — same lightness-shift
tool, gradient stops instead of wedges.

Reference implementations: `iridescentcosmology.html`'s `buildEnemySprite` (enemies)
and `RAMIEL_VERTS` rendering (the boss), `sigilchain.html`'s
`buildRuneSprite`/`buildCursedSprite`.

## The mistake, twice — technique correct, shape generic

**First time (Wonderland's boss):** the boss silhouette used the exact
facet-shading technique above — correctly — but generated its vertex list
as a uniform regular polygon (every vertex at the same radius from
center). The shading read fine in isolation; the silhouette was
indistinguishable from "a scaled-up regular enemy." Fixed by replacing
*only* the vertex generation with a hand-authored, asymmetric list
(`RAMIEL_VERTS`, an array of `{angle, radiusMultiplier}` pairs picked by
hand, not generated by a formula) — same rendering code, different input
data.

**Second time (Sigil Chain's 6 rune types + cursed tile):** all 7 shapes
were generated by one parametric `ngonVerts(cx, cy, r, sides)` function —
a different `sides` count per rune (3 through 8), but still a uniform
regular polygon each time. At actual board render size, the shapes were
hard to distinguish from each other by silhouette alone — the shape cue
had effectively collapsed into the color cue, which also meant the cursed
hazard tile (8-sided) was visually identical in outline to the legitimate
"shadow" rune (also 8-sided) — a real legibility bug, not just a taste
gap. Fixed the same way: replaced the parametric generator with 7
hand-authored `{angle, radiusMultiplier}` lists (`RUNE_VERT_DEFS` +
`CURSED_VERTS`), same rendering technique, genuinely distinct data.

## The rule, stated once so it doesn't need re-discovering

**Any named/singular entity (a boss, a mascot), and any entity where a
player must tell it apart from a sibling by *shape* (not just color) at
a glance, gets a hand-authored, irregular vertex list — never a uniform
regular-polygon generator.** A mass-produced/interchangeable entity (a
generic small enemy that's genuinely meant to read as "one of many") can
still use a parametric generator if there's nothing else it needs to be
distinguished from. Before generating vertices for anything new, ask: does
a player need to tell this apart from something else by shape alone? If
yes, hand-author it — copy the `{angle, radiusMultiplier}` list shape from
`RAMIEL_VERTS`/`RUNE_VERT_DEFS`, don't reach for a `Math.cos(i*2π/sides)`
loop.

## Verification

Zoom-render the new shape(s) at actual in-game display size (not at a
zoomed-in debug scale) alongside every sibling shape it needs to be
distinguishable from, and take a real screenshot — code that "looks
different" in the vertex data can still read as visually similar once
facet-shaded and scaled down. This was true both times the mistake shipped
originally; a code read alone didn't catch it either time.
