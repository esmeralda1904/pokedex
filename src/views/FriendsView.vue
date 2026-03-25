<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../services/api'

const friends = ref([])
const incomingRequests = ref([])
const outgoingRequests = ref([])
const friendCode = ref('')
const error = ref('')
const ok = ref('')

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

onMounted(load)
</script>

<template>
  <section class="card" style="margin-bottom: 1rem">
    <h2>Amigos</h2>
    <form @submit.prevent="addFriend">
      <input v-model="friendCode" placeholder="Código de amiga" required />
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
        <button @click="acceptRequest(request._id)">Aceptar</button>
        <button class="danger" @click="rejectRequest(request._id)">Eliminar</button>
      </div>
    </article>
  </section>

  <section class="card" style="margin-bottom: 1rem" v-if="outgoingRequests.length">
    <h2>Solicitudes enviadas</h2>
    <article class="card" v-for="request in outgoingRequests" :key="request._id">
      <h3>{{ request.email }}</h3>
      <p>Código: {{ request.friendCode }}</p>
      <p class="muted">Pendiente de aceptación</p>
    </article>
  </section>

  <section class="grid grid-2">
    <article class="card" v-for="friend in friends" :key="friend._id">
      <h3>{{ friend.email }}</h3>
      <p>Código: {{ friend.friendCode }}</p>
      <p class="muted">ID: {{ friend._id }}</p>
    </article>
  </section>
</template>
