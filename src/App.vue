<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authState, logout } from './stores/auth'
import { api } from './services/api'

const router = useRouter()
const isAuth = computed(() => Boolean(authState.token))
const syncBanner = ref('')
let syncBannerTimeout = null
let notificationPromptInFlight = false

const closeSession = () => {
  logout()
  router.push('/login')
}

const showSyncBanner = (message, timeout = 4000) => {
  syncBanner.value = message

  if (syncBannerTimeout) {
    window.clearTimeout(syncBannerTimeout)
  }

  syncBannerTimeout = window.setTimeout(() => {
    syncBanner.value = ''
    syncBannerTimeout = null
  }, timeout)
}

const handleQueuedNotice = () => {
  showSyncBanner('Sin internet: tu acción quedó pendiente y se enviará automáticamente.', 5000)
}

const handleServiceWorkerMessage = (event) => {
  const message = event.data

  if (message?.type === 'SYNC_QUEUED') {
    showSyncBanner('Sin internet: tu acción quedó pendiente y se enviará automáticamente.', 5000)
  }

  if (message?.type === 'SYNC_COMPLETED') {
    showSyncBanner(`Sincronización completada: ${message.syncedCount} petición(es) enviadas.`)
  }

  if (message?.type === 'PUSH_RECEIVED') {
    const pushPayload = message.payload || {}
    showSyncBanner(pushPayload.body || 'Tienes una nueva notificación.', 4500)
  }

}

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

const isPwaStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone === true

const requestNotificationPermissionOnEntry = async () => {
  if (!("Notification" in window)) {
    return
  }

  if (Notification.permission !== 'default') {
    return
  }

  if (notificationPromptInFlight) {
    return
  }

  notificationPromptInFlight = true

  showSyncBanner('Acepta que le llegue notificaciones', isPwaStandalone() ? 9000 : 7000)

  try {
    const permission = await Notification.requestPermission()

    if (permission === 'granted' && authState.token) {
      await setupPushSubscription()
    }
  } catch (error) {
    console.log('[App] Notification permission request failed:', error)
  } finally {
    notificationPromptInFlight = false
  }
}

const handleAppVisible = () => {
  if (document.visibilityState === 'visible') {
    requestNotificationPermissionOnEntry()
  }
}

const setupPushSubscription = async () => {
  try {
    if (!authState.token || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return
    }

    const existingRegistration = await navigator.serviceWorker.getRegistration()
    if (!existingRegistration) {
      return
    }

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      const permission = Notification.permission

      if (permission !== 'granted') {
        return
      }

      const keyResponse = await api.getVapidPublicKey().catch(() => null)
      const vapidPublicKey = keyResponse?.publicKey || import.meta.env.VITE_VAPID_PUBLIC_KEY

      if (!vapidPublicKey) {
        return
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
    }

    await api.subscribePush(subscription.toJSON())
  } catch (error) {
    console.log('[App] Push subscription setup failed:', error)
  }

}

onMounted(() => {
  window.addEventListener('offline-request-queued', handleQueuedNotice)
  window.addEventListener('pageshow', requestNotificationPermissionOnEntry)
  document.addEventListener('visibilitychange', handleAppVisible)
  navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage)
  requestNotificationPermissionOnEntry()
  setupPushSubscription()
})

onBeforeUnmount(() => {
  window.removeEventListener('offline-request-queued', handleQueuedNotice)
  window.removeEventListener('pageshow', requestNotificationPermissionOnEntry)
  document.removeEventListener('visibilitychange', handleAppVisible)
  navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage)

  if (syncBannerTimeout) {
    window.clearTimeout(syncBannerTimeout)
  }
})

watch(
  () => authState.token,
  (token) => {
    if (token) {
      setupPushSubscription()
    }
  }
)
</script>

<template>
  <div class="layout">
    <header class="topbar">
      <h1>Cubopoke</h1>
      <nav>
        <RouterLink v-if="isAuth" to="/">Inicio</RouterLink>
        <RouterLink v-if="isAuth" to="/favorites">Favoritos</RouterLink>
        <RouterLink v-if="isAuth" to="/teams">Equipos</RouterLink>
        <RouterLink v-if="isAuth" to="/friends">Amigos</RouterLink>
        <RouterLink v-if="isAuth" to="/battles">Batallas</RouterLink>
        <RouterLink v-if="!isAuth" to="/login">Login</RouterLink>
        <RouterLink v-if="!isAuth" to="/register">Registro</RouterLink>
      </nav>
      <button v-if="isAuth" class="danger logout-btn" @click="closeSession">Cerrar sesión</button>
    </header>

    <main class="container">
      <section v-if="syncBanner" class="card sync-banner" role="status" aria-live="polite">
        {{ syncBanner }}
      </section>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.sync-banner {
  margin-bottom: 0.9rem;
  border-left: 5px solid var(--blue-main);
  background: #eaf6ff;
  color: #0b3f6b;
  font-weight: 600;
}
</style>
