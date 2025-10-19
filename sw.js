const CACHE_NAME = 'metro-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './placeholder-svitilna.svg',
  './placeholder-mapa.svg'
  ,'./codes-db.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // rychlejší přechod do aktivního stavu
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // přebere kontrolu nad klienty ihned po aktivaci
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
