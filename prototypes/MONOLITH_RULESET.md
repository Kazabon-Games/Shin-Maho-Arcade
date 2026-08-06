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
| Controlled Talisman | 1 | max Talismans a character can have *active* on the field at once — distinct from Pack (carry capacity); a character may carry more in Pack than they can activate simultaneously |

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
| Infiltrator | +2 Controlled Talisman | backline control |

**Correction (Master GDD v2.0 §4.3):** Infiltrator's bonus was originally
implemented here as +2 Pack. The GDD explicitly revises this to +2
Controlled Talisman — Pack (carry capacity) and Controlled Talisman
(simultaneous-active-on-field cap) are two distinct stats, and every
canonical Infiltrator example (NLDR, whose Open Wonderland requires
controlling 3+ Talismans at once) is built around Talisman count on the
field, not carry capacity. Pack is fixed by base value and Equipment
only, unaffected by Position, per the same GDD section.

**Position is chosen fresh at deployment, not locked at creation
(Master GDD v2.0 §4.3):** "Position bonuses are chosen at the start of
battle and apply only for that match — they are not saved permanently to
a Tulpa's Grimoire, since the same Tulpa may be deployed in different
Positions across different matches." A prior pass of this build got this
backwards: Codex saved one fixed Position per Tulpa forever, and Arena's
team-setup screen only let a Tulpa fill the one slot matching that saved
value. Corrected — Codex's Position step is now a creation-time default/
display value only (shown on the roster card, not gating anything), and
Arena's setup screen offers every roster Esori in all three Position
slots, letting the player assign any of their three chosen Tulpa to any
of the three required roles for that specific match (one Esori can't
fill two slots on the same team at once). The stat bonus is computed
from the *deployed* slot, not the saved default — `makeUnit()` takes an
explicit `deployedPosition` argument now instead of reading
`esori.position`.

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
  cell destroys it). **A newly placed Talisman is inert until the start
  of the placing character's own next turn — it has no effect during the
  turn it's placed, and this is keyed specifically to the placer's own
  next turn, not to whichever unit's turn happens to come next in
  initiative order** (Master GDD v2.0 §5.1 — a correction; a prior pass
  of this doc had every Talisman live immediately on placement).
  Characters starting their turn in an *active* Talisman's AoE are
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
- **Damage/effect ratios (Master GDD v2.0 §11.1):** two different
  ratios, previously conflated into one flat "−1 always" rule — a real
  correction, not folded in silently:
  - **1:1 with Initiative spent** — Life (Inflict/Heal) *and* Initiative
    (Afflict). A 15-Ini Inflict deals 15 damage; a 25-Ini Afflict (e.g.
    an AND-modified card) reduces Initiative by 25. Afflict was
    previously miscategorized alongside Hinder/Obstruct/Occlude under a
    flat −1 — it belongs with Inflict/Heal's ratio instead, per the GDD
    text explicitly grouping "Life and Initiative."
  - **20:1 ratio** — Weapon Strike (Hinder), Movement (Obstruct), and
    Ability Range (Occlude): `max(1, floor(cost / 20))`. A 20-Ini Hinder
    reduces Strike by 1 (the floor of 1 is why this matches the old flat
    −1 for every card currently playable at exactly base cost — the
    ratio only produces a *visible* difference once a card's cost
    crosses 40, e.g. an Ultimate composing Hinder as one of its two
    effects at 50 Ini flat). Talisman count is also named as 20:1 in the
    GDD, but Destroy targets one specific placed Talisman via a
    single-target click, and this build never allows more than one
    Talisman per cell — there's no meaningful "destroy N Talismans in
    one declaration" target shape to scale toward, so this one is a
    stated non-applicability, not an unimplemented case.
- **Critical Hits:** 1.5× damage (10×Rarity → 15×Rarity). Per Master GDD
  v2.0 §4.5, only Projectile ("critical at range 4 in a straight line")
  and Spear ("critical on the 2nd cell if the 1st cell target was hit")
  have a stated crit condition. Projectile's is a single-target
  condition, checked directly by `isCriticalStrike()`. Spear's is a
  genuinely different, multi-target mechanic and is implemented in
  `tryStrike()` directly rather than `isCriticalStrike()` (which can't
  express "conditional on a different cell's outcome"): declaring a
  Strike at Spear's max range (cheb=2, a straight line) also strikes
  whatever's in the intervening cheb=1 cell — resolved first, and always
  at normal (non-critical) damage — and if that 1st-cell hit connects
  (a live enemy was actually there), the 2nd-cell (declared) target's own
  hit is forced to Critical. An empty 1st cell means the 2nd-cell hit
  stays normal. An empty 2nd (declared) cell doesn't trigger any of this —
  falls through to the ordinary single-cell Strike/Talisman-destroy/no-op
  handling, same as any other weapon. Sword/Dagger/Staff/Wand have no
  stated crit condition at all and never critical — nothing to implement
  there.
