<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../services/api'

const friends = ref([])
const friendCode = ref('')
const error = ref('')
const ok = ref('')

const load = async () => {
  error.value = ''
  friends.value = await api.listFriends()
}

const addFriend = async () => {
  error.value = ''
  ok.value = ''
  try {
    await api.addFriend({ friendCode: friendCode.value })
    ok.value = 'Amiga agregada'
    friendCode.value = ''
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
      <button>Agregar</button>
    </form>
    <p class="error" v-if="error">{{ error }}</p>
    <p class="ok" v-if="ok">{{ ok }}</p>
  </section>

  <section class="grid grid-2">
    <article class="card" v-for="friend in friends" :key="friend._id">
      <h3>{{ friend.email }}</h3>
      <p>Código: {{ friend.friendCode }}</p>
      <p class="muted">ID: {{ friend._id }}</p>
    </article>
  </section>
</template>
