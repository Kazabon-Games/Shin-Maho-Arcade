# Monolith: The Esori Chronicles — Esori Record Schema (v0.1)

Locked before either `monolith-codex.html` or `monolith-arena.html` writes
an import/export code path, per `json-import-validation`. Covers the two
real handoffs this game has: Codex ⇄ Arena (same player, same session or
resumed later) and Codex ⇄ Codex (one player's Esori handed to another
person entirely). Same underlying record, two export **modes** — see below.

## Why one schema, two modes

A full local save (your own roster, on your own device) legitimately
contains your currency balances. A record you hand to someone else should
not — handing over your Stars/Fragments/Favor/Stones balance makes no
sense once it's a second person's copy, and shipping it anyway is a
silent economy leak, not a feature. Rather than two different formats to
keep in sync, this is **one record shape** with an explicit `exportMode`
field that determines which optional blocks are populated on write, so
both documents' import code can share one parser.

## Top-level shape

```json
{
  "schemaVersion": 1,
  "exportMode": "backup" | "share",
  "exportedAt": "ISO-8601 timestamp",
  "esori": { ... },
  "currency": { ... } | null
}
```

- `exportMode: "backup"` — full local save. `currency` populated. Used for
  Codex ⇄ Arena handoff and Codex-to-yourself-on-another-device backup.
- `exportMode: "share"` — a portable Esori to give to someone else.
  `currency` is `null`, always, on write — not just omitted, explicitly
  nulled, so a parser can't accidentally treat a missing key as "trust
  whatever's already in local state."

## `esori` block — required vs. optional

**Required — record is unusable/rejected without these:**

| Field | Type | Why required |
|---|---|---|
| `esoriId` | string (UUID) | Stable identity key. **This is the field that makes re-import safe.** Assigned once at creation, never regenerated. Re-importing a record with an `esoriId` already in the roster **updates that entry in place** (keyed merge, compared by `updatedAt`) — it never creates a duplicate roster slot. This is the exact bug class (`safe-keyed-reimport` in `age-of-wonder`) that's shipped and been re-fixed multiple times elsewhere in this studio; building the key-first here is cheaper than fixing a duplicate-roster bug after the fact. |
| `updatedAt` | ISO-8601 timestamp | Conflict resolution on re-import: newer `updatedAt` wins, older is discarded, never silently merged field-by-field. |
| `name` | string | An Esori with no name isn't a usable record. |
| `class` | `"knight" \| "rook" \| "bishop"` | Determines weapon access and a stat bonus — nothing about the character resolves without it. |
| `position` | `"vanguard" \| "saboteur" \| "infiltrator"` | Same — determines a stat bonus and is required for team validation (one of each per team). |
| `rarity` | integer ≥ 1 | Determines weapon damage (`10 × rarity`) directly; combat math breaks without it. |
| `tulpa` | object, see below | An Esori without a bonded Tulpa has no Open Wonderland ability and can't legally enter battle. |

**`tulpa` sub-object (required if `tulpa` present, which it always must be):**

| Field | Type | Notes |
|---|---|---|
| `name` | string | required |
| `openWonderland.activation` | string | required — free text description is fine, this is authored content, not a parsed rule |
| `openWonderland.effect` | string | required |
| `openWonderland.sustain` | string | required |

**Optional — safe, meaningful defaults, missing ≠ broken record:**

| Field | Type | Default when absent |
|---|---|---|
| `grimoire` | array of ability-card objects | `[]` — a brand-new Esori legitimately owns nothing yet |
| `deck` | array of up to 10 card IDs (must reference IDs present in `grimoire`) | `[]` — Arena falls back to an auto-suggested legal deck (7+2 or 9+1) from whatever's in `grimoire`, rather than refusing to load |
| `equipment` | object, one key per slot (`head`, `neck`, `hands`, `feet`, `body`) | all slots empty |
| `weapons` | `{ main: weaponId, secondary: weaponId|null }` | falls back to the one starting weapon each class's primary weapon type grants — never null on both, a class always has a legal default main weapon |
| `allocatedStars` | object, stat name → points spent | `{}` — base stats only, no allocation yet |
| `battlesWon` | integer ≥ 0 | `0` — drives the Rarity-progression table in MONOLITH_RULESET.md (R2 at 1 win, R3 at 2, ...); Arena writes this back to the shared local roster directly on a win, same-origin, same key it already reads from — no export/import round-trip needed for the common same-device case |
| `avatarSeed` | string (for procedural portrait generation, if/when that's built) | omitted → default placeholder |
| `notes` | string, free text | omitted → no notes shown |

A record missing a **required** field is rejected outright with a specific
named-field error message shown to the user ("this file is missing a
class — it isn't a valid Esori export") — never silently defaulted, per
`json-import-validation`'s core rule: don't let a missing-required field
quietly stand in for a missing-optional one.

## `currency` block

Only present when `exportMode: "backup"`. Shape:

```json
{ "stars": 0, "fragments": 0, "favor": 0, "stones": 0 }
```

All four required *within this block* when the block exists at all — a
partial currency block (e.g. `stars` present, others missing) is treated
as corrupt and rejected, not partially trusted. When `exportMode: "share"`,
this key is `null` and the importing document must not attempt to read it.

## Import behavior summary

| Importing into | From `exportMode` | Behavior |
|---|---|---|
| Codex (own roster) | `backup` | Full restore: identity, grimoire, deck, equipment, currency. Keyed by `esoriId`; existing entry updated if `updatedAt` is newer, otherwise import is a no-op with a "you already have a newer version of this Esori" notice. |
| Codex (own roster) | `share` | Adds the Esori to roster with **no currency change** — receiving a friend's Esori never grants or removes your own balances. Same `esoriId` keying/no-duplicate rule applies. |
| Arena (battle) | `backup` or `share` | Reads `esori` block only, builds the in-battle character sheet from it (base stats + class/position bonus + rarity-scaled weapon damage + equipment + deck). Never reads or needs the `currency` block at all — Arena has no reason to touch economy data. |

## Explicitly not yet in scope

- No signing/tamper-detection on exported files (a `share` record is
  trusted content from another player, same trust level as any other
  local file — not a security boundary; don't over-engineer this before
  it's asked for).
- No versioned migration path beyond `schemaVersion: 1` yet — add a
  migration function only once `schemaVersion: 2` is a real, needed
  change, not preemptively.
