const CACHE_NAME = 'karni-pro-v11';

const urlsToCache = [
  './',
  './index.html',
  './person.html',
  './products.html',
  './route.html',
  './route-map.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// التثبيت + التخزين
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// التفعيل ومسح الكاش القديم
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => {
        if(key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
  self.clients.claim();
});

// التقاط الطلبات
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
