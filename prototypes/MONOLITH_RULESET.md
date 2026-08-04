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
source is illegible/unresolved — flagged, not guessed at.) Implemented in
Arena: a `battlesWon` counter is written back to the Esori's own record on
each win, and Rarity is derived from that table, not tracked as a
separately-editable number.

**Stated simplification, not a sourced rule:** none of the four
currencies are tied to "win a battle" anywhere in the source docs — Stars
come from "completing chapters," Fragments from "Challenges and
Contests," Favor from NPC interaction, none of which this prototype
models. Rather than leave every currency permanently inert (nothing
would ever earn any of them), Arena awards a small flat amount of Stars
per battle won, as the closest available stand-in for "chapter
completion" progress. Fragments and Favor are left untouched — inventing
a relationship nobody's confirmed for a currency this project doesn't
have a source trigger for at all would be a bigger leap than reusing
Stars' "progression currency" role for the one form of progress that
does exist here.

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

Source ambiguity, resolved and documented rather than guessed silently:
`Monolith_Ruleset_Document_v1.pdf`'s own Equipment section lists 4
cosmetic item names per slot ("Head: Helmet, Circlet, Hood," etc.), but
`Monolith_Universe.pdf`'s numeric bonus table only ever names 2 of those
per line, paired as "Item A/Item B: bonus A/bonus B." Read literally, that
pairing puts Helmet and Necklace in *different* slots (head, neck) with
one fixed bonus each — no in-slot choice — while Ring/Glove, Boots/
Sandals, and Cloak/Pouch each name two items *within the same slot*
(hands, feet, body respectively), giving a real choice between two
bonuses for those three slots. That's the reading implemented: 5 slots,
8 total equippable items, exactly as numbered below. Circlet/Hood,
Amulet/Scarf, Gauntlets/Bracers, Greaves, and Robe/Armor (the other
cosmetic names `Monolith_Ruleset_Document_v1.pdf` lists) have no stated
numeric effect in any source doc and are not implemented as distinct
items — flavor slots without a mechanical hook aren't worth inventing
numbers for.

| Slot | Item | Bonus |
|---|---|---|
| Head | Helmet | +1 Hand Size |
| Neck | Necklace | +1 basic ability count (read as +1 deck-size cap, 11 instead of 10 — Ultimate-tier cards, where "basic" vs. Ultimate would otherwise matter, aren't implemented yet) |
| Hands | Ring | +1 Basic Ability Range |
| Hands | Glove | +1 Strike |
| Feet | Boots | +1 Special Movement |
| Feet | Sandals | +1 Distance |
| Body | Cloak | +1 Talisman AoE |
| Body | Pouch | +1 Pack |

## Items

- **Talismans** — placed on the grid, range 4 to place, area of effect 1,
  cost 5 Initiative. Persist until struck (declaring a Strike against the
  cell destroys it). Characters starting their turn in the AoE are
  affected. No source doc says *how* they're affected beyond "buffs,
  debuffs, or other effects" — implemented as two concrete types, a
  stated design decision: **Ward** (allies of the owner who start their
  turn in range heal +2 Life) and **Trap** (opponents of the owner who
  start their turn in range take 2 damage). This owner/team distinction
  is also what makes Capture (an Aggressive operator — "take control of a
  target Talisman") mean something concrete: capturing flips `ownerTeam`
  only, keeping the Talisman's own `kind` (Ward stays Ward, Trap stays
  Trap) — a pure ownership flip, not a type conversion, matching the
  generic operator-resolver's own philosophy of reusing existing `kind`
  behavior rather than special-casing. The mechanical effect still
  changes completely from the new owner's perspective purely because
  Ward/Trap's team check (`ally-of-owner` / `opponent-of-owner`) reads
  live off `ownerTeam`: a captured enemy Trap immediately stops hurting
  its captor and starts hurting its original owner's team instead — a
  captured enemy Ward immediately starts healing the captor's own team
  instead of the original owner's. Not a cosmetic label change, but not a
  literal "Trap becomes a healing Ward" conversion either — that would
  need bespoke per-type capture logic where a plain ownership flip
  already gets the meaningful result. Brought into battle from a
  character's owned Talisman inventory, capped by Pack jointly with
  Catalysts (per Pack's own stat description above — "Items (Talismans
  and Catalysts) you can have equipped" is one shared pool, not two
  separate caps).
- **Catalysts** — single-use, permanent stat boost for the rest of the
  battle, cost 10 Initiative, resolve like an ability. No source doc
  states which stats or how much — implemented as +2 to one of Life/
  Strike/Distance/Initiative/Pack, a stated default. Brought into battle
  from a character's owned Catalyst inventory, capped by Pack (shared
  with Talismans, per the Pack stat's own description above).

## Combat

- Board: 9×9 grid. Black cells traversable, white cells are
  obstacles/terrain (block movement and line of sight).
- Turn order: descending Initiative, across both teams (not per-team
  blocks).
