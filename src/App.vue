<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authState, logout } from './stores/auth'

const router = useRouter()
const isAuth = computed(() => Boolean(authState.token))
const syncBanner = ref('')
let syncBannerTimeout = null

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

}

onMounted(() => {
  window.addEventListener('offline-request-queued', handleQueuedNotice)
  navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('offline-request-queued', handleQueuedNotice)
  navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage)

  if (syncBannerTimeout) {
    window.clearTimeout(syncBannerTimeout)
  }
})
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
  background: var(--green-soft);
  color: #0b6b31;
  font-weight: 600;
}
</style>
