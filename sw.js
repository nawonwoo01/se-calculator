const CACHE_PREFIX = 'se-calculator-';
const CACHE_NAME = `${CACHE_PREFIX}0.1.1-web-20261015-1`;
const ASSETS = ['./', './index.html', './styles.css', './app.js', './calculator-core.js', './release-config.js', './manifest.webmanifest', './icon.svg', './icons/icon-192.png', './icons/icon-512.png', './privacy.html', './support.html'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const hit = await cache.match(event.request, { ignoreSearch: true });
    if (hit) return hit;
    return fetch(event.request);
  }));
});
