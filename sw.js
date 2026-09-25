// Service Worker do Pelada Top PWA
const CACHE_NAME = 'pelada-top-v6.2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo-transparent.png',
  './logo.png',
  './icon-192.png',
  './icon-512.png',
  './pix-qr.png'
];

// Instalação do Service Worker e cache dos recursos offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
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
  self.clients.claim();
});

// Interceptação de requisições (tempo real para API e network-first para HTML)
self.addEventListener('fetch', (event) => {
  // 1. Ignora requisições de API para permitir tempo real (SSE e REST) sem interferência do cache
  if (event.request.url.includes('/api/')) {
    return;
  }

  // 2. Para navegação HTML, busca da rede primeiro para obter as atualizações mais recentes
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 3. Demais recursos estáticos: cache first com fallback de rede
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

