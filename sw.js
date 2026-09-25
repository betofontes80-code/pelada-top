// Service Worker do Pelada Top PWA
const CACHE_NAME = 'pelada-top-v6.3';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js'
];

// Evento de Instalação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Evento de Ativação (limpa caches antigos)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Evento de Fetch (intercepta requisições)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
