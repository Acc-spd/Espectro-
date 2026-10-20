// Espectros 3D v1.1 · Service Worker (juego offline + actualizaciones automáticas)
// Al publicar una versión nueva, cambia VERSION para que los celulares actualicen la caché.
const VERSION = 'espectros-3d-v1.1.0';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(CORE);
    try { const req = new Request(THREE_URL, { mode: 'no-cors' }); await c.put(req, await fetch(req)); } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // three.js: primero caché (no cambia, versión fija r128)
  if (req.url === THREE_URL) {
    e.respondWith(caches.match(req).then(h => h || fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; })));
    return;
  }
  if (url.origin !== location.origin) return;
  // Archivos propios: caché al instante y se actualizan en segundo plano
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (req.mode === 'navigate' ? c.match('index.html') : Response.error());
  })());
});
