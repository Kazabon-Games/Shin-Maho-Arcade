// Sigil Chain service worker — cache-first, version-invalidated. See the
// pwa-offline-games skill for the full rationale (why cache-first, why
// cross-origin requests pass through untouched, why the activate cleanup
// step is mandatory). Bump CACHE_NAME on any meaningful deploy.
const CACHE_NAME = 'sigilchain-v3'; // bumped: apex-standard pass — portal card art, round/lifetime stats, expanded achievements, chain-building feedback, reduced-motion fixes, --danger/light-rune color fixes, mood-engine drone, cursed/phase/round-end stingers, per-clear float text, Daily mode + ShareCard
const PRECACHE_URLS = ['./sigilchain.html'];

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
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
      return resp;
    }).catch(() => cached))
  );
});