- **Defeated state:** Life reaches 0 → Defeated. Cannot move/attack/play
  abilities, Distance locked to 1. Remains a legal Weapon Strike target
  while Defeated — **declaring a Strike against a Defeated character
  removes them from the battlefield permanently, regardless of damage
  amount** (Master GDD v2.0 §8.2 — a corrected rule; a prior pass of this
  doc had Defeated units untargetable by Strikes entirely, which made
  this removal mechanic unreachable). Can be **rallied** by an adjacent
  ally back to 1 Life, with abilities and strikes restored — **once per
  character per battle, and a free action (no Initiative cost)** per GDD
  §7.4 (a prior pass of this doc charged a stated-default 10 Ini; the GDD
  gives Rally an explicit cost, so that default is retired). A character
  who has already used their Rally and is Defeated a second time is
  removed from the battlefield permanently on their next fatal hit, same
  as any other Defeated character reaching a second fatal hit without
  ever having been rallied at all.
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
Ultimates specifically — Basic Abilities' IF/THEN is now real (see the
Modifiers table below), but `finalizeCast`'s Ultimate branch
(`card.effects.forEach(...)`) doesn't check it, so an Ultimate still
can't carry a conditional third effect — and OR between an Ultimate's own
two main effects (distinct from Basic OR, which already exists —
choosing between an Ultimate's two *named* effects is a different design
question that hasn't been resolved). Auto-Win Condition is implemented as a
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
| IF/THEN | +10 Ini | conditional effect | Basic — implemented; Ultimate — not yet |
| OR | +10 Ini | choose one of two effects | either |
| IF WONDERLAND OPEN | — | triggers only while the caster's Open Wonderland is active | either |

Ultimate-only extras: **Target All** (hits every valid target in range,
instead of one) and an **Auto-Win Condition** slot (if a stated condition
is met, the current fight is won outright) — both explicitly Ultimate-only
per source text.

**IF/THEN — implemented for Basic Abilities** (`card.modifier = { type:
'IF_THEN', operatorId, condition }`, checked once at cast resolution
against the caster/target as they stand right now, not a persistent
watcher — same "unmet gate, no error state" shape as `ifWonderlandOpen`
on Ultimates). `IF_THEN_CONDITIONS` is a small, bounded, `kind`-based
vocabulary of checkable conditions (same generic-resolver pattern as
`WONDERLAND_ACTIVATION_CONDS`/`OPERATORS`' own `kind` field — a new
condition is a data row plus a `check(u, target)` function, not new
call-site code):

| `condition` kind | Checks |
|---|---|
| `wonderland-open` | The caster's own Open Wonderland is active |
| `target-life-below-half` | The target's Life is below half its max |
| `target-out-of-strike-range` | The target is outside the caster's current Weapon Strike range |

All three are grounded in real GDD card text (Wonderland-gated effects
appear throughout the GDD; "opponent has less than half Life" appears in
Rykndu's Slayer's Tactic; "target is out of striking range" appears in
Rykndu's Strength Storm), and all are checkable with data this engine
already tracks. Example cards demonstrate each (`card-inflict-if-
wonderland-then-afflict`, `card-hinder-if-half-life-then-jumbie`,
`card-inflict-if-out-of-range-then-surge`, `card-hinder-if-wonderland-
then-empower` — the last two are also the only way Empower/Surge are
reachable at all, since both are `thenOnly:true`), the same
hand-authored-`COMPOSED_CARDS` pattern AND/OR already use.

**Same-family only** — the modifier's own `operatorId` must be drawn from
the same ability family as the primary effect, per GDD's stated filtering
rule ("AND, IF/THEN, and OR modifier effects must come from the same
ability family as the primary effect"). **Cross-family THEN-effects are
explicitly not built** — this isn't an oversight, it's the GDD's own
stated *unresolved* question (its "Cross-family THEN-effects" note says
plainly: "Needs one [ruling] before ability resolution is built, since
the resolution engine needs a single consistent rule rather than per-card
exceptions"). Building a guessed ruling into the resolver would bake in
an unconfirmed design decision as if it were settled; the same-family
half of the rule *is* confirmed and is what's implemented. This also
means most of the canon Grimoires' actual named-ability IF/THEN clauses
still can't be ported literally — many of their THEN-effects are
cross-family (e.g. an Aggressive primary with a "draw a card" THEN) or
aren't operator applications at all (Special Strike/Special Movement,
card-retrieval-from-discard) — see Seeded Canon Characters above for the
approximations already in place; this pass doesn't change those.
IF/THEN is not wired into Ultimate cards at all yet (see the Ultimate
implementation status above).

## Fundamental Operators (the ability-authoring vocabulary)

**⚠ Corrected mid-project — read this before trusting any earlier prose in
this document that names Disarm/Root/Blind/Crush/Capture/Scry as
ordinary cards.** GDD §11.1/§11.2/§11.10 define Basic and Ultimate
Aggressive operators as **two separate tiers connected by a pairing
table**, not one flat list — every Basic operator that reduces a stat has
an Ultimate-only "absolute expression" pair that takes the stat straight
to 0/ceiling *regardless of cost*, and per §11.1's own italicized rule,
"Ultimate operators... are only available on Ultimate Abilities." This
build shipped Disarm, Root, Blind, Crush, Capture, and Scry as ordinary
20-Ini Basic cards for a full nine increments of this project before the
mistake was caught auditing the primary source directly — **a live
balance-breaking bug** (a player could buy "Strike → 0, no scaling, no
counterplay" for base cost), not a documented gap. Corrected: those six
now carry `tier:'ultimate'` and are unreachable except through a
hand-authored `ULTIMATE_CARDS` entry's `.effects` — see
`CARD_LIBRARY`'s filter in both documents. The same audit surfaced nine
operators named in the GDD's tables that had never been built at all:
**Displace, Drain, Impose, Empower, Surge** (Basic — Empower/Surge are
additionally `thenOnly:true`, "THEN-effect only, never a primary effect"
per §11.1, so they're *only* reachable as an IF/THEN modifier's
`operatorId`, never a standalone card either) and **Exhaust, Defeat,
Void, Siphon** (Ultimate-only) — all built this pass, see below.

**Aggressive — Basic tier** (target opponent, 20 Ini): Inflict (−Life),
Afflict (−Initiative), Hinder (−Weapon Strike), Obstruct (−Movement),
Occlude (−Range), Destroy (remove a Talisman), Seal (opponent deck →
discard), Jumbie (opponent hand → discard), Banish (remove a card from
play — hand, deck, or discard), Glimpse (reveal a random card in
opponent's hand — listed as Aggressive in `Monolith_Library.pdf`, as
Utility in `Monolith_Ruleset_Document_v1.pdf`; **treated as Aggressive**,
matching the more detailed Library entry, and now also matching GDD
§11.1's own table). **New this pass:** Displace (knockback 1 cell
directly away from caster — GDD states no amount, a stated default; a
no-op if the destination is off-board/obstacle/occupied), Drain (steal a
declared stat 1:1 with cost — GDD's own wording says the transfer lasts
only "until end of current turn"; this build doesn't implement that
reversion, a stated scope simplification, so it resolves as permanent,
identically to its own Ultimate pair Siphon), Impose (places a copy of
the resolving card itself into the target's hand, respecting the normal
hand-size cap — the literal shape every real GDD usage of Impose actually
needs, since Nhül Partikül imposes itself), Empower and Surge (THEN-effect
only — see the Modifiers section; "Special Strike"/"Special Movement" have
no other stated mechanic beyond being named variants, so Empower is
modeled as an immediate bonus Strike at Critical damage if the target is
in weapon range, and Surge as an immediate move toward the target bounded
by the caster's own `specialMovement` stat, ignoring the normal Movement
budget entirely — both stated interpretations, not guesses at an
undocumented sub-system).

**Aggressive — Ultimate tier** (target opponent, Ultimate cards only,
absolute effects regardless of cost): Disarm (Strike → 0), Root
(Movement → 0), Blind (Range → 0), Crush (discard the active Passive
entirely), Capture (take control of a Talisman, any cost), Scry (reveal
the entire hand). **New this pass:** Exhaust (Initiative → 0), Defeat
(target immediately enters Defeated state — GDD: "Requires declared
Auto-Win condition," so this only ever fires from an Ultimate card that
also carries `autoWin:true`; see `ult-annihilate`), Void (erase the
target's entire discard pile — Ultimate pair of Banish), Siphon (permanent
1:1 stat transfer — Ultimate pair of Drain, and functionally identical to
it in this build, since Drain's own "until end of turn" reversion isn't
built either).

**⚠ Corrected mid-project (twelfth pass):** GDD §11.3 states outright,
in its own header note: "Nazar, Parry, and Mojo from prior documents are
superseded by Nullify, Reflect, and Resist for broader application." This
build had shipped the old, superseded names *and* the old, narrower
mechanics for nine-plus increments — found during the same direct
primary-source audit that caught the Aggressive-tier bug above, and fixed
in the same "close every gap" pass. This is a rename plus two real
mechanic changes, not a find-and-replace:

- **Nullify** (was Nazar) — trigger is now explicitly **dual**: "Incoming
  Aggressive ability *or* Weapon Strike," where the old Nazar only ever
  fired off `aggressive-played`. Nullify now readies against both
  `aggressive-played` and `weapon-strike-declared`, cancelling the
  incoming effect entirely either way (a Nullified Strike deals no damage
  to either side — unlike Reflect, nothing is redirected).
- **Reflect** (was Parry) — trigger is also dual per the GDD table:
  "Incoming Weapon Strike *or* Inflict," where the old Parry only covered
  Weapon Strikes. Reflect now readies against both triggers, but is
  *scoped* on the Aggressive side: it only intercepts a card whose effect
  is specifically Inflict (damage), not any Aggressive card generally —
  implemented via `declareAction`'s new `triggerFilter` hook, checked
  against `isInflictFlavored(cardId)` so an Inflict-built Ultimate
  qualifies the same way an Inflict-built Basic card does, matching how
  `isAggressiveFlavored` already generalizes across tiers elsewhere in
  this system.
- **Resist** (was Mojo) — this is not a rename of Mojo's mechanic, it's a
  wholesale replacement. Mojo targeted one specific placed Talisman
  directly (a board click, same path as Destroy/Capture) and marked it
  `nullified` so its AoE stopped resolving. **That job has no replacement
  in the corrected ruleset — it's genuinely gone, not moved elsewhere.**
  Resist is a different operator entirely: "Any declared effect category
  → grants temporary immunity to a declared category (Damage, Control,
  Movement, Ability Effects)." It's self-cast like Nullify/Reflect, but
  readies with a **category choice** (a 4-option picker, `#hand-card-group`,
  same shape as Nullify Cost's ability picker below) rather than a
  board target, and matches by *category* rather than by trigger type —
  see `RESIST_OPERATOR_CATEGORY` below for how each operator was sorted
  into the GDD's four named-but-unenumerated categories.
- **Nullify Cost** is unaffected by the rename (its own GDD wording was
  never superseded) — still readies with the existing "named ability or
  Any Aggressive Ability" picker.

**Defensive implementation status:** all four (corrected) operators are
implemented. Playing Nullify, Reflect, Resist, or Nullify Cost is a
self-cast (no board target, except Resist's category picker and Nullify
Cost's ability picker) that *readies* it — pushed onto the unit's own
`readiedDefensives` list, costing the normal 20 Ini immediately, with no
persistent-slot limit the way Passive's "one at a time" is explicit about
(any number can be readied at once). It's consumed later, off the
*opponent's* subsequent matching action, via `declareAction(type, u,
target, onResolve, context)` — a **generic, trigger-typed interrupt
system** (ported, in spirit, from a richer unused prior prototype build's
own `declareAction()`; this engine's readied-ability data model is its
own, not a verbatim copy). `type` is now matched against either a single
trigger string or an array of trigger strings on the readied record (to
support Nullify/Reflect's dual triggers), with an optional
`d.triggerFilter(type, context)` for narrower matching (Reflect's
Inflict-only scoping) and an optional `d.resistCategory` check against
`resistCategoryOf(context.cardId)` (or the literal `'damage'` for a
Weapon Strike, since a Strike isn't a card) for Resist. Two call sites use
it: `finalizeCast` declares `'aggressive-played'` (an incoming
single-target Aggressive or Aggressive-flavored Ultimate card — Nullify
cancels it, Reflect redirects an Inflict-based one back onto the caster,
Resist grants immunity if the card's operator falls in the readied
category; for Nullify Cost, also refunds the caster's spent Initiative)
and `resolveStrikeHit` declares `'weapon-strike-declared'` per hit
(Nullify cancels the Strike outright — no damage to either side; Reflect
redirects the damage onto the attacker instead of the defender; Resist
grants immunity if `'damage'` was the readied category — each checked
independently for Spear's two cells, see that section).

The real behavioral difference from the version this replaced: when the
*defending* unit is human-controlled and has **two or more** different
readied responses matching the same trigger (e.g. both Nullify and Nullify
Cost readied at once against an incoming Aggressive card), a response
window (`#defensive-response-overlay`) now opens and asks which one to
use — or to decline and let the action resolve unopposed, holding both
for a later trigger. The old version silently auto-picked one via array
order without ever asking. With 0 or 1 matching readied response, or an
AI-controlled defender, `declareAction` still resolves immediately with
no UI pause — the exact same behavior every prior version already had,
so nothing changes for the overwhelmingly common case.

**`DEFENSIVE_TRIGGERS` — the full 8-entry vocabulary**, transcribed from
the GDD's own §11.5 Trigger Reference table:

| `trigger` | Fires when | GDD operators bound to it | Wired to a real call site? |
|---|---|---|---|
| `aggressive-played` | Opponent plays an Aggressive card | Nullify, Nullify All | ✅ `finalizeCast` — Nullify, Reflect (Inflict-scoped), Resist, Nullify Cost |
| `weapon-strike-declared` | Opponent declares a Weapon Strike | Nullify, Reflect | ✅ `resolveStrikeHit` — Nullify, Reflect, Resist |
| `movement-declared` | Opponent declares Movement | Intercept, Rewind | ❌ not wired |
| `talisman-placement-declared` | Opponent declares Talisman placement | Unravel, Forbid | ❌ not wired |
| `card-drawn` | Opponent draws a card | Disrupt, Suppress | ❌ not wired |
| `ability-played-any` | Opponent plays any card, any family | Suppress | ❌ not wired |
| `defensive-played` | Opponent plays a Defensive card | Nullify Cost | ❌ not wired |
| `supportive-played` | Opponent plays a Supportive card | Counter, Sever | ❌ not wired |

Only the first two have both a real operator using them *and* a natural
single-target framing: Nullify/Reflect/Resist/Nullify Cost all defend the
one specific unit the action is against, matching this engine's
per-unit-scoped `readiedDefensives` model exactly. The other six remain
named, documented vocabulary with no call site wired to them yet, for two
different reasons, not one oversight: (1) Movement Declared, Talisman
Placement Declared, Card Drawn, and Ability Played (Any) are declared
actions with **no specific defending unit** — the prior prototype build
this was ported from scanned every opposing unit's *hand* for a match
instead of one target's readied list, a real architectural difference
this engine's model doesn't share, and reproducing that team-wide-scan
shape correctly is a separate, larger design question; (2) Defensive
Played and Supportive Played *could* fit the single-target shape, but
have zero authored operators to validate the wiring against — Intercept,
Disrupt, Unravel, Counter (Basic) and Nullify All, Rewind, Suppress,
Forbid, Sever (Ultimate) are now named in this document (see the two new
operator tables below) but not yet added to `OPERATORS` or wired to any
call site — that's the next item on the "close every gap" list, not done
in this pass. Adding a call site with no real content behind it risks
guessing at behavior nothing has actually specified — the same
"documented, bounded subset" standard this project holds Ultimate cards
and Wonderland v2 to elsewhere.

**Nullify Cost's "named ability" picker is now built**, closing the one
simplification from the version above that had a concrete, buildable fix:
playing Nullify Cost from hand doesn't ready it immediately — it opens a
picker (rendered in `#hand-card-group`, same place/shape as the existing
OR-modifier choice) naming one specific incoming Aggressive card to ward
against, or "Any Aggressive Ability" for the old blanket behavior. The
choice is stored as `warded` on the readied-defensive record
(`{ operatorId, cardId, warded }`) and checked in `declareAction` via an
optional `context` argument (`{ cardId }`, passed by `finalizeCast`,
the only call site with an actual incoming-card identity to check
against — `resolveStrikeHit`'s Weapon-Strike-Declared trigger has no
card, so Reflect is never subject to `warded` there, matching its own
unqualified GDD wording for the Strike side). A readied entry with
`warded` unset — Nullify, always, and Nullify Cost when "Any Aggressive
Ability" was picked — still matches every incoming Aggressive card, so
the 0-or-1-match/AI-defender paths above are entirely unaffected by this.
Nullify itself gets no ability picker: GDD's own wording for it ("cancels
the incoming effect entirely") is already unqualified, nothing to name.

**Single-target Ultimates are now covered too.** `finalizeCast`'s
`declareAction` gate originally checked `cardCategory(card) ===
'aggressive'`, which is never true for an Ultimate card — `cardCategory`
returns `'ultimate'` regardless of what its underlying operators are, so
Nullify/Nullify Cost couldn't intercept ANY Ultimate, single-target or
Target-All, even ones built entirely from Aggressive operators
(`ult-devastate`: Inflict+Afflict; `ult-nhul-particul`: Scry+Seal). A new
`isAggressiveFlavored(card)` helper checks the card's actual effect
category for Ultimates (`OPERATORS[card.effects[0]].category`), the same
lookup `tryCast` already used for Ultimate targeting — single-target
Ultimates now route through `declareAction` exactly like a Basic or
Composed Aggressive card, and a readied Nullify/Reflect/Resist/Nullify
Cost resolves against the whole thing (both effects at once, since
they're never split).

**One real, stated simplification remains:** Target-All Ultimates still
don't reach `declareAction` at all — `playUltimateCard`'s Target-All
branch resolves inline (`targets.forEach(t => card.effects.forEach(...))`),
never routing through `finalizeCast`. Making that interceptable would
mean checking each of N simultaneous targets for readied Defensives, some
of which might independently need a real response-window choice —
sequencing that (one target's choice must resolve before the next target
can even be checked, to avoid overlapping modal state) is a genuinely
bigger, separate lift than the single-target fix above, not built here.
Nor does either reach a Talisman's per-turn AoE tick, which isn't an
"opponent's action" in the same instantaneous sense at all (it's a
positional passive tick, not a declared action) — a readied Nullify will
not save you from a Target-All Ultimate or a Trap Talisman.

**Resist's category mapping is a stated interpretation, not GDD-enumerated.**
The GDD names Resist's four categories ("Damage, Control, Movement,
Ability Effects") but never states which operator belongs to which. This
build sorts every Aggressive-family operator into exactly one category
via `RESIST_OPERATOR_CATEGORY`, on the following stated reasoning:

| Category | Operators | Reasoning |
|---|---|---|
| Damage | Inflict, and a Weapon Strike itself (checked directly, not via this table, since a Strike isn't a card) | The GDD's only operator whose entire effect *is* damage |
| Control | Afflict, Hinder, Occlude, Disarm, Blind, Exhaust | Reduces a stat governing what the target can *do* (Initiative, Strike, Range) rather than where it can go or its survivability |
| Movement | Obstruct, Root, Displace | Reduces or forces the target's position/mobility specifically |
| Ability Effects | Seal, Jumbie, Banish, Glimpse, Scry, Crush, Void, Siphon, Drain, Impose, Destroy, Capture | Everything else Aggressive-family that manipulates cards, Talismans, or Passives rather than a movement/combat stat |

Resist grants immunity to whichever category was chosen at ready time, so
a category choice made against an incoming Inflict does nothing against a
follow-up Afflict — this is deliberately narrower than the old Mojo
mechanic it replaced, which nullified one specific Talisman regardless of
category. **Mojo's Talisman-nullify job itself has no replacement in the
corrected ruleset — it's a removed capability, not a renamed one**; the
only operators that still target a placed Talisman directly are Destroy
and Capture (same `targetsTalisman` click-a-cell path, restricted to
enemy-owned Talismans), both Aggressive, not Defensive.

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
   keep it open (or, for at least one canonical example, an action that
   *closes* it — see Ala zyu Haad below, a genuinely different shape).

Several operators and ability costs key off "if Wonderland open" (extra
draw on Supportives, IF WONDERLAND OPEN on Basics/Ultimates, Auto-Win on
Ultimates) — Open Wonderland state is a real, checked condition, not
flavor text, and needs to be modeled as first-class battle state per
character, not inferred.

### v1: self-declared (still the default for freeform Wonderlands)

Activation/Effect/Sustain are, in general, player-authored free text —
code fundamentally cannot parse or evaluate arbitrary prose ("when I
remember my sister's promise"). The only honest mechanism for a
genuinely narrative condition is a self-declared toggle: the player
attests their stated condition was met, the same way a tabletop GM would
trust a player's call. This remains the default and the fallback for
every Wonderland that doesn't opt into the structured layer below.

### v2: structured, auto-tracked conditions

**Not every real Wonderland is actually unparseable prose.** Master GDD
v2.0 §9.3's four canonical examples are all built from concrete,
countable in-battle actions — "three turns without a Weapon Strike,"
"control 3+ Talismans," "no weapons equipped" — not GM judgment calls.
Treating every Wonderland as equally unknowable was an overcorrection.
`monolith-codex.html`'s Tulpa wizard now offers an *optional* structured
picker alongside the free-text fields: when a Tulpa's Activation/Sustain
match one of the vocabulary entries below, Arena checks and opens/closes
the Wonderland automatically — no toggle, no honor system, for that
Tulpa. Free text stays required regardless (it's still what's shown to
the player and in the UI) — the structured pick is a parallel, optional
layer that makes it *also* mechanically real, not a replacement for the
description.

**Activation conditions** (checked eagerly — the instant they're met,
mid-turn, so activating feels like a real moment rather than a
next-turn surprise):

| `kind` | Meaning | GDD example |
|---|---|---|
| `agg-abilities-in-turn` | Play N Aggressive abilities in one turn | Rykndu — Crimson Moon |
| `no-weapons-equipped` | No weapon currently equipped | Aria — Flying Stance |
| `controlled-talisman-threshold` | Control N+ Talismans simultaneously | NLDR — Shadow Sovereign |
| `named-ability-played` | A specific, named ability card is played | Ala zyu Haad — Singular Entity ("Daedalus Tesseract only") |

`no-weapons-equipped` is implemented as a real check (`!u.weaponMain`)
but is **currently unreachable in play** — no action in this build ever
unequips a weapon (Switch Weapon swaps to the secondary, it never clears
`weaponMain`). Wired anyway, for when/if an Unequip action exists,
rather than omitted — a stated scope note, not a guess dressed up as a
feature. `named-ability-played` is implemented generically (matches any
card id), but Ala zyu Haad's actual "Daedalus Tesseract" card doesn't
exist in this build's `CARD_LIBRARY` yet (it's a named Ultimate combining
Root + Seal via IF/THEN — GDD §11.9's own note — not yet authored), so
it's demonstrated in this project's own tests against a stand-in card
id, not literally "Daedalus Tesseract."

**Sustain/close conditions:**

| `kind` | Meaning | Check timing |
|---|---|---|
| `weapon-strike-per-turn` | Must declare ≥1 Weapon Strike every turn | start of holder's own next turn, against last turn |
| `movement-per-turn` | Must declare Movement every turn | start of holder's own next turn, against last turn |
| `talisman-at-round-end` | Must control N+ Talismans at round end | round rollover |
| `close-on-weapon-strike` | Closes the instant a Weapon Strike is declared | immediate, in `tryStrike` |

**The GDD's own `[UNRESOLVED]` ruling, made here:** §9.1/§7.5/§16 flag
that the source design never specifies exactly when a sustain check
happens within a turn, or whether re-opening a closed Wonderland needs
the full Activation Condition again or something lighter. This project's
ruling: **sustain conditions of the "do X every turn" shape are checked
at the start of the holder's own next turn, evaluating what happened
during the turn that just ended** (a per-turn boolean flag, reset for
the new turn right after the check) — they cannot honestly be evaluated
any earlier, since the turn in question isn't over yet. **Re-opening
after a close always requires the full Activation Condition again from
scratch** — no separate "lighter" re-open path exists, because inventing
one with zero source guidance is a bigger leap than reusing the one
check function a Wonderland already has. `close-on-weapon-strike` and
`talisman-at-round-end` are exceptions to the "next turn" timing because
their own shape gives a more natural moment to check (immediately on the
triggering strike; at the round boundary, since "at round end" is
explicit in the condition's own name) — see the table above.

**Effects** (the mechanically real half — Effect stays free text always,
but picking one of these makes it *also* do something):

| `effectId` | Mechanical effect | GDD example |
|---|---|---|
| `all-crits` | Every Weapon Strike is a Critical Hit | Rykndu — Crimson Moon |
| `unlimited-distance` | Movement is not capped by the Distance stat | Aria — Flying Stance |
| `direct-damage-aggressive` | Every Aggressive card also deals Life damage equal to its own Initiative cost | Ala zyu Haad — Singular Entity |
| `talisman-aoe-plus-one` | +1 AoE on Talismans placed while open (not retroactive) | NLDR — Shadow Sovereign |

`direct-damage-aggressive` is a **stated interpretation**, not a literal
reading — GDD §9.3 says only "Aggressive Abilities deal direct damage"
without specifying an amount or whether it replaces or adds to the
card's own effect. Implemented as an additive bonus equal to the card's
own Initiative cost (reusing the existing 1:1 Life-damage-per-Initiative
convention already established for Inflict), stacked on top of the
card's normal effect, not a replacement.

## Seeded Canon Characters (GDD §12)

Arena's AI Squad (`PRESET_AI_SQUAD`) is the three personal Tulpa of
Charles — Rykndu, NLDR, and Ala zyu Haad — GDD §12's canonical, fully
rule-audited reference Grimoires, not generic placeholders (the earlier
`Thornclad`/`Vessa`/`Orune` filler squad they replaced). Stats, Class,
Position, weapons, and equipment are transcribed directly from each
character's GDD stat block; each Open Wonderland is wired to the real
Wonderland v2 condition matching its GDD Activation/Sustain/Effect — these
are, not coincidentally, the exact three canonical Wonderlands the
Effects table above already names as `all-crits` (Rykndu),
`talisman-aoe-plus-one` (NLDR), and `direct-damage-aggressive` (Ala zyu
Haad).

Each character's Grimoire in the GDD is a set of named abilities with
per-card IF/THEN sub-clauses, and in a few cases dynamic-scaling amounts
(NLDR's Shadow Step: "10 × Talismans you control") — neither the general
IF/THEN modifier layer nor dynamic per-Talisman scaling exists in this
engine yet (see the Fundamental Operators section and the Ultimate-cards
comment in both HTML documents for the current scope line). Rather than
leave these three characters unplayable until that generalized system is
built, each was given a **curated 10-card deck from this engine's
existing, already-implemented operator vocabulary** — the closest
available thematic match per named ability, main effect only (IF/THEN
tails dropped). This is the same "bounded, documented subset" approach
already used for Ultimate cards and Defensive/Reactive abilities
elsewhere in this document, applied to character content instead of a
mechanic.

**Rykndu** (Knight/Vanguard, GDD §12.2) — `card-inflict`, `card-hinder`,
`card-obstruct`, `card-hinder-and-obstruct`, `card-giveStrike`,
`card-giveMov`, `card-strike-or-mov`, `card-regen`, `card-gather`,
`ult-devastate`. Approximates her Aggressive-stat-reduction/weapon-strike
identity (Crimson Flash/Art of War → Hinder/Obstruct, Charge →
Give Mov, Regeneration/Preemptive → Regen/Gather); `ult-devastate` stands
in for her actual Ultimate, Blade Waltz (multi-target AoE Strike — not
buildable without Talisman-style area targeting on a Strike).

**NLDR** (Rook/Infiltrator, GDD §12.3) — `card-destroy`, `card-inflict`,
`card-nullify`, `card-transpose`, `card-occlude`, `card-jumbie`,
`card-reflect`, `card-shield`, `card-banish`, `ult-cataclysm`. Approximates
her Talisman-centric identity directly (Eldritch Disruption → Destroy +
Inflict, Eldritch Barrier → Nullify); `ult-cataclysm` (Target All +
Auto-Win, which already resolves Disarm via its own `.effects` array —
one of the two operators retiered to Ultimate-only this pass) stands in
for Eldritch Apocalypse, her actual Ultimate (AoE Talisman-range boost
with a multi-Talisman defeat condition). Previously listed `card-capture`
here — Capture is Ultimate-only per the operator-tier correction above
and no longer exists as a standalone card; swapped for Inflict, matching
Eldritch Disruption's own stated direct-damage half.

**Ala zyu Haad** (Bishop/Saboteur, GDD §12.1) — `card-banish`,
`card-reflect`, `card-nullify`, `card-shield`, `card-accelerate`,
`card-afflict`, `card-giveIni`, `card-glimpse`, `card-jumbie`, and a real,
newly-authored Ultimate: **`ult-nhul-particul`** ("Nhül Partikül": Scry
AND Seal — added to `ULTIMATE_CARDS` in both documents). Several of her
named abilities map onto existing operators directly rather than
approximately: Sea of Dirac → Banish, Counter Space → Reflect, Fractured
Void → Shield, Accelerate → Accelerate. Her actual Open Wonderland
Activation is "Daedalus Tesseract only" — Daedalus Tesseract is a named
Ultimate built from Root + Seal + an IF/THEN modifier and remains
deliberately unauthored (see the Known unresolved gaps entry below); her
seeded Wonderland instead triggers on **`ult-nhul-particul`**, her other,
buildable authored Ultimate — a stated stand-in, not a claim that
Nhül Partikül and Daedalus Tesseract are the same ability. Previously
listed `card-scry` here — Scry is Ultimate-only per the operator-tier
correction above; swapped for `card-glimpse`, Scry's own Basic-tier pair
per GDD §11.10, an even better fit for her information-themed profile.

Every character's deck is a flat 10 cards, same as any other Esori's —
GDD's per-character Deck Format sizes (Rykndu: Focused, 9+1; Ala zyu
Haad: Balanced, 7+2; NLDR: Balanced, 7+1) aren't modeled as a distinct
format system in this engine, which has always capped every deck at 10
regardless of format.

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
- Nhül Partikül — its bounded Scry+Seal subset is now built
  (`ult-nhul-particul`, see Seeded Canon Characters above). IF/THEN itself
  is now real for Basic Abilities (see the Modifiers section above), but
  the full named ability's Impose/draw-lock tail still can't be built even
  with it: it needs Ultimate-level IF/THEN (not wired to Ultimates yet)
  AND its THEN-effect ("Impose the card into their hand") isn't an
  operator application at all — same category of gap as Daedalus
  Tesseract's own THEN-effect below.
- Daedalus Tesseract — still fully unauthored (Root + Seal + an IF/THEN
  modifier); Ala zyu Haad's seeded AI Wonderland uses a documented
  stand-in trigger instead (see Seeded Canon Characters above). Even with
  Basic-Ability IF/THEN now built, this specific card needs two things
  that still aren't: Ultimate-level ALSO/IF-THEN (Daedalus Tesseract is
  Ultimate-tier), and its THEN-effect ("Open Wonderland") is a direct
  game-state change, not an operator applied to a target — the same shape
  problem Nhül Partikül's own Impose tail has above, not something the
  same-family operator-application model this pass built can express.
- Favor's mechanical role beyond currency-for-lore-interactions — unstated
  in every source doc.
