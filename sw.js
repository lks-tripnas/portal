const CACHE_NAME = "tripnas-v6"; // naikkan versi agar cache lama dibersihkan
const OFFLINE_URL = "/offline.html";

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

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();

  // Kirim pesan versi baru ke semua tab
  self.clients.matchAll({ type: "window" }).then(clients => {
    clients.forEach(client =>
      client.postMessage({ type: "NEW_VERSION", version: CACHE_NAME })
    );
  });
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // 🚫 Jangan cache halaman admin, Cloudinary, API backend, dan get-config
  if (
    req.method !== "GET" ||
    url.pathname.startsWith("/admin") ||
    req.url.includes("/.netlify/functions/get-config") || // ⬅️ Tambahan penting
    req.url.includes("/.netlify/functions/") ||
    req.url.includes("cloudinary.com")
  ) {
    return;
  }

  // ✅ Untuk permintaan publik biasa, gunakan SWR + fallback offline
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
