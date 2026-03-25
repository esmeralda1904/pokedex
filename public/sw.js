const CACHE_VERSION = 'pokedex-v2';
const APP_SHELL_CACHE = `${CACHE_VERSION}-app-shell`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;
const OFFLINE_DB = 'pokedex-offline-db';
const OFFLINE_REQUEST_STORE = 'offline-requests';
const SYNC_TAG = 'pokedex-sync-requests';
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const notifyClients = async (message) => {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of clients) {
    client.postMessage(message);
  }
};

const APP_SHELL = [
  '/',
  '/index.html',
  '/assets/index.css',
];

const isApiRequest = (url) => url.includes('/api/');
const isWriteMethod = (method) => WRITE_METHODS.has(method.toUpperCase());
const isNavigatorOffline = () => self.navigator?.onLine === false;

const openOfflineDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(OFFLINE_REQUEST_STORE)) {
        db.createObjectStore(OFFLINE_REQUEST_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const addQueuedRequest = async (payload) => {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_REQUEST_STORE, 'readwrite');
    const store = tx.objectStore(OFFLINE_REQUEST_STORE);
    store.add(payload);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getQueuedRequests = async () => {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_REQUEST_STORE, 'readonly');
    const store = tx.objectStore(OFFLINE_REQUEST_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

const removeQueuedRequest = async (id) => {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_REQUEST_STORE, 'readwrite');
    const store = tx.objectStore(OFFLINE_REQUEST_STORE);
    store.delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const queueFailedRequest = async (request) => {
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let body = null;

  if (!['GET', 'HEAD'].includes(request.method)) {
    body = await request.clone().text().catch(() => null);
    if (body === '') {
      body = null;
    }
  }

  await addQueuedRequest({
    url: request.url,
    method: request.method,
    headers,
    body,
    createdAt: Date.now(),
  });
};

const registerSyncTask = async () => {
  if (!self.registration.sync) {
    return;
  }

  try {
    await self.registration.sync.register(SYNC_TAG);
  } catch (error) {
    console.log('[SW] Sync registration failed', error);
  }
};

const replayQueuedRequests = async () => {
  const queuedRequests = await getQueuedRequests();
  let syncedCount = 0;

  for (const queuedRequest of queuedRequests) {
    try {
      const response = await fetch(queuedRequest.url, {
        method: queuedRequest.method,
        headers: queuedRequest.headers,
        body: queuedRequest.body ?? undefined,
      });

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        await removeQueuedRequest(queuedRequest.id);
        syncedCount += 1;
      }
    } catch (error) {
      console.log('[SW] Replay failed, request kept in queue', error);
    }
  }

  if (syncedCount > 0) {
    await notifyClients({
      type: 'SYNC_COMPLETED',
      syncedCount,
    });
  }
};

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

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(replayQueuedRequests());
  }
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Cubopoke',
    body: 'Tienes una nueva notificación',
    url: '/',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    actions: [],
  };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch (error) {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        actions: payload.actions,
        data: {
          url: payload.url || '/',
          actionUrls: payload.actionUrls || {},
        },
      }),
      notifyClients({
        type: 'PUSH_RECEIVED',
        payload,
      }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const defaultUrl = event.notification.data?.url || '/';
  const actionUrls = event.notification.data?.actionUrls || {};
  const targetUrl = event.action && actionUrls[event.action] ? actionUrls[event.action] : defaultUrl;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existingClient = clientList.find((client) => client.url.includes(targetUrl));

      if (existingClient) {
        return existingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (isApiRequest(url.href) && isWriteMethod(request.method)) {
    event.respondWith(networkWithOfflineQueue(request));
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  if (isApiRequest(url.href)) {
    event.respondWith(networkFirstApi(request));
  } else {
    event.respondWith(cacheFirstStatic(request));
  }
});

const networkWithOfflineQueue = async (request) => {
  const requestForQueue = request.clone();

  try {
    return await fetch(request);
  } catch (error) {
    if (!isNavigatorOffline()) {
      console.log('[SW] Write request failed while online; skipping queue', error);

      return new Response(
        JSON.stringify({
          queued: false,
          offline: false,
          message: 'No se pudo completar la petición. Revisa CORS o disponibilidad del servidor.',
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

    console.log('[SW] Write request failed; queueing for sync', error);

    await queueFailedRequest(requestForQueue);
    await registerSyncTask();
    await notifyClients({ type: 'SYNC_QUEUED' });

    return new Response(
      JSON.stringify({
        queued: true,
        offline: true,
        message: 'Sin conexión. La petición se guardó para sincronización automática.',
      }),
      {
        status: 202,
        statusText: 'Accepted',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      }
    );
  }
};

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
