---
name: pwa-offline-games
description: Adding installable, offline-capable PWA support (Web App Manifest + Service Worker) to one of this studio's single-file, no-build HTML5 games. Use when a game needs to work offline or be installable to a mobile home screen or desktop, and the site is confirmed served over real HTTPS (a hard platform requirement — verify this first, don't assume).
---

# PWA / Offline Support for Single-File Browser Games

Every Kazabon Game Studio game ships as one self-contained HTML file, no
build step. PWA support is the **one deliberate, minimal, justified
exception** to that — not a reversal of it. A Web App Manifest *can*
technically be inlined as a data URI in Chromium, but a **Service Worker
cannot be inlined at all** — it's a hard platform requirement that it be
its own file, fetched by its own URL, same-origin. So each game gets three
small satellite files alongside its HTML, nothing more: still zero build
step, zero bundler, zero runtime imports inside the HTML itself.

**Prerequisite, verify before starting:** the site must be served over real
HTTPS. Service workers refuse to register over plain HTTP (localhost is
exempted for dev testing only). Confirm actual deployment status via the
host's own API/dashboard before assuming this is unblocked — don't infer
it from "we pushed the repo."

## The rule that matters most, and that already got missed once

**Every edit to a file a service worker precaches requires bumping that
worker's `CACHE_NAME` in the same commit.** This applies forever, on every
future deploy, not just the one where PWA support was first added — read
this section even if you're only making a routine content edit and think
this skill doesn't apply to you.

The real incident this rule exists because of (full detail in
`STUDIO_BIBLE.md` §13): Wardfall's portal card was added to `index.html`,
the deploy to GitHub Pages genuinely succeeded, and the founder still saw
the old page — because `portal-sw.js`'s `CACHE_NAME` wasn't bumped, so any
browser that had already visited kept serving its already-cached old
`index.html` forever. The deploy log showing success and a real user seeing
the update are two different claims; a missed cache-version bump breaks
only the second one, silently, with no error anywhere. Automated tests
that always start from a clean browser profile won't catch this either —
they never exercise the "returning visitor with an already-installed
service worker" case. See the Verification section below for how to
actually check for it.

## Per-game file set (repo root, alongside `<game>.html`)

- **`<game>.webmanifest`** — `name`, `short_name`, `start_url`, `scope`,
  `display: "standalone"`, `background_color`/`theme_color` pulled from
  that game's own existing CSS custom properties (`--bg`/`--gold` or
  equivalent) — never invent new colors for this, reuse the game's real
  palette. `icons` array pointing at real PNG files (see below — manifest
  icons need to work reliably across engines; don't rely on data-URI icons
  even though some browsers accept them).
- **`<game>-sw.js`** — the service worker script (see template below).
- **`icons/<game>-192.png`, `icons/<game>-512.png`, `icons/<game>-512-maskable.png`**
  — generated from the game's own existing inline-SVG favicon, not a new
  art asset. Render the SVG at target resolution in a headless browser and
  screenshot it (Playwright) rather than reaching for an external
  image-generation tool or dependency — the favicon already exists and
  already carries the game's identity.

In the game's own `<head>`: `<link rel="manifest" href="./<game>.webmanifest">`.
In its existing script block, a guarded, feature-checked registration —
same posture as every other progressive-enhancement API this codebase uses
(Wake Lock, `navigator.share`, Gamepad):

```js
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./<game>-sw.js', { scope: './<game>.html' }).catch(()=>{});
  });
}
```

## The scoping gotcha — real, easy to get wrong

All of this studio's games live in the **same repo-root directory**, not
separate subdirectories. A service worker's default scope is the directory
containing its own script — registered with no `scope` override, a SW at
`/wonderland-sw.js` would default to scope `/` and could intercept fetches
for `sigilchain.html` and `index.html` too, silently breaking the other
games. **Always pass an explicit `scope` naming the exact page** (e.g.
`{ scope: './wonderland.html' }`) — Service Worker scope matching is a
URL-*prefix* match, not strictly a directory match, so scoping to a single
HTML file's own path is valid and keeps each game's PWA fully independent
of the others sharing its directory. Set the manifest's own `scope` field
to the same value for consistency.

## Service worker template — cache-first, version-invalidated

```js
const CACHE_NAME = '<game>-v1'; // bump this string on any meaningful deploy
const PRECACHE_URLS = ['./<game>.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if(url.origin !== self.location.origin) return; // let cross-origin (Google Fonts) pass through untouched
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
      return resp;
    }).catch(() => cached))
  );
});
```

**Why cache-first, not stale-while-revalidate or network-first:** these
games are static, don't change from moment to moment, and the whole point
is genuine offline play — a network-first strategy would make "offline"
mean "broken" the instant the network is flaky rather than fully absent.
Freshness comes from the explicit version bump in `CACHE_NAME`, not
per-request freshness checks — the `activate` handler's cache-cleanup is
what actually invalidates a stale build on a returning player's device.
**Don't skip that cleanup step** — without it, a player who installed an
old version keeps that version's cache forever even after a new deploy,
which is a real, previously-real bug class in service-worker-based sites
generally, not hypothetical.

**Why cross-origin (Google Fonts) requests pass through untouched, not
cached:** caching opaque cross-origin responses adds real complexity
(you can't inspect/vary them, they count against storage quota, and a
stale cached font is a much smaller problem than a stale cached game).
Both games already have a real CSS font-fallback chain
(`'Cormorant Garamond',Georgia,serif` etc.) — offline font loading just
falls through to that existing fallback exactly as it already does on a
slow/blocked connection today. No new fallback logic needed.

## Verification — do all of this live, not by reading the manifest/SW source

- Manifest fetches and parses as valid JSON with all required fields.
- `navigator.serviceWorker.getRegistration()` resolves after registration;
  `navigator.serviceWorker.controller` is set after a reload (confirms the
  SW is actually controlling the page, not just installed).
- **The real test**: load the page once online, then actually go offline
  (Playwright: `context.setOffline(true)`) and reload — the page must still
  load and be playable, not show the browser's offline error page. A SW
  that "registered successfully" with no errors can still fail this if the
  fetch handler or precache list has a bug — registration success is not
  the same as working offline.
- Bump `CACHE_NAME`, reload, confirm the *old*-version cache key is gone
  from `caches.keys()`, not just that a new one was added alongside it.
  To test this reliably and fast (a plain reload's implicit update check
  can be throttled/deferred by the browser and won't reliably fire within
  a short automated test): register the *old* worker against the *old*
  content first (reproducing a real returning visitor), then swap in the
  new files and call `await registration.update()` explicitly — this
  bypasses HTTP caching for the SW script fetch per spec, and is what
  actually caught the Wardfall incident (`STUDIO_BIBLE.md` §13) when a
  plain-reload test had missed it.
- After adding a service worker, re-run this game's existing adversarial
  test suite in full — a fetch-intercepting SW is exactly the kind of
  change that can silently interact with test harness patterns that also
  intercept requests (e.g. a Google-Fonts-abort route in the test itself).
  Confirm the existing suite still passes with the SW active, don't just
  assume it's unaffected.
