self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('tripnas-v1').then(c => c.addAll([
      '/', '/index.html', '/css/index.css', '/js/index.js'
    ]))
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
