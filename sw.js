const CACHE = 'tripnas-v4'; // Ganti ini jadi 'tripnas-v5' jika Anda mengubah file lagi

// 1. TETAP DIPAKAI: Untuk "mengisi kulkas" saat instalasi
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      '/', 
      '/index.html', 
      '/css/index.css', 
      '/js/index.js'
    ]))
  );
});

// 2. TETAP DIPAKAI: Untuk membersihkan cache lama (v1, v2, dst)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
});

// 3. DIGANTI: Menggunakan strategi Stale-While-Revalidate (SWR)
self.addEventListener('fetch', e => {
  // Hanya proses request GET
  if (e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(cache => {
      // 1. Coba ambil dari cache dulu (Stale)
      return cache.match(e.request).then(cachedResponse => {
        
        // 2. Selalu coba ambil dari network (Revalidate)
        const fetchPromise = fetch(e.request).then(networkResponse => {
          // Jika sukses, update cache
          // Pastikan networkResponse valid sebelum di-cache
          if (networkResponse && networkResponse.status === 200) {
            cache.put(e.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
          // Gagal fetch (mungkin offline)
          // Jika kita punya respons dari cache, itu sudah dikembalikan
          // Jika tidak, ini akan melempar error (atau Anda bisa kembalikan halaman offline custom)
          console.error('Fetch failed:', err);
          throw err;
        });
        
        // 3. Kembalikan hasil
        // Jika ada di cache, langsung kembalikan (biar cepat)
        // Jika tidak ada di cache, tunggu hasil fetch
        return cachedResponse || fetchPromise;
      });
    })
  );
});
