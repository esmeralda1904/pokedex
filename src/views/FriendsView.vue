<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { api } from '../services/api'

const friends = ref([])
const incomingRequests = ref([])
const outgoingRequests = ref([])
const friendCode = ref('')
const error = ref('')
const ok = ref('')
let refreshInterval = null

const load = async () => {
  error.value = ''
  const response = await api.listFriends()

  if (Array.isArray(response)) {
    friends.value = response
    incomingRequests.value = []
    outgoingRequests.value = []
    return
  }

  friends.value = response.friends || []
  incomingRequests.value = response.incomingRequests || []
  outgoingRequests.value = response.outgoingRequests || []
}

const addFriend = async () => {
  error.value = ''
  ok.value = ''
  try {
    const response = await api.addFriend({ friendCode: friendCode.value })
    ok.value = response.message || 'Solicitud enviada'
    friendCode.value = ''
    await load()
  } catch (err) {
    error.value = err.message
  }
}

const acceptRequest = async (requesterId) => {
  error.value = ''
  ok.value = ''

  try {
    const response = await api.acceptFriendRequest(requesterId)
    ok.value = response.message || 'Solicitud aceptada'
    await load()
  } catch (err) {
    error.value = err.message
  }
}

const rejectRequest = async (requesterId) => {
  error.value = ''
  ok.value = ''

  try {
    const response = await api.rejectFriendRequest(requesterId)
    ok.value = response.message || 'Solicitud eliminada'
    await load()
  } catch (err) {
    error.value = err.message
  }
}

const cancelOutgoingRequest = async (targetUserId) => {
  error.value = ''
  ok.value = ''

  try {
    const response = await api.rejectFriendRequest(targetUserId)
    ok.value = response.message || 'Solicitud cancelada'
    await load()
  } catch (err) {
    error.value = err.message
  }
}

const deleteFriend = async (friendId) => {
  error.value = ''
  ok.value = ''

  try {
    const response = await api.deleteFriend(friendId)
    ok.value = response.message || 'Amigo eliminado'
    await load()
  } catch (err) {
    error.value = err.message
  }
}

const handlePushRefresh = () => {
  load()
}

onMounted(() => {
  load()
  window.addEventListener('app-push-received', handlePushRefresh)
  refreshInterval = window.setInterval(load, 12000)
})

onBeforeUnmount(() => {
  window.removeEventListener('app-push-received', handlePushRefresh)

  if (refreshInterval) {
    window.clearInterval(refreshInterval)
    refreshInterval = null
  }
})
</script>

<template>
  <section class="card" style="margin-bottom: 1rem">
    <h2>Amigos</h2>
    <form @submit.prevent="addFriend">
      <input v-model="friendCode" placeholder="Código de amigo" required />
      <button>Enviar solicitud</button>
    </form>
    <p class="error" v-if="error">{{ error }}</p>
    <p class="ok" v-if="ok">{{ ok }}</p>
  </section>

  <section class="card" style="margin-bottom: 1rem" v-if="incomingRequests.length">
    <h2>Solicitudes recibidas</h2>
    <article class="card" v-for="request in incomingRequests" :key="request._id">
      <h3>{{ request.email }}</h3>
      <p>Código: {{ request.friendCode }}</p>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap">
        <button class="friend-action-btn" @click="acceptRequest(request._id)">Aceptar</button>
        <button class="danger friend-action-btn" @click="rejectRequest(request._id)">Eliminar</button>
      </div>
    </article>
  </section>

  <section class="card" style="margin-bottom: 1rem" v-if="outgoingRequests.length">
    <h2>Solicitudes enviadas</h2>
    <article class="card" v-for="request in outgoingRequests" :key="request._id">
      <h3>{{ request.email }}</h3>
      <p>Código: {{ request.friendCode }}</p>
      <p class="muted">Pendiente de aceptación</p>
      <button class="secondary friend-action-btn" @click="cancelOutgoingRequest(request._id)">
        Cancelar solicitud
      </button>
    </article>
  </section>

  <section class="grid grid-2">
    <article class="card" v-for="friend in friends" :key="friend._id">
      <h3>{{ friend.email }}</h3>
      <p>Código: {{ friend.friendCode }}</p>
      <p class="muted">ID: {{ friend._id }}</p>
      <p class="muted">Favoritos: {{ friend.favorites?.length || 0 }}</p>
      <p class="muted" v-if="friend.favorites?.length">
        {{ friend.favorites.slice(0, 5).map((fav) => `#${fav.pokemonId} ${fav.pokemonName}`).join(', ') }}
      </p>
      <button class="danger friend-action-btn" @click="deleteFriend(friend._id)">Eliminar amigo</button>
    </article>
  </section>
</template>

<style scoped>
@media (max-width: 640px) {
  .friend-action-btn {
    font-size: 0.82rem;
    padding: 0.4rem 0.6rem;
    min-height: 34px;
  }
}
</style>
