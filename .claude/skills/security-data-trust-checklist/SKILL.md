---
name: security-data-trust-checklist
description: Use before any repo-visibility change (private→public), before a first deploy to GitHub Pages, before adding a new third-party script/CDN dependency, or when reviewing code that renders user-supplied text (bug reports, player names, future leaderboard entries). Formalizes STUDIO_BIBLE.md §10 as a runnable checklist rather than prose to remember. Read this before running that checklist, not after a repo has already gone public.
---

# Security & Data Trust Checklist

**Why this exists as a skill, not just Bible prose:** `STUDIO_BIBLE.md` §10
has stated this checklist since the incident that created it (Iridescent
Cosmology's repo went public with two internal docs still readable in git
history), but a checklist that only exists as a paragraph in a bible
doesn't get *run*, it gets *remembered approximately* — the same gap
`GAME_4_PREP.md` §3 named when it scoped this skill as a candidate.
`security-reviewer`'s own definition already carries this checklist; this
skill exists so the checklist is invocable directly, by any agent, at the
exact moment it's needed (a repo-visibility flip, a first deploy, a new
CDN dependency) rather than only when someone remembers to bring in the
full `security-reviewer` role.

## The checklist, in order

**1. Full-history exposure scan — always run first if a visibility change
or first deploy is in scope:**
```
git log --all --oneline -- <path-to-internal-doc>
```
Run this for every internal-only file (studio bible, handover docs,
`KAZABON_BIO.md`, anything with unreleased roadmap/strategy). Untracking a
file (`git rm --cached`) does **not** remove it from earlier commits — if
this command returns any hits on a repo that's already public or about to
go public, that content is exposed regardless of what HEAD currently
tracks. The fix is `git filter-repo` (or BFG) rewriting history, followed
by a force-push, followed by verifying against the actual hosted remote —
not just the local working tree, since GitHub itself may have cached
objects from the exposed history.

**2. `.gitignore` hygiene:**
- Confirm every internal-only doc is listed.
- Confirm the `.gitignore` entry predates the first commit that touched
  that file — an entry added *after* a leak doesn't undo the leak, it only
  stops the next one. Check with `git log --all --diff-filter=A -- <file>`
  against the `.gitignore`'s own commit date.

**3. Client-side app security** (these games are single-file, no-build,
no-backend — the attack surface is narrow but real):
- `grep -n "innerHTML\|insertAdjacentHTML" *.html` — for every hit, confirm
  the interpolated value either never includes user-supplied text, or goes
  through an escaping helper (`escapeHtml()` is the studio's existing
  pattern). Don't assume one escaping call site elsewhere in the file
  covers every other site — check each one.
- `grep -n "eval(\|new Function(" *.html` — zero tolerance if either
  argument can trace back to an external or user-supplied string.
- List every third-party script/CDN currently loaded (`grep -n "<script src=\"http\|@import url(\"http" *.html`)
  and confirm each one is a named, reviewed decision (today: Google Fonts
  only). Flag anything new since the last check as needing the same
  explicit review, not a silent addition.

**4. Data handling:**
- Confirm `localStorage` (or whatever persistence layer is current) never
  silently sends data off-device — `grep -n "fetch(\|XMLHttpRequest\|navigator.sendBeacon" *.html`
  should return nothing outside of intentionally-reviewed cases.
- If accounts, telemetry, or cloud saves are being added in this pass,
  treat that as a hard gate: a real data-handling policy (what's
  collected, where it's stored, how a player deletes it) must exist
  *before* it ships, not as a follow-up task.

**5. Software supply chain (added 2026-08-03, OWASP Top 10:2025 moved this
to its own top-level category, A03).** Every CDN dependency this studio
loads today is Google Fonts (`grep -n "fonts\.googleapis\.com\|fonts\.gstatic\.com" *.html`
— confirmed present in at least `wardfall.html` as of this pass). **Don't
reach for a blanket "add an `integrity=` attribute" fix here without
checking first**: `fonts.googleapis.com`'s CSS endpoint serves a
User-Agent-varying response (different browsers get different `@font-face`
declarations/formats), so a single fixed SRI hash would break the
`<link rel="stylesheet">` for some real visitors, not secure it — this is
a genuine case where the standard mitigation doesn't transfer cleanly, not
a shortcut to skip the check. The two real options, if this ever needs
tightening: self-host the font files (removes the CDN trust boundary
entirely, at the cost of the single-file-no-build convention gaining a
few binary asset files) or explicitly document the CDN as a reviewed,
accepted trust boundary (Google's own subresource, not arbitrary
third-party content) — either is a legitimate call, but it should be a
named decision in the review output, not silently absent. Confirm no
*other* CDN dependency has been added without the same review (any hit
from the third-party-script grep in check 3 that isn't Google Fonts is a
new case needing its own explicit look, SRI-feasible or not).

**6. Exceptional-condition handling (added 2026-08-03, also new in OWASP
Top 10:2025).** Confirm the app doesn't silently corrupt state or crash on
malformed input it didn't produce itself: a hand-edited or truncated
`localStorage` value, a bad/partial JSON import. `age-of-wonder`'s
`json-import-validation` skill already covers this for that repo's
import-across-documents flow — cite it rather than re-deriving the same
check there. `Shin-Maho-Arcade` has no equivalent named check today for
its own localStorage save/load path specifically (as distinct from
`age-of-wonder`'s cross-document import case) — if reviewing a game there,
confirm a corrupted/manually-edited save value degrades to a fresh-state
default rather than throwing an uncaught exception on load.

**7. Security misconfiguration (OWASP Top 10:2025 moved this to #2, from
#5).** GitHub Pages doesn't allow custom HTTP response headers for a
static site, but a `<meta http-equiv="Content-Security-Policy">` tag is
still usable and currently absent from every game file checked so far —
confirm whether one's been considered for the repo under review. A
confirmed "not adopted, here's why" (e.g. the studio's own inline
`<script>`/`<style>` convention would need a CSP permissive enough that a
meta-tag CSP adds little real protection without also restructuring how
the single-file convention works) is a legitimate, real finding — say so
explicitly rather than leaving the question unasked.

## How to report

Severity-tiered (block-the-release / worth-fixing-soon / informational),
citing the exact command run and its actual output — "history is clean" is
not a finding, an empty `git log --all` result pasted in is. If checking a
pre-public-visibility flip, end with an explicit go/no-go, not just a list
of observations.

## What this skill is not

Not a substitute for the full `security-reviewer` agent when a genuinely
open-ended security question is in play — this is the mechanical,
repeatable subset of that role's job, scoped to run fast and get invoked
often, the same way `pwa-offline-games`' cache-bump checklist is a
narrower, more mechanical slice of `devops-release`'s broader job.
