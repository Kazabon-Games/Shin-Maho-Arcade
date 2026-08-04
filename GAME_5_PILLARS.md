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

**Core tech, already mature and test-covered** (13 Playwright suites,
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
  keyboard, and touch (virtual joystick + 4 action buttons, as of the
  second attack type) input, unified behind one scheme all three input
  sources share.
- A kick and a punch per side, combo-linked (kick→punch on a confirmed
  hit) — arms (`handL`/`handR`) are live as the punch's own weapon socket
  (was: "schema-ready... no live gameplay use yet", `RYKNDU_RIG_SCHEMA.md`).

**Visual/audio state**: side-profile faceted-gem joint accents (per the
studio's signature technique); P1/P2 colors independently verified against
the reserved gold/red/green bands (`STUDIO_BIBLE.md` §11); four dry,
reverb-free one-shot SFX voices (windup, strike, miss, proximity pulse)
plus a real adaptive music bed, now at **v2** as of the apex-standard
showcase pass (see §7) — per-mode identity (Gauntlet vs. Duel genuinely
sound different, not just louder/quieter), a Duel clash voice, a
Gauntlet-only heartbeat, and signature-motif stingers on parry/ring-out/
match-win. The title/mode-select menu, HUD, and result cards now share
the same `:root{}` token system and `.overlay`/`.panel`/`.btn` visual
language every other shipped game uses (also §7) — Rykndu is no longer a
visually standalone dev shell, though the rig's own silhouette is a
separately-named, still-open gap (see §7's qa/design notes).

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
- ~~A second attack type / real combo tree (combo-cancel currently re-fires
  the same single kick).~~ — **done, separate pass (see
  `RYKNDU_MOVESET.md`'s "Second attack type" section)**: a real punch
  shipped, combo-linked kick→punch, Duel-only by explicit scope decision
  (Gauntlet stays kick-only — the enemy dots have no separate high/low
  hurtbox). A distinct, further-out "real combo tree" (branching strings
  beyond a single kick→punch cancel) is still not attempted.
- Aerial actions — jump currently refuses both attack and guard.
- A second playable character/moveset (`p1`/`p2` are the same kit).
- Real hardware mobile testing (`RYKNDU_2PLAYER.md` names this as an open
  gap; only Playwright device emulation has been done).
- ~~An adaptive score via `adaptive-game-audio`~~ — **done at v1 scope,
  2026-08-03**, see §6. Deeper v2 work (a real Duel-specific intensity
  signal, per-mode motif identity, a signature stinger) is its own
  separately-named remaining scope, tracked in
  `prototypes/rykndu-assets/music/MUSIC_DIRECTION.md`, not re-listed here.
- ~~A full Visual-Art-Director pass and cross-game visual-identity
  integration (the shared token/`.overlay` system, per `STUDIO_BIBLE.md`
  §11) — today's page is still a standalone dev shell.~~ — **the token/
  `.overlay`/`.panel`/`.btn` integration is done, see §7**; the rig's own
  silhouette/pose distinctness is a real, separate finding from that same
  pass, explicitly NOT attempted (flagged for human/producer iteration,
  not auto-generated — see §7).
- Meta-progression, persistent stats. Balance numbers (guard drain, parry
  window, knockback speed) are still first-pass/Estimated, not
  human-playtest-calibrated — an independent §7 balance review confirmed
  the new punch/combo numbers are internally consistent (recomputed, not
  assumed) but explicitly labeled this Estimated, not Measured, same
  honesty standard every other game's handover states for its own
  difficulty numbers (see `difficulty-curve-calibration`).

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

*Rows below describe the ship-readiness-wrapper pass (§§1-4). See §7's own
sign-off note for the later apex-standard showcase pass — a second,
later, separate round of the same five roles, not a correction to this one.*

- **Game Designer**: genre/mode framing above reflects what's actually
  built, not a new design decision — no balance pass included this round
  (see `difficulty-curve-calibration` for the standing gap; closed in §7).
- **Engineer**: the §3 test-suite-coupling finding is the load-bearing
  discovery of this pass — any future work separating the two simulations
  must update `tests/rig-*.js` in the same commit, not after.
- **Visual-Art-Director**: no pass run this round — flagged in §1 as
  real, deferred scope, not silently skipped (run in §7).
- **Audio-Designer**: a real v1 adaptive-score pass ran 2026-08-03 — see §6
  (v2 in §7).
- **Capability-Auditor**: not run this round — Rykndu's own prototype
  status (still a dev-shell page, no shared visual integration) is
  itself the finding a capability pass would most likely surface first;
  worth running once the visual-identity integration in §1 happens (done
  in §7; a capability-auditor pass is still not run as of §7 either —
  remains a standing gap).

## 6. Music — v1 adaptive score (2026-08-03) — superseded by v2, see §7

*This section is the historical record of the v1 pass. v2 (per-mode
identity, a Duel clash voice, a Gauntlet heartbeat, signature stingers)
shipped later the same day as part of the apex-standard showcase pass —
see §7 and `prototypes/rykndu-assets/music/MUSIC_DIRECTION.md` (the
canonical, kept-current design doc) for the current state. Left
unedited below rather than rewritten, so this document's own history
stays legible pass-by-pass, the same convention §§1-5 vs. §7 already
follow.*

Full design rationale lives in
`prototypes/rykndu-assets/music/MUSIC_DIRECTION.md` (this studio's first
asset folder — every other game stays single-file with zero exceptions
but PWA; Music's canonical logic still lives inline in
`rykndu-doll-rig.html`, the folder is a design-brief-plus-staged-reference
layer, not a build dependency). Summary:

- A continuous 3-voice detuned drone bed (sawtooth, low register) through
  a lowpass filter, both cutoff and a second-voice level tracking a
  per-frame-smoothed `intensity` value — the actual "mood as a live
  input" mechanism `STUDIO_BIBLE.md` §14 names as the apex-standard bar,
  scoped down to what a still-prototype game needs rather than the full
  mood-engine complexity a shipping title would warrant.
- Intensity is driven by real combat state: closest enemy's travel
  fraction in the Gauntlet, a flat elevated baseline while a Duel is live,
  easing toward a low settled value once either mode resolves
  (`sessionState==='lose'` / `matchOver`).
- Sidechain-style ducking on strike/parry connects (both the Gauntlet kill
  path and the Duel `resolveDuelHit()` path).
- **Deliberately no reverb** — `tests/rig-audio.js` §6 already asserted
  zero `ConvolverNode`s across the whole session, a real tested decision
  from the v0.1.6 quality pass (dry mix keeps SFX transients sharp). The
  standard `adaptive-game-audio` synthesized-reverb technique was
  deliberately not used here rather than silently breaking that
  invariant — see `MUSIC_DIRECTION.md`'s own section on this.
- Shares `SFX`'s `AudioContext`/compressor bus (`Music.ensureCtx()` is
  called from inside `SFX.ensureCtx()`) rather than a second,
  uncoordinated signal path.
- **Verified live** (not read and judged plausible): `tests/rig-audio.js`
  re-run in full, 14/14 still passing including the zero-convolver
  assertion; all other 10 stable `rig-*.js` suites re-run clean (239
  assertions, `rig-side-profile.js`'s pre-existing flake excluded); and a
  direct live check confirming intensity actually rises as an enemy closes
  in (0 → 0.27 as travel fraction reached 0.72), settles low on a Gauntlet
  loss (0.087, target 0.08), and settles near the Duel baseline (0.50 and
  rising toward 0.55 after 1.2s, matching the smoothing rate).

## 7. Apex-standard showcase pass (2026-08-03) — an ultra-polished vertical slice

Producer request: a public portfolio/trailer-quality vertical slice of
Rykndu, both modes equally polished, one new attack/combo added before
the polish pass. Run through this studio's own established
"apex-standard pass" process (precedent: Wardfall/Iridescent Cosmology/
Sigil Chain, e.g. commit `d820ae6`; Rykndu's own v0.1.6 quality pass was
an earlier instance of the same shape) — a real multi-role team
consultation producing a scoped, concrete fix list, implementation in
dependency order with its own commit and full-suite verification per
sub-step, then an independent `qa-playtest` gate before calling it done.
Measured against `STUDIO_BIBLE.md` §14's actual apex bar (Art: a 10-second
first-watch distinctness test; Music: mood as a live input, "describe
what's happening from the music alone"; Mechanics: every formula
independently recomputed) — not a vibes-based "make it nicer" pass.

**Team consultation (parallel domain audits, before any code changed)**:
`game-designer` (the punch/combo design + balance approach),
`visual-art-director` (the visual-identity integration plan, and a live
screenshot-based check of the rig against the §14 distinctness test),
`audio-designer` (the music v2 differentiation plan), `engineer`
(architecture/risk-ordering check at 3600+ lines, ahead of a new attack
type + a visual reskin landing on top of 12 already-passing suites).

**What shipped, in the engineer-recommended risk order** (each its own
commit, each independently full-suite-verified before the next started):

1. **Music v2** — closes all four gaps v1's own `MUSIC_DIRECTION.md`
   named as deferred: a real Duel intensity signal (proximity + guard-
   break risk + match-point stakes, replacing v1's flat baseline),
   per-mode identity (`droneFilterQ` 0.7 Gauntlet / 2.2 Duel, a Duel-only
   clash voice, a Gauntlet-only heartbeat pulse), a signature open-fifth
   `bell()` stinger on parry/ring-out/match-win, and a reduced-audio
   intensity cap. `tests/rig-audio.js` grew from 7 to 15 sections (29
   assertions). Full design record: `MUSIC_DIRECTION.md`.
2. **A second attack (punch), combo-linked to the kick** — uses the
   previously-schema-ready `hand_r`/`hand_l` sockets for the first live
   gameplay purpose. Attack type now threads through the whole trigger/
   buffer/committed-phase pipeline, so a confirmed unblocked kick with a
   punch buffered combo-cancels into the punch (the real kick→punch
   string), not a second kick. Punch is faster/shorter-reaching/lower-
   knockback than the kick (70/50/160ms vs. 110/70/220ms,
   `PUNCH_KNOCKBACK_SPEED=320` vs. `KNOCKBACK_SPEED=480`) and targets a
   chest-height hurtbox instead of the kick's ankle-height one — a real
   high/low read between the two attacks. **Duel-only by explicit scope
   decision** (`resolveHits()`'s own comment) — the Gauntlet's enemy dots
   have no separate hurtbox to punch at, so the Gauntlet stays kick-only,
   unchanged. Wired into all four input surfaces (keyboard, touch,
   gamepad) so it's actually playable, not just testable. Also fixed a
   real, independently-verified geometry bug in the pre-existing
   kick→kick combo-cancel: at full knockback, a confirmed cancel could
   carry the defender far enough during the follow-up's own windup that
   the "confirmed" cancel actually whiffed (up to 42px of the 50px hit
   radius). `COMBO_KNOCKBACK_SCALE=0.4` fixes it, derived from the file's
   own physics constants. New file `tests/rig-second-attack.js` (31
   assertions).
3. **Visual identity integration** — the title/mode-select menu, HUD, and
   canvas-drawn result cards now share the same `:root{}` token system
   and `.overlay`/`.panel`/`.btn` visual language every other shipped
   game uses (`wardfall.html`'s tokens, copied verbatim; Rykndu keeps its
   own established monospace typography rather than importing wardfall's
   display/body fonts — a deliberate, named scope decision). Hardcoded
   hex literals that duplicated a token value were rewired to
   `var(--token)`; deliberately independent colors (dev-only markers, a
   considered HUD neutral, a derived "spent" shade) were left alone, each
   with a comment saying why. The GAME OVER and match-win cards gained a
   real per-frame entrance animation using this file's own existing
   `easeOutBack()` (a match win gets the bigger, slower, more triumphant
   pop). **The rig's own silhouette/pose data was deliberately NOT
   touched** — a live screenshot-based visual-art-director review during
   the consultation found the rig currently fails the §14 ten-second-
   distinctness test at real render size, and explicitly recommended
   flagging this for human/producer iteration rather than auto-generating
   a fix, citing high design-taste risk. **Named here as the one
   significant apex-standard gap this pass did not close** — a real
   finding, not smoothed over.
4. **Balance review** (read-only, no code changes needed) — every new
   constant independently recomputed rather than trusted from a comment:
   confirmed punch's knockback-per-committed-time is exactly equal to the
   kick's (proportional scale-down, not a hidden efficiency edge), the
   kick→punch combo saves ~55-62% of the time a fresh second attack would
   take without being strictly better than optimally-timed solo play, and
   `COMBO_KNOCKBACK_SCALE`'s margin holds (with *more* margin, as
   expected) for a punch follow-up's shorter 70ms windup, a case the
   original fix wasn't specifically verified against. Found and this pass
   fixed one non-blocking issue: a stale arithmetic error in the
   `COMBO_KNOCKBACK_SCALE` code comment (used the rejected 0.5-scale
   number instead of the shipped 0.4-scale one — the code and live
   behavior were already correct, only the comment's own math was wrong).
   Go/no-go: **go**, proceed to the qa-playtest gate.

**qa-playtest gate**: an adversarial live-driving pass (real clicks/taps/
key mashing across both modes and a 390×844 mobile viewport, not just
`_test`-hook scenarios) across the fully combined build — the first time
all of the above was exercised together rather than per-feature in
isolation. Found and this pass fixed two real, non-blocking defects that
no isolated suite had coverage for:
- The new PUNCH touch button geometrically overlapped JUMP by ~24px
  (both in the same column) — a real tap in the overlap zone always
  resolved to punch. Fixed with a genuine non-overlapping 2×2 touch-
  button grid.
- Reopening the reskinned mode-select menu and re-confirming the mode
  already active silently reset the running match/session score (no
  warning) — `window.startDuel()`/`startGauntlet()` couldn't previously
  tell "switching modes" apart from "re-confirming the current one."
  Fixed: only a genuine mode switch now resets progress.

Verdict after both fixes: **ship with named gaps** — no blocking issues;
the one meaningful remaining gap (rig silhouette distinctness) is
explicitly deferred, not silently dropped, per visual-art-director's own
recommendation above.

**Final verification**: all 13 `tests/rig-*.js` suites (297+ assertions)
re-run clean after every sub-step and again after the qa-playtest fixes;
`rig-side-profile.js`'s pre-existing intermittent flake (unrelated to
anything in this pass — a player-2-facing-mirror geometry assertion, not
a visual/combat one) reproduced at the same rate as before this pass,
confirmed via repeat runs rather than assumed.

**Still explicitly deferred, not silently dropped** (in addition to §1's
own longer-standing list, which this pass didn't otherwise change): the
rig silhouette/pose distinctness finding above; a `capability-auditor`
pass (still not run, per §5); real playtest-calibrated balance numbers
(§7.4's balance review is Estimated, independently-recomputed arithmetic,
not a human playtest); a `tests/rig-second-attack.js` addition covering
the punch follow-up's own drift margin live (currently only computed
analytically in §7.4, not asserted in a test).

## 8. Title-screen OST (`TitleTheme`, v0.1.29, 2026-08-04) — a real, separately-named feature, not folded into §7's Music v2

A producer request, distinct from §7's own apex-standard showcase pass:
"I want a soundtrack created that would have people doubting it's web
audio. The title screen for Rykndu must have the cleanest most
satisfactory OST created for a mobile game." Before this pass the title/
mode-select overlay played nothing (a deliberate v1/v2-era scope decision,
not an oversight — see `hideRyknduMenu()`'s own comment). This pass adds
`TitleTheme`, a wholly new module distinct from Music (§6/§7's own
adaptive gameplay score, whose behavior/frequencies/gains are untouched by
this work) — six real synthesized voices (sub-bass anchor, a 5-oscillator
chorused unison-stack pad, an FM lead quoting `ringOutStinger()`'s own
signature-motif gesture before extending into a full C-pentatonic phrase,
an FM countermelody entering mid-piece, a free-timed soft pulse, and a
sparse noise-burst shimmer) over a real 32-second Intro→Statement→Build→
Full→Tail section timeline, activated on the page's first real user
gesture and stopped the moment the menu is first dismissed. Full design
record: `prototypes/rykndu-assets/music/MUSIC_DIRECTION.md`'s new
TitleTheme section.

**The one deliberate constraint change, named explicitly, not smoothed
over**: `TitleTheme` creates a real `ConvolverNode` (synthesized reverb,
the `adaptive-game-audio` skill's own documented technique) — new for this
file. `MUSIC_DIRECTION.md`'s "one hard constraint" section had already
pre-authorized exactly this move for a future pass that scoped reverb to
the music bed specifically, never SFX; this pass is that future pass.
`tests/rig-audio.js` §6's own zero-convolver assertion still passes
unmodified (its comment was updated in the same commit to state precisely
what it now proves — SFX and Music stay convolver-free under that suite's
programmatic-dismissal setup, not "zero anywhere in the file,
unconditionally"). New `tests/rig-title-theme.js` (25 assertions) covers
the real-gesture activation path §6's own suite structurally cannot
(dismissing the menu there is a direct `page.evaluate()` function call,
never a dispatched DOM event), including confirming the convolver count
stays pinned at exactly 1 through a run of real SFX one-shots afterward —
the original invariant's real purpose (SFX itself never creates one),
preserved and now more precisely proven than before.

**Honest limits of what was verified, stated plainly per this repo's own
convention**: every number in this composition (FM modulation indices,
reverb tail length, gain balance between the six voices, section timing)
was verified to land exactly where the code intends — live `AudioParam`
values read via Playwright across a real natural 32-second cycle (not
shortcuts), the full node graph traced by `.connect()` type, and
`TitleTheme.stop()`'s fade sampled at four real elapsed-time checkpoints.
**None of that verifies the actual subjective goal** ("doesn't sound like
Web Audio," "cleanest most satisfactory OST") — no speakers exist in this
environment. The FM modulation indices, reverb decay length, and the
relative gain balance between voices were tuned by ear-equivalent
judgment (informed by real FM-synthesis index/timbre relationships, not
guessed blind), not measured against a human ear, and are named plainly in
the task report as judgment calls a human listening pass may still want to
move. That listening pass — not this section, and not a green test run —
is the actual gate for calling this feature done.

**Full regression** (all 13 prior `tests/rig-*.js` suites, 297+ assertions,
plus the new `tests/rig-title-theme.js`) re-run clean. Two pre-existing,
narrow-timing-margin flakes were found and characterized during this
pass's own verification (both reproduce at a comparable rate on the
unmodified file too, confirmed via repeated head-to-head runs, so neither
is a regression from this work): `rig-side-profile.js`'s already-documented
player-2-facing-mirror flake (§7's own finding, unchanged) and a
previously-undocumented one in `rig-parry.js` — its own two `page.
waitForTimeout()` calls (100ms then 40ms) leave a razor-thin real-world
margin against the 110ms windup/120ms parry-window boundary, and under
this environment's variable load the actual elapsed wall-clock time
occasionally drifts enough to miss the intended parry window. Named here
as a real, out-of-scope finding for whoever next touches that suite, not
fixed by this pass.

**Reference-copy gap, named rather than silently left**:
`prototypes/rykndu-assets/music/rykndu-music-module.js` is a manually-kept-
in-sync staged reference copy of Music specifically (per
`MUSIC_DIRECTION.md`'s own "why a folder, not a game file" section) — it
was not extended to include `TitleTheme` as part of this pass, since the
task scope named `MUSIC_DIRECTION.md` and this file explicitly but did not
name that reference-copy file. It is now out of sync with
`rykndu-doll-rig.html`'s actual module set in the same way it always was
scoped to be (Music only) — worth a follow-up decision (extend the
reference copy's own scope to cover TitleTheme too, or explicitly narrow
its stated purpose to "Music only") rather than assuming either answer.

**Owner sign-off (this section only, retroactive per §0's own convention)**:
Audio-Designer — the design/verification work above. No Game-Designer/
Visual-Art-Director/Engineer/Capability-Auditor consultation pass was run
for this specific feature (unlike §7's own multi-role showcase pass) —
this was a single-domain audio commission, scoped and verified as such;
naming that rather than implying a team review happened when it didn't.
