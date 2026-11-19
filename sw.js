// Pixel Habits – Service Worker.
// App-Dateien cache-first aus versioniertem Cache, Google Fonts aus eigenem Cache.
// Bei Releases VERSION erhöhen (muss zu APP_VERSION in app.js passen).
//
// Update-Fluss (wie bei Wurzelwerk): Ein neuer SW lädt seinen Cache vollständig und wartet.
// Die Seite zeigt „Neue Version verfügbar – Neu laden“; Antippen schickt
// {type: 'SKIP_WAITING'} → aktivieren → die Seite lädt neu (controllerchange).
// Beim nächsten Kaltstart aktiviert app.js einen wartenden SW automatisch.
// Alle Daten liegen in localStorage → kein Datenverlust beim Neuladen.
// Ausnahme: Läuft noch die allererste Version (Cache „pixelhabits-v2“, kennt keine
// Update-Meldung), aktiviert sich der neue SW einmalig sofort.
const VERSION = '1.1.0';
const CACHE = 'pixelhabits-' + VERSION;
const FONTS = 'pixelhabits-fonts';

const SHELL = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })));
    if ((await caches.keys()).includes('pixelhabits-v2')) await self.skipWaiting();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k.startsWith('pixelhabits-') && k !== CACHE && k !== FONTS) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pixel-Schrift: einmal laden, danach aus dem Cache (auch offline)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith((async () => {
      const cache = await caches.open(FONTS);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  if (url.origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (e) {
      if (req.mode === 'navigate') return cache.match('index.html');
      throw e;
    }
  })());
});
