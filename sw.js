// Service worker: precaches the whole app + bundled data so it opens offline.
// f7d1c824c492 is generated as a content hash of precached files (250 files: Arabic + English pack + assets).
const BUILD = 'f7d1c824c492';
const CACHE = 'quran-' + BUILD;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const res = await fetch('./precache.json', { cache: 'reload' });
    const { files } = await res.json();
    const cache = await caches.open(CACHE);
    // Cache in small batches so a flaky connection fails the install cleanly rather than half-caching.
    for (let i = 0; i < files.length; i += 40) await cache.addAll(files.slice(i, i + 40));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('quran-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate') { const shell = await cache.match('./index.html'); if (shell) return shell; }
      return new Response('Offline and not cached.', { status: 503, statusText: 'Offline' });
    }
  })());
});
