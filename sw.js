const CACHE_NAME = "tripnas-v7";
const OFFLINE_URL = "/offline.html";

// === INSTALL: Simpan file statis utama ke cache ===
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

// === ACTIVATE: Bersihkan cache lama ===
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();

  // Beri tahu tab aktif kalau SW baru sudah aktif
  self.clients.matchAll({ type: "window" }).then(clients => {
    clients.forEach(client =>
      client.postMessage({ type: "NEW_VERSION", version: CACHE_NAME })
    );
  });
});

// === FETCH: Tangani request jaringan ===
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // 🚫 Abaikan permintaan non-GET atau halaman admin
  if (req.method !== "GET" || url.pathname.startsWith("/admin")) return;

  // 🚫 Selalu ambil langsung dari jaringan untuk API dinamis:
  // Tema (get-config/save-config), backend posts, Cloudinary, dsb.
  if (
    req.url.includes("/.netlify/functions/get-config") ||
    req.url.includes("/.netlify/functions/save-config") ||
    req.url.includes("/.netlify/functions/get-posts") ||
    req.url.includes("cloudinary.com")
  ) {
    event.respondWith(fetch(req));
    return;
  }

  // ✅ Untuk file statis dan halaman publik, pakai strategi Stale-While-Revalidate
  if (
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.startsWith("/assets") ||
    url.pathname === "/" ||
    url.pathname === "/offline.html"
  ) {
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
  }
});
