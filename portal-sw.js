// Shin Mahou Arcade portal service worker — cache-first, version-invalidated.
// See the pwa-offline-games skill for the base rationale. This one differs
// from the per-game workers in one deliberate way: it's registered at root
// scope ('./') rather than scoped to a single filename, because GitHub
// Pages serves index.html for both "/" and "/index.html" and the portal
// needs to control whichever URL the player actually landed on. Root scope
// means this worker WOULD receive fetch events for navigations toward
// wonderland.html/sigilchain.html too (before either page's own more-
// specific service worker has ever registered on that device) — the
// PORTAL_PATHS allow-list below stops it from caching those under its own
// cache name; it explicitly passes anything outside its own precache list
// straight to the network instead, so the games' own workers stay the
// sole owner of their own caches once visited directly.
const CACHE_NAME = 'portal-v2'; // bumped: index.html gained the Wardfall card — see the activate handler below, which is what actually evicts 'portal-v1' from returning visitors' caches
const PORTAL_PATHS = ['/', '/index.html'];
const PRECACHE_URLS = ['./'];

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
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // let Google Fonts etc. pass through untouched
  if (!PORTAL_PATHS.includes(url.pathname) && !PORTAL_PATHS.some(p => url.pathname.endsWith(p))) return; // not this app's own page — leave it to the network (and, if visited directly, that page's own worker)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
      return resp;
    }).catch(() => cached))
  );
});
