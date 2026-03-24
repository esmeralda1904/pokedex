import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles.css'

const app = createApp(App)

app.use(router)

app.mount('#app')

if ('serviceWorker' in navigator) {
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

if ('serviceWorker' in navigator) {
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
