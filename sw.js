// Keeps the app's own files on the device so it opens instantly and works
// offline (voice input still needs internet). Each load serves the cached copy
// and refreshes it in the background, so updates show up on the next open.
const CACHE = 'banglish-v4';
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/dictionary.js', 'js/english-words.js', 'js/transliterate.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // only our own files; the Claude API and CDN go straight to the network
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req)
        .then(res => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
