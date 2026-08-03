# Game 5 Pillars — Rykndu

**Status: written retroactively, 2026-08-03.** Unlike `GAME_3_PILLARS.md`/
`GAME_4_PILLARS.md`/`GAME_7_PILLARS.md`, this document was not written
before code — Rykndu's rig/physics/combat shape was discovered organically
across 24 commits and ~28 versions (`prototypes/rykndu-doll-rig.html`,
currently v0.1.28) with no formal Game Designer/Visual-Art-Director/
Audio-Designer/Engineer/Capability-Auditor sign-off pass. `GAME_7_PILLARS.md`
§0 itself already flags this gap ("Game 5 is Rykndu... unshipped, with no
portal entry and no studio-internal handover doc yet — a real gap, not this
document's problem to fix"). This document closes that gap by recording
what's actually true today, then naming — explicitly, not silently — what's
still missing before Rykndu is a shippable Game 5.

---

## 0. What it already is, verified against the real file

**Genre**: side-view 1v1 fighting game (Rykndu is the working title — no
canon-name decision has been made yet, unlike every other shipped game's
named payoff-moment title). Two builds live in one file today, running
simultaneously rather than as a real player choice (see §4):

1. **The Gauntlet** — solo survival: enemy dots approach from left/right at
   increasing pressure, killed via `resolveHits()`'s strike-phase window;
   ends at `MAX_MISSES = 5` missed defenses (`sessionState = 'lose'`).
   Scored by kill count.
2. **The Duel** — real 1v1: a second, fully independent rig (`p2`, same
   factory as `p1`, genuinely separate closure state) with its own
   gamepad/keyboard input, resolved via `resolveCombatHits()`, first to
   `MATCH_TARGET_SCORE` wins (`matchOver`/`matchWinner`).

**Core tech, already mature and test-covered** (12 Playwright suites,
`tests/rig-*.js`):
- Real velocity/acceleration/friction/gravity movement physics (both
  players), not the frame-locked pose-swap the rig started as.
- A hand-coded 15-joint FK skeleton (`RYKNDU_RIG_SCHEMA.md`), re-authored in
  v0.1.28 from a front-on figure to a genuine side-view profile stance —
  `solveRig(pose, standOffset, facing)` mirrors the whole solved joint set
  around `pelvis.x`, baked into the actual hit-tested coordinates, not a
  render-only transform.
- Guard/stamina meter, a parry window, combo-cancel on confirmed hits.
- Rig-vs-rig hit detection with knockback and ring-outs.
- Gamepad auto-assignment (`assignPad()`/`pollOnePad()`, connection order),
  keyboard, and touch (virtual joystick + 3 action buttons) input, unified
  behind one scheme all three input sources share.
- One kick attack per side; arms (`handL`/`handR`) are schema-ready
  (`RYKNDU_RIG_SCHEMA.md`) but have no live gameplay use yet.

**Visual/audio state**: side-profile faceted-gem joint accents (per the
studio's signature technique); P1/P2 colors independently verified against
the reserved gold/red/green bands (`STUDIO_BIBLE.md` §11); four dry,
reverb-free one-shot SFX voices (windup, strike, miss, proximity pulse) —
no music, no adaptive score. The page itself is still a bare dev-prototype
shell: monospace HUD, no `:root{}` shared token set, no `.overlay`/`.panel`/
`.btn` classes this studio's shipped games all share — visually unintegrated
with the rest of the arcade, not yet a reskin pass away from shipping.

## 1. The actual gap to a shippable Game 5

Per a dedicated research pass (2026-08-03): **the combat core is unusually
mature for a "prototype"; almost the entire remaining gap is the wrapper
that turns it into one coherent game**, not the mechanics themselves.

**Currently broken, not just missing** (see §4 for the scoped fix):
- The Gauntlet and the Duel run **simultaneously**, hardcoded
  (`SHOW_P2 = true`, `resolveHits()`/`updateEnemies()` and
  `resolveCombatHits()` both execute every frame unconditionally) — a
  player sees enemy dots approaching P1 *while* P2 is also live on screen.
  This is not two modes, it's one confusing overlap.

**Missing wrapper, not broken mechanic:**
- No title/menu screen, no mode choice — see §4.
- No PWA support (`rykndu-sw.js`/`rykndu.webmanifest` don't exist, unlike
  every shipped game — though Runeshatter, Game 7, currently ships without
  either too, so Rykndu isn't a new anomaly) — see §4.
- No portal card on `index.html` (confirmed absent by grep) — see §4.
- No join/pad-assignment ceremony — gamepad slot assignment is silent
  (connection order), not a "press any button to join" screen.
- No remap screen for non-standard gamepads (`RYKNDU_2PLAYER.md` names
  this itself as an open gap).

**Real feature scope, deliberately not attempted this pass:**
- A second attack type / real combo tree (combo-cancel currently re-fires
  the same single kick).
- Aerial actions — jump currently refuses both attack and guard.
- A second playable character/moveset (`p1`/`p2` are the same kit).
- Real hardware mobile testing (`RYKNDU_2PLAYER.md` names this as an open
  gap; only Playwright device emulation has been done).
- An adaptive score via `adaptive-game-audio` (currently four dry one-shots).
- A full Visual-Art-Director pass and cross-game visual-identity
  integration (the shared token/`.overlay` system, per `STUDIO_BIBLE.md`
  §11) — today's page is still a standalone dev shell.
- Meta-progression, persistent stats, real playtest-calibrated balance
  numbers (guard drain, parry window, knockback speed are all first-pass
  tuned values, same honesty standard every other game's handover states
  for its own difficulty numbers — see `difficulty-curve-calibration`).

## 2. Scope decision for this pass

Given the size of the full gap above, **this pass ships only the
ship-readiness wrapper**: a real title/mode-select framing screen, PWA
support, and a portal card — the same "pillars before deep feature work"
discipline this document itself represents. Everything in the "real
feature scope" list stays explicitly deferred, not silently dropped.

## 3. A scope correction found mid-implementation — named, not smoothed over

The original framing for the title/mode-select fix ("single-player vs
2-player becomes a real player choice, not both running at once") assumed
fully separating the two simulations. Reading the actual `frame()` loop and
the existing test suite changed that: **`tests/rig-match.js` and
`tests/rig-2player.js` (and others) load the page and immediately call
`window.Rig._test`/`window.Rig2._test`/`window.Duel._test` methods with no
menu-dismissal step** — they assume both `Rig`/`Rig2`/`Duel` are live and
directly testable from page load, exactly as today. Fully gating the
simulations behind a mode choice would silently break some or all of 12
already-passing suites unless the test suite's load-time assumptions were
updated in the same pass — a bigger, riskier change than "add a menu
screen," and not something to rush through at the tail end of an unrelated
session without dedicated verification.

**What actually shipped instead**: a real title/mode-select overlay that
gives the player an explicit, coherent choice and hides/mutes the
non-chosen mode's HUD and human-input routing — closing the "two modes
visibly overlapping on screen" bug a player would actually notice — while
leaving both simulations initialized and running exactly as before under
the hood, so every existing `_test` hook and all 12 Playwright suites keep
passing unmodified. **Fully pausing the unchosen mode's simulation (not
just its visibility) is real, scoped, deferred work** — it requires
updating `tests/rig-*.js`'s load-time assumptions in the same pass, not a
follow-up someone can do to the game file alone.

## 4. What actually shipped this pass

1. Title/mode-select overlay (`prototypes/rykndu-doll-rig.html`) — GAUNTLET
   vs DUEL choice, framing/input-routing scope per §3 above.
2. PWA infrastructure: `prototypes/rykndu-sw.js` (cache-first, explicitly
   scoped to `rykndu-doll-rig.html`) + `prototypes/rykndu.webmanifest`,
   following the `pwa-offline-games` skill's template, registered from the
   game file itself. **Named gap, not smoothed over**: real "Add to Home
   Screen" installability won't actually fire yet — the manifest's icon
   files (`icons/rykndu-192.png`, `-512.png`, `-512-maskable.png`) don't
   exist. No image-generation tooling was available this pass to produce
   real bespoke icon art, and reusing the arcade portal's own generic icon
   would show the wrong mark for an installed Rykndu shortcut, so nothing
   was substituted in their place. Offline caching (the service worker
   half) works today regardless; the manifest is structurally complete and
   will make the page installable the moment real icon art is added — no
   further code changes needed at that point. Confirming the site is
   actually served over real HTTPS (the skill's own hard prerequisite) is
   also still outstanding, same as it would be for any of this studio's
   other PWA setups before a real deploy.
3. Portal card on `index.html`, matching the studio's existing card markup.

## 5. Owner sign-off (retroactive, per this doc's own §0 note)

- **Game Designer**: genre/mode framing above reflects what's actually
  built, not a new design decision — no balance pass included this round
  (see `difficulty-curve-calibration` for the standing gap).
- **Engineer**: the §3 test-suite-coupling finding is the load-bearing
  discovery of this pass — any future work separating the two simulations
  must update `tests/rig-*.js` in the same commit, not after.
- **Visual-Art-Director / Audio-Designer**: no pass run this round —
  flagged in §1 as real, deferred scope, not silently skipped.
- **Capability-Auditor**: not run this round — Rykndu's own prototype
  status (still a dev-shell page, no shared visual/audio integration) is
  itself the finding a capability pass would most likely surface first;
  worth running once the visual-identity integration in §1 happens.
