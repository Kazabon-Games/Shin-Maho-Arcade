# Monolith: The Esori Chronicles — Locked Ruleset (v0.1)

Game 8. Turn-based grid-tactics ability-card game, single-file HTML/JS/Canvas,
no build step — the studio's standard convention, not Godot/GDScript (an
earlier attempt in Godot stalled on the engine's own learning curve; this
repo's existing single-file pattern is the actual proven path, per
`Shin-Maho-Arcade/iridescentcosmology.html` and `age-of-wonder/wonderland/`
already porting parts of this exact source material successfully).

This is the studio's **original** IP — Wonderland (`age-of-wonder`, Game 6)
and Iridescent Cosmology (`iridescentcosmology.html`, Game 1) both already
borrow Monolith canon/operators; this document is the first time the actual
Monolith game itself is being built. Read this before assuming a rule isn't
implemented — it exists specifically because the source material is nine
separate PDFs of varying authority (see below), the exact gap that caused
Rykndu's undocumented-moveset bugs (`RYKNDU_MOVESET.md`'s own reason for
existing) and that this document exists to prevent here.

## Source precedence (the PDFs disagree with each other)

Nine source documents were provided. They are not one consistent spec —
several are earlier drafts, one is an outline/wishlist, one is bio/lore
reference. Where they conflict, this is the resolution order:

1. **`Monolith_Universe.pdf` ("by IX")** — self-labeled "Alpha 1... the
   final operator." Treated as authoritative over all other rules text
   below. Concrete starting stats, weapon damage formula, and the
   1:1-Life-vs-capped-at-1-other-stats rule all come from here.
2. **`Monolith_Ruleset_Document_v1.pdf`** — an earlier, less numeric draft
   of the same rules (keyword glossary, ability structure, class/position
   tables match; no concrete starting stat block, no damage formula). Used
   to fill gaps `Monolith_Universe.pdf` doesn't cover (e.g. the full
   Fundamental Operators list, deck-building formats, keyword glossary).
3. **`Monolith_Library.pdf`** — a card-list draft. Its per-category
   Initiative costs conflict with `Monolith_Universe.pdf` in one place
   (Ultimate: Library says 40, Universe/Alpha-1 says 50) — **Universe wins,
   per rule 1 above.** Flagged, not silently resolved, because this is
   exactly the kind of unverified assumption that shipped as a real bug
   before in this studio.
4. **`Monolith_Universe_Design.pdf`, `Introduce_Monolith_.pdf`,
   `Monolith_docs.pdf`** — GDD/pitch-deck/outline material. Platform list
   (mobile/Steam/Switch), gacha, and cross-platform online multiplayer come
   from here and are **explicitly out of scope for v1** (see Descope,
   below) — a single-file-HTML no-backend studio cannot build a real-money
   gacha economy or networked cross-platform play, independent of which
   game engine was used.
5. **`Monolith_Gameplay.pdf`, `Main_Cast_Monolith.pdf`, the fundamentals/
   lore reference doc** — prototype status notes, cast bios, and
   philosophical/writing-style source material (Kishotenketsu structure,
   strong two-hander dialogue over exposition). Lore flavor only; nothing
   here overrides a mechanic.

## Core concepts

- **Esori** — the player character. A human whose developed imagination
  ("Wonderland") lets a bonded **Tulpa** manifest powers into battle.
- **Tulpa** — the bonded entity. Grants a unique **Open Wonderland**
  ability (see below).
- **Wonderland** — the Esori's personal metaphysical realm; lore layer,
  not a separate game system beyond the Open Wonderland mechanic.
- **Reflective Essence** — the setting's in-fiction power source; narrative
  framing for Initiative, not a separate stat.
- **Grimoire** — the player's full owned-ability collection, from which a
  10-card battle deck is built.

## Character stats and starting values (Monolith_Universe.pdf, Alpha 1)

| Stat | Start | Notes |
|---|---|---|
| Life | 100 | 0 → Defeated state (see Combat) |
| Initiative (Ini) | 60 | refreshes in full at the start of each round |
| Strike | 1 | base weapon damage multiplier component |
| Special Strike | 2 | extra weapon attacks per turn, base |
| Distance | 4 | cells per Movement action |
| Special Movement | 2 | granted by abilities; capped at 2 unless stated |
| Pack | 3 | number of Items (Talismans + Catalysts) equippable |
| Weapon Rarity | 1 | scales weapon damage |
| Ability Range | — | per-ability, modified by class/weapon/equipment |
| Hand Size | 5 | max cards in hand; draw 1/turn |
| Controlled Talisman | — | number of talismans a character may control |

Rarity progression (battles-to-level, source table): R2 at 1 battle, R3 at
2, R4 at 3, R5 at 5, R6 at 8, R7 at 9, R8 at 11, R9 at 13. ("O A" in the
source is illegible/unresolved — flagged, not guessed at.)

## Class (chosen at creation; changeable only via special home-realm items)

