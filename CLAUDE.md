# Shin-Maho-Arcade

Kazabon Games' public browser-game portal and game suite ("Shin Mahou
Arcade"). This file didn't exist before 2026-08-03 — before this,
onboarding a new session meant reconstructing context from `git log` and
each game's own in-file changelog comments alone. Read this first; it's
short on purpose.

## Start here

- **Studio-wide context lives in a separate, private repo** —
  `Studio-Internal-`. If you have access to it, read `STUDIO_BIBLE.md`
  §1–2, `TEAM_STRUCTURE.md`, and the relevant `<GAME>_HANDOVER.md` before
  doing substantive work here (per that repo's own README reading order).
  Internal-only docs (`STUDIO_BIBLE.md`, `KAZABON_BIO.md`,
  `WONDERLAND_HANDOVER.md`) are deliberately `.gitignore`d in *this* repo
  (see `.gitignore`) — if they're not on disk here, that's by design, not
  a missing checkout.
- If you don't have `Studio-Internal-` access, every `.claude/agents/*.md`
  file in this repo ends with a compressed "Shared studio context" block
  that carries the essentials — read that before doing substantive work.

## What's in this repo

- **Games at root, one self-contained HTML file each**: `iridescentcosmology.html`
  (Game 1), `sigilchain.html` (Game 2), `wardfall.html` (Game 3),
  `infall.html` (Game 4), `runeshatter.html` (Game 7) — plus a matching
  `<game>-sw.js` (service worker) and `<game>.webmanifest` per installable
  game. `index.html` is the arcade portal linking all of them.
- **`prototypes/`** — Game 5 ("Rykndu") in progress:
  `rykndu-doll-rig.html` plus three locked design docs
  (`RYKNDU_RIG_SCHEMA.md`, `RYKNDU_MOVESET.md`, `RYKNDU_2PLAYER.md`) —
  read these before assuming a move/state isn't implemented; they exist
  specifically because the moveset was previously undocumented and that
  caused real bugs. Also here, as of 2026-08-03: Game 8, **Monolith: The
  Esori Chronicles** — the studio's original IP (Wonderland in
  `age-of-wonder`/Game 6 and Iridescent Cosmology/Game 1 both already
  borrow its canon; this is the first build of the actual game), a
  two-document split — `monolith-codex.html` (Esori/Tulpa creation,
  Grimoire, roster) and `monolith-arena.html` (9x9 grid battle engine) —
  plus `MONOLITH_RULESET.md` (locked rules, reconciled across nine
  conflicting source PDFs — read its "Source precedence" section before
  trusting any one of those PDFs alone) and `MONOLITH_ESORI_SCHEMA.md`
  (the Esori JSON export/import shape shared by both documents and by the
  person-to-person Esori-sharing flow). Past Phase 0 now: Codex has a real
  creation wizard, roster persistence, a Grimoire/deck editor, and JSON
  import/export; Arena has a working 9x9 battle engine — movement, weapon
  strikes, initiative turn order, defeat/rally, and data-driven ability
  cards (playable by both the human and the AI) across every category —
  Aggressive/Supportive/Passive/Utility, placeable Talismans (Ward/Trap,
  Destroy/Capture/Mojo), Ultimate-tier cards (2 main effects, Target All,
  IF WONDERLAND OPEN, self-declared Auto-Win — a bounded subset, see
  MONOLITH_RULESET.md), and now Defensive/Reactive (Nazar/Parry/Nullify
  Cost, via a lightweight "readied ability" mechanism intercepted at two
  points — an incoming Aggressive card, an incoming Weapon Strike — rather
  than a full generic interrupt/priority system) — reachable end to end
  from character creation through a finished battle. `tests/
  monolith-adversarial.js` covers both documents. Every operator category
  named in MONOLITH_RULESET.md is now implemented at least in its stated,
  documented-scope form; remaining gaps are the deliberately-deferred
  sub-features each has its own note for (Ultimate's AND/ALSO/IF-THEN
  modifiers and Ultimate-level OR, Defensive's "named ability" picker and
  its two blind spots against Target-All Ultimates/Talisman AoE ticks,
  Refine's ally-targeting half) plus the three under-specified Special
  operators (Rhyzl Step, Daedalus Tesseract, Nhül Partikül) — see each
  doc's own scope notes for the exact line. As of 2026-08-05, a real
  `Monolith_Master_GDD_v2.0.docx` surfaced — explicitly "supersedes all
  prior documents" — along with several more-mature prior prototype
  builds (a single-file "Shell," a further-along single-file "Build 3"
  with a working automatic Wonderland-condition tracker and a generic
  Defensive interrupt system, plus standalone Tulpa/Ability/Grimoire/
  Operators module drafts). `MONOLITH_RULESET.md` is being reconciled
  against the GDD in place rather than replaced outright, since this
  repo's Talisman/Ultimate/Defensive work is real and tested — first
  pass fixed six confirmed correctness bugs the GDD exposed (Rally cost,
  Infiltrator's stat, Defeated-unit Strike targeting, Talisman placement
  delay, Projectile's Critical Hit). Second pass built "Open Wonderland
  v2": an optional structured Activation/Sustain/Effect layer in Codex's
  Tulpa wizard, on top of (not replacing) the original free-text/self-
  declared toggle — when a Tulpa opts in, Arena auto-tracks and opens/
  closes it for real, no honor system, covering all four of GDD §9.3's
  canonical Wonderlands (Rykndu, Aria, NLDR, and a stand-in for Ala zyu
  Haad's named-ability trigger, since her actual "Daedalus Tesseract"
  card isn't authored yet). Makes a concrete ruling for the GDD's own
  `[UNRESOLVED]` sustain-check-timing question — see
  MONOLITH_RULESET.md's Open Wonderland section. Third pass fixed the
  GDD's stat-reduction ratios: Afflict was miscategorized alongside
  Hinder/Obstruct/Occlude under one flat −1 rule — split into
  stat-reduce-1to1 (Afflict, matching GDD §11.1's "Life and
  Initiative... 1:1 with Initiative spent" grouping — a real,
  GDD-driven balance change, since a base-cost Afflict now takes 20
  Initiative instead of 1) and stat-reduce-20to1 (Hinder/Obstruct/
  Occlude, `max(1, floor(cost/20))` — no visible change at base cost,
  only diverges once a card's cost crosses 40). Fourth pass fixed Position
  per GDD §4.3: a Tulpa's stat bonus (Vanguard/Saboteur/Infiltrator) is now
  chosen fresh at deployment, in Arena's own setup screen, not locked to
  whatever was picked at creation — the same Tulpa can be Vanguard in one
  match and Saboteur in the next; Codex's Position step still records a
  default/recommended role shown on the sheet, but it's advisory only.
  Fifth pass seeded the GDD's Section 12 canon Grimoires — Rykndu, NLDR,
  Ala zyu Haad — as Arena's real AI Squad (replacing the placeholder
  Thornclad/Vessa/Orune), stats/Class/Position/weapons/equipment
  transcribed from their stat blocks, each Open Wonderland wired to
  Wonderland v2's matching auto-tracked condition, and each given a
  curated 10-card deck from the engine's existing operator vocabulary
  (their per-card IF/THEN sub-clauses and dynamic-scaling amounts aren't
  modeled — see MONOLITH_RULESET.md's Seeded Canon Characters section for
  the full per-card mapping). Added a real new Ultimate card,
  `ult-nhul-particul` (Scry AND Seal) — Ala zyu Haad's authored Ultimate
  and her Wonderland's stand-in trigger, since her actual "Daedalus
  Tesseract" needs the still-unbuilt generalized IF/THEN modifier layer.
  Sixth pass implemented Spear's two-cell Critical Hit (GDD §4.5): a
  Strike at Spear's max range (cheb=2, straight line) also strikes the
  intervening cheb=1 cell first, at normal damage, and forces the
  declared cell's own hit to Critical if that first hit connected —
  factored the single-target resolution logic out of `tryStrike()` into
  `resolveStrikeHit()` so it can run once or twice per declaration. Still
  open: porting Build 3's generic Defensive-trigger (`declareAction`)
  system in place of the current two-hardcoded-interception-point
  version — Wonderland v2 reused Build 3's *condition-tracking* idea but
  not that particular piece. **Seventh pass (final item) built that
  port**: a shared, trigger-typed `declareAction(type, u, target,
  onResolve)` replaces the two hardcoded `readiedDefensives.findIndex`
  checks, parameterized over the GDD's full 8-entry Trigger Reference
  vocabulary (`DEFENSIVE_TRIGGERS`) — only 2 of the 8 (aggressive-played:
  Nazar/Nullify Cost; weapon-strike-declared: Parry) have both a real
  operator and a natural single-target framing this engine's per-unit
  `readiedDefensives` model supports; the other 6 are named but
  unwired, for two distinct, documented reasons (see
  MONOLITH_RULESET.md). Real behavioral upgrade: a human defender with
  2+ different readied responses to the same trigger now gets an actual
  choice via a new response-window modal, instead of the old silent
  auto-pick — every 0-or-1-match case (everything else) is unchanged.
  This closed every item on the "tackle all, in order of priority" list.
  Eighth pass (working through the remaining documented gaps) built
  Nullify Cost's "named ability" picker — GDD's literal text is "negate
  the Initiative cost of a *named* ability/category," not the blanket
  "any incoming Aggressive" it shared with Nazar until now. Playing it
  from hand opens a picker naming one specific incoming card to ward, or
  "Any Aggressive Ability" for the old behavior; declareAction() gained
  an optional `context` argument so `finalizeCast` can pass the actual
  incoming card's id to check against. Nazar is unaffected (its own GDD
  wording is already unqualified). Ninth pass closed part of what was
  framed as "the one remaining Defensive gap": it was actually broader
  than stated — `finalizeCast`'s `declareAction` gate checked
  `cardCategory(card) === 'aggressive'`, which is never true for an
  Ultimate card regardless of what its own effects are, so Nazar/Nullify
  Cost couldn't intercept ANY Ultimate, not just Target-All ones. A new
  `isAggressiveFlavored(card)` helper (checking
  `OPERATORS[card.effects[0]].category` for Ultimates, the same lookup
  `tryCast` already uses for targeting) fixes single-target Ultimates
  built from Aggressive operators (`ult-devastate`, `ult-nhul-particul`)
  — they're interceptable now, exactly like a Basic/Composed Aggressive
  card. What's left is narrower and genuinely architectural: Target-All
  Ultimates resolve inline in `playUltimateCard`, never through
  `finalizeCast`, and making a multi-target declaration interceptable
  (each target potentially needing its own response-window choice,
  sequenced one at a time) is a bigger, separate lift. Nor does either
  reach a Talisman's per-turn AoE tick, which isn't a declared action at
  all (a positional passive tick, not an "opponent's action" in the
  interrupt-system sense).
- **`GAME_3_PILLARS.md` / `GAME_4_PILLARS.md` / `GAME_7_PILLARS.md`** —
  each game's pre-implementation design doc (Game Designer / Visual-Art-
  Director / Audio-Designer / Engineer / Capability-Auditor sign-off),
  written *before* code, not after. No equivalent exists yet for Games 1–2
  (`Studio-Internal-`'s handover docs cover those retroactively instead).
- **`tests/`** — one Playwright suite per game (`<game>-adversarial.js`),
  plus narrower feature suites (`<game>-audio.js`, `rig-*.js` for Rykndu).
  No unit-test framework — every suite drives a real served page via
  Playwright/Chromium, combining internal `_test` hooks (`Game._test`,
  `Music._test`) for fast setup with real UI-driven interaction. Run
  against a locally served copy of the repo root.
- **`.claude/agents/`** and **`.claude/skills/`** — the studio's canonical
  agent roster (11 agents) plus the 8 skills relevant to this repo (7
  studio-wide + `cross-game-ui-modules`, this repo's own; `age-of-wonder`
  additionally carries 2 more that don't apply here — see
  `STUDIO_BIBLE.md` §12 in `Studio-Internal-` for the full index), kept in
  sync with `Studio-Internal-`'s canonical copies per that repo's README.
  If you edit one here, also update the canonical copy in
  `Studio-Internal-` — don't let this repo's copy become the source of
  truth by accident.

## Known gaps, stated plainly (per studio convention)

- No root-level `CHANGELOG.md` — version history lives entirely in each
  game's own in-file changelog comment block and in commit messages. There
  is no single aggregated history across all seven games.
- No `<GAME>_HANDOVER.md` in `Studio-Internal-` exists for Sigil Chain in
  its original, non-reconstructed form — `SIGIL_CHAIN_HANDOVER.md` there
  is explicitly a reconstruction from cross-references, not a
  contemporaneous record.
