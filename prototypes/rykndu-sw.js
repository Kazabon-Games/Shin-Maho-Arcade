// Rykndu service worker — cache-first, version-invalidated. See the
// pwa-offline-games skill for the full rationale. Bump CACHE_NAME on any
// meaningful deploy that touches PRECACHE_URLS' contents.
//
// Scoped explicitly to this one file (registered with
// { scope: './rykndu-doll-rig.html' }) rather than left at the default
// per-directory scope, per the pwa-offline-games skill's own scoping
// gotcha — this worker has no siblings in prototypes/ today, but an
// explicit scope costs nothing and avoids relying on that staying true.
const CACHE_NAME = 'rykndu-v1';
const PRECACHE_URLS = ['./rykndu-doll-rig.html'];

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