| Class | Bonus | Weapons |
|---|---|---|
| Knight | +1 Weapon Strike | Sword, Spear |
| Rook | +1 Special Movement | Dagger, Projectile |
| Bishop | +1 Basic Ability Range | Staff, Wand |

## Position (team of 3 requires exactly one of each)

| Position | Bonus | Role |
|---|---|---|
| Vanguard | +20 Life | front line |
| Saboteur | +20 Initiative | midrange support |
| Infiltrator | +2 Pack | backline control |

## Weapons

Equipping a weapon costs 5 Initiative (main weapon starts equipped free);
switching from hand costs 10. Damage = **10 × Rarity** normal, **15 ×
Rarity** on a Critical Hit (rounded up if a fractional rarity multiplier
is ever introduced — not currently possible at integer rarity).

| Weapon | Class | Range | Main-slot bonus |
|---|---|---|---|
| Sword | Knight | 1 | +1 Distance after a hit |
| Spear | Knight | 2 (line) | crits cell 2 if cell 1 was hit |
| Dagger | Rook | 1 | +1 Strike |
| Projectile | Rook | 3–4 | crits cell 4, straight line only |
| Staff | Bishop | 1 or 2 | — |
| Wand | Bishop | 2 | +1 Basic Ability range |

## Equipment (passive, worn before battle)

| Slot pair | Bonus A | Bonus B |
|---|---|---|
| Helmet / Necklace | +1 Hand Size | +1 basic ability count |
| Ring / Glove | +1 basic ability range | +1 Strike |
| Boots / Sandals | +1 Special Movement | +1 Distance |
| Cloak / Pouch | +1 Talisman AoE | +1 Pack |

## Items

- **Talismans** — placed on the grid, range 4 to place, area of effect 1,
  cost 5 Initiative. Persist until struck (declaring a Strike against the
  cell destroys it). Characters starting their turn in the AoE are
  affected.
- **Catalysts** — single-use, permanent stat boost for the rest of the
  battle, cost 10 Initiative, resolve like an ability.

## Combat

- Board: 9×9 grid. Black cells traversable, white cells are
  obstacles/terrain (block movement and line of sight).
- Turn order: descending Initiative, across both teams (not per-team
  blocks).
- Per turn: Movement (up to Distance, declarable repeatedly while distance
  remains), Special Movement (ability-granted, max 2 cells unless stated),
  one Weapon Strike if a target is in weapon range, play Ability cards
  (pay Initiative), place Talismans (within Ability Range).
- Round end: refresh Initiative for everyone, resolve continuous effects
  (Passives, Talismans), check Open Wonderland sustain conditions, reshuffle
  discard into deck if a player's deck is empty.
- **Damage rule:** effects targeting Life are **1:1 with Initiative spent**
  (a 15-Initiative Inflict deals 15 damage). **Every other stat effect is
  capped at −1 per instance**, regardless of Initiative spent (an Obstruct
  costs Initiative for the *ability*, but only ever removes 1 point of
  Movement per resolution — it does not scale with cost the way Life
  damage does). This is the single easiest rule to get wrong porting from
  the source text; implement the cap explicitly, don't infer it from the
  Life formula.
- **Defeated state:** Life reaches 0 → Defeated. Cannot move/attack/play
  abilities, Distance locked to 1. Can be **rallied** by an ally (ally
  spends their turn + some Initiative) back to 1 Life, with abilities and
  strikes restored — **once per character**. A second fatal hit removes
  them from the battlefield permanently for that match.
- **Victory:** defeat all opponents, or fulfil the scenario's stated
  objective.

## Deck-building

- Deck size: 10 cards, drawn from the player's Grimoire (their full owned
  pool).
- Format: **7 Basic + 2 Ultimate** ("Balanced") or **9 Basic + 1 Ultimate**
  ("Focused"). No duplicate Ultimates in one deck.
- Hand size 5, draw 1 card at the start of each turn.

## Abilities

**Types and cost:**

| Type | Cost | Targets | Modifiable |
|---|---|---|---|
| Aggressive | 20 Ini | opponent (Life/Ini/Movement/Strike/hand/deck) | yes |
| Defensive/Reactive | 20 Ini | triggers off opponent's action, once condition met | yes |
| Supportive | 20 Ini | ally only | yes |
| Passive | 15 Ini, +10/turn to sustain | self, always-on | **no**; only one active at a time |
| Ultimate | 50 Ini | 2 main effects + up to 2 optional modifiers, range 4, can hit all valid targets in range | partially (see modifiers) |

**Basic ability structure:** one primary effect (a Fundamental Operator) +
an optional modifier.

**Modifiers:**

| Modifier | Cost | Effect | Ability type |
|---|---|---|---|
| AND | +5 Ini | adds another Basic ability's standard effect | Basic only |
| ALSO | +10 Ini | joins another modifier onto the card | Ultimate only |
| IF/THEN | +10 Ini | conditional effect | either |
| OR | +10 Ini | choose one of two effects | either |
| IF WONDERLAND OPEN | — | triggers only while the caster's Open Wonderland is active | either |

