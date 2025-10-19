// sw.js

// Název cache a verze. Změnou verze se při aktualizaci service workeru
// stará cache smaže a vytvoří se nová s aktuálními soubory.
const CACHE_NAME = 'metro-terminal-v2';

// Seznam souborů, které chceme uložit do mezipaměti pro offline použití.
const URLS_TO_CACHE = [
  // Základní soubory
  '/',
  'index.html',
  'manifest.json',

  // Hlavní skripty v kořenovém adresáři
  'app.js',
  'codes.js',
  'console.js',
  'geiger.js',
  'history.js',
  'pwa-unlock.js',
  'resources.js',
  'storage.js', // Byl přidán chybějící soubor
  'tools.js',

  // Moduly v podadresářích
  'src/mechanics/flashlight.js',
  'src/mechanics/radio.js',

  // Datové soubory a assety
  'codes-db.json',
  'radio-messages.json',
  'assets/geiger-tick.wav', // assets/radio-static.mp3 byl odebrán, protože se nepoužívá

  // Ikony
  'icon-192.png',
  'icon-512.png',
];

// 1. Instalace Service Workeru a uložení souborů do cache
self.addEventListener('install', event => {
  self.skipWaiting(); // Zajistí okamžitou aktivaci nového SW po instalaci
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Otevřena cache:', CACHE_NAME);
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(err => {
        console.error('Nepodařilo se uložit soubory do cache při instalaci:', err);
      })
  );
});

// 2. Aktivace Service Workeru a správa starých verzí cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Pokud název cache neodpovídá aktuální verzi, smažeme ji.
          if (cacheName !== CACHE_NAME) {
            console.log('Mazání staré cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Zachytávání síťových požadavků (fetch)
self.addEventListener('fetch', event => {
  // Použijeme strategii "Cache first"
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Pokud je požadavek v cache, vrátíme ho.
        if (response) {
          return response;
        }

        // Pokud není v cache, pokusíme se ho stáhnout ze sítě.
        return fetch(event.request).then(
          networkResponse => {
            // Pokud byl požadavek úspěšný, uložíme ho do cache pro příště.
            // To je užitečné pro případné dynamicky načítané zdroje.
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(error => {
            // Pokud selže síť i cache, můžeme vrátit nějakou fallback stránku,
            // ale pro naši appku to není nutné, protože vše by mělo být v cache.
            console.error('Fetch selhal; požadavek není v cache a síť není dostupná.', error);
        });
      })
  );
});
