const CACHE_VERSION = 'v2.0.1';
const CACHE_NAME = `pfd-cache-${CACHE_VERSION}`;
const URLS_TO_CACHE = [
  './',
  './index.htm',
  './style.css',
  './js/script.js',
  './js/chart.min.js',
  './manifest.json',
  './assets/images/icon-192x192.png',
  './assets/images/icon-512x512.png',
  './assets/fonts/font-awesome.css',
  './assets/fonts/webfonts/fa-brands-400.ttf',
  './assets/fonts/webfonts/fa-brands-400.woff2',
  './assets/fonts/webfonts/fa-regular-400.ttf',
  './assets/fonts/webfonts/fa-regular-400.woff2',
  './assets/fonts/webfonts/fa-solid-900.ttf',
  './assets/fonts/webfonts/fa-solid-900.woff2',
  './assets/fonts/webfonts/fa-v4compatibility.ttf',
  './assets/fonts/webfonts/fa-v4compatibility.woff2',
  './offline.html'

];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        URLS_TO_CACHE.map((url) =>
          cache.add(url).catch((error) =>
            console.warn(`Unable to cache ${url}:`, error)
          )
        )
      )
    )
  );
});


self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).catch(() => {
          // Return offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('./offline.html');
          }
        })
      );
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
