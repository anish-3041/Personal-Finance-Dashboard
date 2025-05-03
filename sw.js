const CACHE_NAME = 'my-pfd-cache-v1';
const urlsToCache = ['/', '/index.html', '/style.css', '/script.js', '/manifest.json', '/Assets/Images/image-192x192.png', '/Assets/Images/image-512x512.json','https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js' ];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});