---
name: color-language-audit
description: Use before shipping any new entity, hazard, pickup, or UI element's color, or when auditing an existing game's palette for cross-game consistency. Formalizes STUDIO_BIBLE.md §11's reserved-hue rule (gold=reward, red=danger, green=safe) into a repeatable RGB-distance check instead of an eyeballed judgment call — the same check that caught Wardfall's palette-cap issue during its pillars pass.
---

# Color Language Audit

**Why this exists as a skill, not just Bible prose:** `STUDIO_BIBLE.md`
§11 exists because a yellow "swarmer" and gold "elite" enemy in Iridescent
Cosmology landed in the same hue/lightness band as the game's own reward
currency — confirmed by RGB distance, not just impression, the enemy and
reward hex values were only a handful of channel-units apart, and a real
playtester read both enemies as rewards on sight. The rule has existed
since that incident; this skill is the mechanical procedure for actually
running the check, named as a candidate in `GAME_4_PREP.md` §3 so the rule
stops depending on someone eyeballing a new hex and feeling like it's
probably fine.

## The reserved bands (from STUDIO_BIBLE §11 — read that section for full
rationale, this is the checkable summary)

- **Gold/yellow** (`--gold:#ffd76b`, `--neon:#ffcb5c`, and the same
  hue/high-saturation-high-lightness family) — reward/currency/positive-UI
  only. No hostile or threatening entity may use this band.
- **`--danger` red (`#ff4d70`)** — threat, damage, warning only.
- **`--ok` green (`#5eff9c`)** — safe/positive-health only.
- Everything else (`--neon2` violet `#b98aff` and other hues) is free for
  neutral/magic-accent/elemental use on either hostile or friendly
  entities.

## The check

For any new color (a new enemy fill, hazard glow, pickup, UI accent):

1. **Convert both colors to the same space and measure distance.** A
   simple, sufficient check for this studio's purposes — per-channel RGB
   distance, not a perceptual color-difference model, since the actual
   incident was caught this way and it's fast enough to run on every new
   hex:
   ```js
   function rgbDistance(hexA, hexB) {
     const a = parseInt(hexA.replace('#',''), 16);
     const b = parseInt(hexB.replace('#',''), 16);
     const dr = ((a>>16)&255) - ((b>>16)&255);
     const dg = ((a>>8)&255) - ((b>>8)&255);
     const db = (a&255) - (b&255);
     return Math.sqrt(dr*dr + dg*dg + db*db);
   }
   ```
2. **Run the new hex against every reserved-band token it doesn't
   semantically belong to.** A new hostile entity's fill color gets
   checked against `--gold`/`--neon` and against any other existing
   reward/currency color in the file — not just the three named tokens,
   since a game may have additional ad hoc reward colors that were never
   promoted into `:root{}` (exactly the kind of drift §11 also names).
   Do the same for a new reward/pickup color against `--danger` and any
   existing hostile-entity fills.
3. **A distance under roughly 40 (per-channel-scale, not a hard
   certified threshold) is close enough to warrant a second look** — the
   swarmer/elite collision was "a handful of channel-units apart," i.e.
   well under this. Treat the threshold as a trigger for human judgment on
   a borderline case, not an automatic pass/fail at exactly 40.
4. **Confirm token reuse, not duplication.** Per §11's "shared token
   integrity" rule: the new color should reference an existing `var(--token)`
   if one already carries the intended meaning, or become a newly named
   token (promoted into the shared `:root{}` set if it's meant to be
   reused) — never a hand-typed hex duplicating an existing token's value
   under a new name.

## Cross-game pass

`visual-art-director`'s cross-game consistency check is what actually runs
this audit against every shipped game's `:root{}` block, not just a single
new color in isolation — diff each game's token block against every other
game's, confirm no game has silently drifted a reserved-band value, and
confirm no game has an unreviewed ad hoc hex sitting outside the shared
token set entirely.

## Reporting

Cite the actual computed distance and both hex values being compared, not
just a pass/fail verdict — "checked, looks fine" is not a finding, `#ffd76b`
vs `#e8c85c`, distance 34.2, flagged for review is.
