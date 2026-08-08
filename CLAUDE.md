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
  caused real bugs.
- **`GAME_3_PILLARS.md` / `GAME_4_PILLARS.md` / `GAME_5_PILLARS.md` /
  `GAME_7_PILLARS.md` / `GAME_8_PILLARS.md`** — each game's
  pre-implementation design doc (Game Designer / Visual-Art-Director /
  Audio-Designer / Engineer / Capability-Auditor sign-off), written
  *before* code, not after. `GAME_5_PILLARS.md` (Rykndu, `prototypes/`)
  was added after the other three and missed this list until a
  2026-08-08 gap audit caught it — the same drift risk the studio's
  shared skill-count blocks already name, just showing up in this file
  instead; `GAME_8_PILLARS.md` (Swarmbreak, design-only, unimplemented)
  is added to this list in the same commit that created it, deliberately
  breaking that pattern instead of repeating it a third time. No
  equivalent exists yet for
  Games 1–2 (`Studio-Internal-`'s handover docs cover those retroactively
  instead).
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
