# Pokedex Frontend (Vue)

Frontend para explorar pokémon, ver detalles, gestionar favoritos, equipos, amigas y batallas.

## Configuración

1. Instalar dependencias:

```bash
npm install
```

2. Verificar `.env`:

```env
VITE_API_URL=http://localhost:3001/api

# Opcional: activar PWA en desarrollo para probar instalación
VITE_ENABLE_SW_DEV=true

# Opcional: limpiar service worker y cachés en desarrollo
VITE_RESET_SW_DEV=false
```

3. Ejecutar:

```bash
npm run dev
```

## Vistas incluidas

- Login y registro
- Inicio con filtros (`type1`, `type2`, `region`, `name`)
- Detalle de pokémon (especie, estadísticas, ataques, evolución)
- Favoritos persistentes por usuario
- Administración de equipos
- Gestión de amigas por código
- Batallas entre amigas

## Responsive + PWA

- Layout responsive para móvil/tablet/escritorio (navbar adaptable, tarjetas y grids en una columna en pantallas pequeñas).
- Manifest disponible en `public/manifest.json`.
- Service Worker en `public/sw.js` para cache, modo offline básico, cola offline y sync en segundo plano.
- En producción, la app se registra como PWA automáticamente.
- En desarrollo, se puede habilitar el registro de SW con `VITE_ENABLE_SW_DEV=true`.