Ultimate-only extras: **Target All** (hits every valid target in range,
instead of one) and an **Auto-Win Condition** slot (if a stated condition
is met, the current fight is won outright) — both explicitly Ultimate-only
per source text.

## Fundamental Operators (the ability-authoring vocabulary)

**Aggressive** (target opponent): Inflict (−Life), Afflict (−Initiative),
Hinder (−Weapon Strike), Obstruct (−Movement), Occlude (−Range), Destroy
(remove a Talisman), Seal (opponent deck → discard), Jumbie (opponent hand
→ discard), Banish (remove a card from play — hand, deck, or discard),
Disarm (Weapon Strike → 0), Root (Movement → 0), Blind (Range → 0), Crush
(discard a Passive), Capture (take control of a target Talisman), Glimpse
(reveal a random card in opponent's hand — listed as Aggressive in
`Monolith_Library.pdf`, as Utility in `Monolith_Ruleset_Document_v1.pdf`;
**treated as Aggressive**, matching the more detailed Library entry).

**Defensive** (trigger off an opponent's action): Nazar (nullify an
incoming Aggressive), Parry (reflect Weapon Strike damage), Mojo (nullify
a specific Talisman's effect), Nullify Cost (negate the Initiative cost of
a named ability/category).

**Supportive** (ally only): Give Mov, Give Strike, Heal (+Life), Give Ini,
Give Range, Transpose (swap two characters' positions), Accelerate (grant
an ally an extra action/turn).

**Passive** (self, always-on, one at a time, unmodifiable): Gather (+draw),
Regen (+Life/turn), Evade (immune to damage), Shield (immune to effects).

**Utility:** Scry (reveal opponent's cards), Refine (banish your own
card/ally — `Monolith_Library.pdf` marks this "*", i.e. flagged as
needing a ruling on what "banish own ally" means mechanically; **not yet
resolved, do not implement Refine's ally-targeting half until it is**).

**Special** (named, non-generic effects): Rhyzl Step (Special Movement —
instantaneous relocation), Daedalus Tesseract (localized spacetime
distortion, built from Obstruct as a component), Nhül Partikül (complex
multi-operator sequence including Daedalus Tesseract + a "negation"
operator — under-specified in every source doc; treat as a stretch/Phase-3
target, not v1), Open Wonderland (imposes the caster's Wonderland on the
world — see below).

## Open Wonderland

Each Tulpa has one unique Open Wonderland ability with three parts:

1. **Activation Condition** — a specific action or sequence that triggers it.
2. **Effect** — a rule-breaking/rule-altering effect, active for as long
   as the Wonderland stays open.
3. **Sustain Condition** — an action that must be repeated each turn to
   keep it open.

Several operators and ability costs key off "if Wonderland open" (extra
draw on Supportives, special declarations on Basics, Target All /
single-target-defeat / extra-effect on Ultimates) — Open Wonderland state
is a real, checked condition, not flavor text, and needs to be modeled as
first-class battle state per character, not inferred.

## Currencies (out-of-battle progression)

- **Stars** — stat points, earned per completed chapter.
- **Fragments** — new abilities / modifiers / Ultimate unlocks, earned via
  challenges and contests.
- **Favor** — earned via NPC interaction and Wonderland-of-Obsidian-
  Monolith-Family lore; role in mechanics beyond flavor is unspecified in
  the source docs.
- **Stones** — new Tulpa acquisition; source docs explicitly allow
  real-currency purchase. **Not implemented in v1** — see Descope.

## v1 Descope (confirmed with the studio during intake)

Building for **browser, single-file HTML/JS/Canvas, no backend**:

- ✅ Solo vs. AI-controlled opposing team, **and** local pass-and-play
  (2 players, shared screen/device) — both from day one, same turn/action
  loop with a swappable controller for the second team.
- ✅ Full local profile persistence (roster, Grimoire, deck, equipment,
  Stars/Fragments/Favor balances) via `local-state-persistence`.
- ✅ Esori export/import as a JSON file — both for moving a roster between
  the Codex (creator) and Arena (battle) documents, and for handing a
  finished Esori to another person to import into their own Codex or use
  as a battle opponent. See `MONOLITH_ESORI_SCHEMA.md`.
- ❌ Mobile/Steam/Switch native builds, gacha with real-money packs, Stones
  as a real-currency purchase, networked cross-platform multiplayer,
  leaderboards. None of this is buildable in a no-backend single-file
  studio regardless of engine — dropped from scope, not deferred to "some
  other engine later" without a real platform/backend decision first.

## Known unresolved gaps (flagged, not guessed at)

- Ultimate cost conflict (40 vs 50 Initiative) — resolved to 50 per source
  precedence above, but worth a real designer confirmation pass.
- Rarity progression table's "O A" entry — illegible in source, unresolved.
- Refine's "banish own card/ally" half — mechanically unclear, don't build
  the ally-targeting branch until clarified.
- Nhül Partikül — under-specified multi-operator combo, Phase-3 stretch
  target at earliest.
- Favor's mechanical role beyond currency-for-lore-interactions — unstated
  in every source doc.
