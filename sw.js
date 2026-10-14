const CACHE = 'nobudget-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // 'reload' salta la cache del browser: prende sempre i file appena caricati
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// Risposta subito dalla copia salvata; in background controlla se c'e' una versione nuova.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!same && !fonts) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, {ignoreSearch: true});
    const fresh = same ? new Request(req.url, {cache: 'no-cache', credentials: 'same-origin'}) : req;
    const net = fetch(fresh).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    return Response.error();
  }));
});
