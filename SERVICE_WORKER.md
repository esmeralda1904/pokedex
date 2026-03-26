# Service Worker - Estrategia de Caché

## Componentes implementados

### 1. **APP SHELL Cache** (`pokedex-v2-app-shell`)
Cachea rutas fijas y esenciales de la aplicación:
- `/` (index)
- `/index.html`
- `/manifest.json`
- `/favicon.ico`

Se cachean al instalar el Service Worker.

### 2. **Dynamic Cache** (`pokedex-v2-dynamic`)
Almacena recursos solicitados dinámicamente:
- Archivos JS del bundle
- Imágenes y assets descargados
- Otros recursos no incluidos en APP SHELL

Se cachean bajo demanda cuando se descargan correctamente.

### 3. **API Cache** (`pokedex-v2-api`)
Cachea respuestas de peticiones API:
- `/api/pokemon`
- `/api/favorites`
- `/api/teams`
- Otras rutas a backend

Usar estrategia **network-first**: intenta traer del servidor primero, si no hay conexión devuelve cache.

---

## Estrategias de Caché

### Recursos estáticos (HTML, CSS, JS, imágenes)
**Cache-first** con fallback a network:
1. Busca en cache
2. Si no está → descarga del servidor
3. Si descarga OK → guarda en `DYNAMIC_CACHE`
4. Si no hay conexión → devuelve cached

### Peticiones API
**Network-first** con fallback a cache:
1. Intenta traer del servidor
2. Si OK → cachea en `API_CACHE`
3. Si falla o sin conexión → devuelve cached o error

---

## Ciclo de vida

### Install
- Cachea APP_SHELL
- Activa automáticamente (`skipWaiting`)

### Activate
- Elimina caches viejos (versiones anteriores)
- Toma control de todas las pestañas (`clients.claim()`)

### Fetch
- Intercepta peticiones GET
- Aplica estrategia según sea API o asset

---

## Actualización automática

1. **Detección**: app monitorea cambios del SW
2. **Instalación**: nuevo SW se instala en background
3. **Activación**: si hay update, el app recarga automáticamente
4. **Limpieza**: caches viejos se eliminan al activar

---

## Offline

- **Con datos en cache**: devuelve cached correctamente
- **Sin cache**: responde con error 503 y mensaje offline

---

## Versioning

Cambiar `CACHE_VERSION` en `public/sw.js` para forzar invalidación de cache:

```javascript
const CACHE_VERSION = 'pokedex-v2'; // v1 → v2
```

Esto eliminará automáticamente caches `v1-*` y creará nuevos `v2-*`.
