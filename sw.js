const CACHE_NAME = "tripnas-v7";
const OFFLINE_URL = "/offline.html";

// === INSTALL ===
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([
        "/",
        "/index.html",
        "/detail.html",
        "/offline.html",
        "/css/index.css",
        "/css/detail.css",
        "/js/index.js",
        "/js/detail.js",
        "/assets/favicon.ico",
        "/assets/favicon-72x72.png",
        "/assets/favicon-192x192.png",
        "/assets/favicon-512x512.png",
        "/site.webmanifest"
      ])
    )
  );
  self.skipWaiting();
});

// === ACTIVATE ===
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// === FETCH ===
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // 🚫 Abaikan halaman admin dan permintaan non-GET
  if (req.method !== "GET" || url.pathname.startsWith("/admin")) return;

  // 🚫 Lewatkan langsung ke jaringan untuk API backend & Cloudinary
  if (
    req.url.includes("/.netlify/functions/") ||
    req.url.includes("cloudinary.com")
  ) {
    event.respondWith(fetch(req));
    return;
  }

  // ✅ File statis → Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(req).then(cachedResponse => {
        const networkFetch = fetch(req)
          .then(networkResponse => {
            if (networkResponse && networkResponse.ok && networkResponse.type === "basic") {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || caches.match(OFFLINE_URL));

        return cachedResponse || networkFetch;
      })
    )
  );
});
