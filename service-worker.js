const CACHE_NAME = 'rugby-fir-v5';

const APP_FILES = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.json',
  './icon.svg',
  './pdf.min.js',
  './pdf.worker.min.js',
  './xlsx.full.min.js',
  './Modello_Rose_Under.xlsx',
  './Modello_Estrazione_FIR_Nominativo_Unico.xlsx'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (
          response &&
          response.status === 200 &&
          response.type !== 'opaque'
        ) {
          const responseCopy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseCopy);
          });
        }

        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
