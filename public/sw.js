const CACHE_VERSION = 'pokedex-v1';
const APP_SHELL_CACHE = `${CACHE_VERSION}-app-shell`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/assets/index.css',
];

const isApiRequest = (url) => url.includes('/api/');

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      console.log('[SW] Caching app shell', APP_SHELL);
      return cache.addAll(APP_SHELL);
    })
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== APP_SHELL_CACHE &&
            cacheName !== DYNAMIC_CACHE &&
            cacheName !== API_CACHE
          ) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (isApiRequest(url.href)) {
    event.respondWith(networkFirstApi(request));
  } else {
    event.respondWith(cacheFirstStatic(request));
  }
});

const cacheFirstStatic = async (request) => {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (!response || response.status !== 200 || response.type === 'error') {
      return response;
    }

    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());

    return response;
  } catch (error) {
    console.log('[SW] Fetch failed; returning offline page', error);

    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return new Response('Offline - No cached version available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
};

const networkFirstApi = async (request) => {
  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] API fetch failed; trying cache', error);

    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return new Response(
      JSON.stringify({
        error: 'Offline - API not available',
        cached: false,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      }
    );
  }
};
