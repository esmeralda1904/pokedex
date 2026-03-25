import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles.css'

const enableSwInDev = import.meta.env.VITE_ENABLE_SW_DEV !== 'false'
const resetSwInDev = import.meta.env.VITE_RESET_SW_DEV === 'true'

const clearDevServiceWorkers = async () => {
  if (!('serviceWorker' in navigator)) {
    return
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))

    if ('caches' in window) {
      const cacheKeys = await caches.keys()
      await Promise.all(cacheKeys.map((key) => caches.delete(key)))
    }
  } catch (error) {
    console.log('[App] Dev cleanup failed:', error)
  }
}

if (import.meta.env.DEV && resetSwInDev) {
  clearDevServiceWorkers()
}

const app = createApp(App)

app.use(router)

app.mount('#app')

if ((import.meta.env.PROD || enableSwInDev) && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('[App] Service Worker registered:', registration);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[App] New Service Worker available, activating...');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      },
      (error) => {
        console.log('[App] Service Worker registration failed:', error);
      }
    );
  });
}

if ((import.meta.env.PROD || enableSwInDev) && 'serviceWorker' in navigator) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) {
      return;
    }

    refreshing = true;
    console.log('[App] Controller changed, reloading...');
    window.location.reload();
  });
}