- Per turn: Movement (up to Distance, declarable repeatedly while distance
  remains), Special Movement (ability-granted, max 2 cells unless stated),
  one Weapon Strike if a target is in weapon range, play Ability cards
  (pay Initiative), place Talismans (range 4, per Items — not Ability
  Range; a Talisman's placement range doesn't scale with the wand/Bishop
  Ability-Range bonuses the way a targeted ability card does).
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
  ("Focused"). No duplicate Ultimates in one deck. Implemented as a hard
  ceiling of 2 Ultimates per deck in the deck editor (never a forced
  minimum of 1 — a deck with zero Ultimates isn't literally either named
  format, but forcing a minimum would strand any Grimoire built before an
  Ultimate was ever owned, which the "don't refuse to load over a missing
  optional field" convention elsewhere in this project already avoids).
  "No duplicate Ultimates" itself needs no separate check — every card id
  in a Grimoire is already unique.
- Hand size 5, draw 1 card at the start of each turn.

## Abilities

**Types and cost:**

| Type | Cost | Targets | Modifiable |
|---|---|---|---|
| Aggressive | 20 Ini | opponent (Life/Ini/Movement/Strike/hand/deck) | yes |
| Defensive/Reactive | 20 Ini | triggers off opponent's action, once condition met | not yet — see the Defensive entry under Fundamental Operators below |
| Supportive | 20 Ini | ally only | yes |
| Passive | 15 Ini, +10/turn to sustain | self, always-on | **no**; only one active at a time |
| Ultimate | 50 Ini | 2 main effects + up to 2 optional modifiers, range 4 (fixed — does not scale with abilityRange bonuses), can hit all valid targets in range | partially (see modifiers) |

**Ultimate implementation status:** the 2-main-effects resolution, Target
All, and IF WONDERLAND OPEN (checked live against the caster's own open-
Wonderland state) are implemented, via a small hand-authored
`ULTIMATE_CARDS` set (same pattern as the Basic `COMPOSED_CARDS`) — see
each document's own comment above that constant for the exact list.
**Not implemented, a real scope line:** the AND/ALSO/IF-THEN modifiers on
Ultimates (IF/THEN needs a condition-evaluation system this build doesn't
have, the same boundary Open Wonderland's own free-text Activation/
Sustain conditions already hit), and OR between an Ultimate's own two
main effects (distinct from Basic OR, which already exists — choosing
between an Ultimate's two *named* effects is a different design question
that hasn't been resolved). Auto-Win Condition is implemented as a
self-declared confirm() at cast time, not a real check — same trust
boundary as Open Wonderland's Activation Condition (the player attests
their stated condition was met; nothing parses it). The AI does not play
Ultimate cards at all yet (same documented reason it skips OR cards: no
real basis to evaluate whether Target All / an Auto-Win claim is worth
it, so it plays something else instead of guessing).

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

**Defensive implementation status:** all four are implemented, via a
lightweight "readied ability" mechanism rather than a full generic
interrupt/priority system. Playing Nazar, Parry, or Nullify Cost is a
self-cast (no board target) that *readies* it — pushed onto the unit's
own `readiedDefensives` list, costing the normal 20 Ini immediately, with
no persistent-slot limit the way Passive's "one at a time" is explicit
about (any number can be readied at once). It's consumed later, off the
*opponent's* subsequent matching action, at one of exactly two
interception points: `finalizeCast` (an incoming single-target Aggressive
card — nullifies it; for Nullify Cost, also refunds the caster's spent
Initiative, the one thing distinguishing it from Nazar) and `tryStrike`
(an incoming Weapon Strike — Parry reflects the damage onto the attacker
instead of the defender). **Two real, stated simplifications:** (1)
Nullify Cost is scoped to the same "incoming Aggressive" trigger as
Nazar rather than the literal "a *named* ability/category" — a picker
for choosing which specific ability to ward against at ready-time is a
separate, larger scope this pass doesn't build; (2) neither reaches a
Target-All Ultimate's resolution (which doesn't route through
`finalizeCast`) or a Talisman's per-turn AoE tick (which isn't an
"opponent's action" in the same instantaneous sense) — a readied Nazar
will not save you from a Target-All Ultimate or a Trap Talisman. Mojo is
architecturally different from the other three: it targets a specific
placed Talisman directly (same `targetsTalisman` click-a-cell path as
Destroy/Capture, restricted to enemy-owned Talismans), marking it
`nullified` so it stays on the board but stops resolving its AoE effect
— not a reactive trigger at all, so none of the above interrupt-window
caveats apply to it.

**Supportive** (ally only): Give Mov, Give Strike, Heal (+Life), Give Ini,
Give Range, Transpose (swap two characters' positions), Accelerate (grant
an ally an extra action/turn).

**Passive** (self, always-on, one at a time, unmodifiable): Gather (+draw),
Regen (+Life/turn), Evade (immune to damage), Shield (immune to effects).

**Utility:** Scry (reveal opponent's cards) and Glimpse (see above — kept
as Aggressive by the resolution already stated, but implemented; listed
here too since it's a Utility operator by name) both implemented as
Aggressive-targeting, revealing info via the battle log (no hidden-hand
mechanic to protect against here — this is a local hotseat/vs-AI game,
not networked hidden-information multiplayer, so a shared log is a
reasonable implementation, not a leak). Refine (banish your own
card/ally — `Monolith_Library.pdf` marks this "*", i.e. flagged as
needing a ruling on what "banish own ally" means mechanically) is
implemented for its unambiguous half only: playing it banishes a random
*other* card from the caster's own hand. **The ally-targeting half is
still not resolved and still not built** — banishing an ally is a far
more drastic, differently-scoped effect than banishing a card, and
guessing at it risks building the wrong mechanic entirely.

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
