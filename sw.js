const CACHE_NAME = "se-calculator-2026-07-v8";
const HTML_CACHE_URLS = ["./", "./index.html"];
const STATIC_ASSETS = ["./styles.css", "./app.js", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([...HTML_CACHE_URLS, ...STATIC_ASSETS].map((url) => new Request(url, { cache: "reload" })))
    )
  );
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

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirstHtml(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(new Request(request, { cache: "reload" }));
    if (fresh.ok) {
      cache.put("./", fresh.clone());
      cache.put("./index.html", fresh.clone());
    }
    return fresh;
  } catch (error) {
    return (await cache.match("./index.html")) || (await cache.match("./")) || Response.error();
  }
}

async function networkFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(new Request(request, { cache: "reload" }));
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (error) {
    return (await cache.match(request)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstHtml(event.request));
    return;
  }
  event.respondWith(networkFirstAsset(event.request));
});