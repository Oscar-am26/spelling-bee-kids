const CACHE_NAME = "karate-bee-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./db.json",
  "./service-worker.js"
];

// Install: cache básico (ignora assets que no existan)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(APP_SHELL.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// Activate: limpiar caches viejos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
      await self.clients.claim();
    })()
  );
});

// Fetch: cache-first, fallback a red
self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;

      try {
        const fresh = await fetch(event.request);
        // Cachea solo GET y cosas del mismo origen
        if (event.request.method === "GET" && fresh && fresh.status === 200) {
          const url = new URL(event.request.url);
          if (url.origin === self.location.origin) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, fresh.clone());
          }
        }
        return fresh;
      } catch (e) {
        // Si se cae la red y no hay cache, al menos regresa index
        return caches.match("./index.html");
      }
    })()
  );
});
