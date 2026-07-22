const CACHE_NAME = "se-calculator-2026-07-v6";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./patient-mix-patch.js"];
const PATCH_TAG = '<script src="patient-mix-patch.js"></script>';

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

async function patchedHtml(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    const text = await response.clone().text();
    const patched = text.includes('patient-mix-patch.js') ? text : text.replace('</body>', `${PATCH_TAG}</body>`);
    const out = new Response(patched, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    cache.put('./', out.clone());
    return out;
  } catch (error) {
    return (await cache.match('./')) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(patchedHtml(event.request));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
