---
name: cross-game-ui-modules
description: Use when adding a post-round share feature, an achievements/unlock system, or a screen-wake-lock guard to any Shin Mahou Arcade game. These three modules are already reused verbatim, game to game, with each new game's own comments explicitly citing the previous game as its source — read this before reinventing any of the three from scratch.
---

# Cross-Game UI Modules

**Why this is a skill:** three modules exist in this studio with an
explicit, self-documented reuse lineage — every new game's own code
comments say outright which earlier game it copied the module from,
verbatim, rather than reinventing it. That's a stronger, more concrete
form of reuse than most of this studio's other cross-game patterns, and
until now it had no dedicated skill of its own. Reuse the module, don't
rederive it — these are proven, bug-fixed reference implementations the
same way `aow_play_sheet.html`'s `importFromS0()` is for age-of-wonder's
import pattern.

## ShareCard — post-round share

**Lineage:** `iridescentcosmology.html:7751` (origin) → `wardfall.html:1683`
("mirrors iridescentcosmology.html:5534-5596's proven pattern verbatim")
→ `sigilchain.html:1534` ("mirrors wardfall.html's own ShareCard module
verbatim in shape... restated with Sigil Chain's own round-end stats").

**Shape, reused verbatim across all three:**
- `resultText(stats)` — one plain-text line built from that game's own
  already-existing round-end stats. **No new stats invented for the
  share text** — every implementation states this rule explicitly; if a
  stat isn't already shown on the round-end overlay, it doesn't belong in
  the share card either.
- `buildCanvas(stats)` — draws a fixed 600×315 canvas: gradient
  background, game title, a stat-columns row mirroring the round-end
  overlay layout exactly, a "SHIN MAHOU ARCADE" footer line. Reuse this
  layout's proportions/footer for a new game; only the title, palette,
  and stat columns change.
- `share()` — `canvas.toBlob()` → `File` → `navigator.share({ files, title, text })`
  gated behind `navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))`,
  falling back to a plain `<a download>` of the canvas PNG if Web Share
  isn't available or the user cancels. **Always feature-detect
  `canShare` before assuming file-sharing works** — some browsers support
  `navigator.share` for text/URLs but not files, and `canShare` is what
  actually tells you which.
- `copyText()` — a **separate**, plain-text-only fallback. Returns a real
  `Promise<boolean>` that resolves from the actual
  `navigator.clipboard.writeText()` outcome, not a synchronous `true`
  returned before the write is known to have succeeded — `sigilchain.html:1603-1608`
  documents this explicitly as a lesson learned once on `wardfall.html`'s
  copy of the module and deliberately mirrored correctly from the start
  on Sigil Chain's, instead of shipping the eager-`true` version and
  fixing it later. **This is the one place worth double-checking when
  porting the module to a new game** — copy the `Promise`-returning
  version, not an earlier or simpler-looking one.

## Achievements — unlock tracking + toast

**Lineage:** 4 games (`iridescentcosmology.html`, `sigilchain.html:1687`,
`wardfall.html`, `infall.html`) — `sigilchain.html:106-108` frames it
directly: "same classes/values as iridescentcosmology.html... the
studio's one existing achievements implementation, reused verbatim so a
third game inherits one proven pattern instead of a second invention."

**Shape:**
- `DEFS` — an array of `{ id, name, desc, check(roundSummary) }`. Every
  threshold in `check` should be **calibrated against real measured
  play**, not a round guess — `sigilchain.html:1691-1695`'s comment is the
  worked example: a `High Roller` threshold of 500 was retuned to 3000
  after measuring that a real round nets ~2,000-4,200 off the actual
  scoring formula, so 500 cleared in the first 10-20 seconds of nearly
  any round and gated nothing. See `difficulty-curve-calibration` for the
  general version of this discipline — an achievement threshold is a
  difficulty constant like any other.
- `checkAll(roundSummary)` — iterates `DEFS`, unlocks anything newly
  satisfied into `Persist.data.achievements[id] = { at: Date.now() }`,
  saves once if anything unlocked, and staggers toast display
  (`setTimeout(..., i*900)` per unlock) rather than showing several at
  once — reuse the stagger, multiple simultaneous toasts read as noise.
- `toast(a)` — a DOM element appended to `document.body`, `show` class
  added on the next frame (so the CSS transition actually plays instead
  of skipping straight to the shown state), auto-removed after ~3.6s.
- `render()` — the achievements-overlay list view, driven off the same
  `DEFS`/`Persist.data.achievements` the toast and `checkAll` use — don't
  let the overlay maintain its own separate copy of unlock state.

## Wake Lock guard — keep the screen on during an active run

**Lineage:** `iridescentcosmology.html:1855-1861` (origin) →
`sigilchain.html:752` ("same pattern as iridescentcosmology.html:1855-1861")
→ `wardfall.html`. 3 games.

**Shape — this exact four-line pair, feature-detected and silent on
unsupported browsers:**
```js
let wakeLockSentinel = null;
async function requestWakeLock(){
  if(!navigator.wakeLock) return;
  try{ wakeLockSentinel = await navigator.wakeLock.request('screen'); }catch(e){}
}
function releaseWakeLock(){
  if(wakeLockSentinel){ try{ wakeLockSentinel.release(); }catch(e){} wakeLockSentinel = null; }
}
```
Call `requestWakeLock()` on round start/resume, `releaseWakeLock()` on
pause/round-end — `sigilchain.html:752-755` notes explicitly that a
focused puzzle round is just as prone to screen-sleep interrupting play
as an action-game run, so don't skip this for a calmer game on the
assumption it only matters for twitchier ones.

## When porting any of the three to a new game

Copy the module, then change only what's genuinely game-specific (the
stat columns, the achievement defs/thresholds, the title/palette) — leave
the share/toast/wake-lock mechanics themselves alone. If a new game's
version needs to diverge from the shape above in a way that isn't just
reskinning, that's worth a second look: either the new game has a
genuinely different need (name it explicitly, the way `cartography`
names why it doesn't default to `faceted-gem-rendering`), or the
divergence is an accidental regression from the proven pattern.

## Verification

`share()`/`copyText()` need to be checked on a real device where Web
Share is actually available (desktop Chromium often lacks it, falling
through to the download path every time regardless of whether the code
is correct) — don't conclude the share path works just because the
download fallback fired. Achievement thresholds get verified the way
`difficulty-curve-calibration` describes: measured against real logged
runs, not eyeballed. Wake Lock has no visible failure mode to check by
eye at all — it either silently didn't request (unsupported browser, by
design) or is actively held; confirm via `navigator.wakeLock` state in a
live browser, not by assuming the guard "must be working" because it
doesn't throw.
