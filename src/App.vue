<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { authState, logout } from './stores/auth'

const router = useRouter()
const isAuth = computed(() => Boolean(authState.token))

const closeSession = () => {
  logout()
  router.push('/login')
}
</script>

<template>
  <div class="layout">
    <header class="topbar">
      <h1>Pokédex Fullstack</h1>
      <nav>
        <RouterLink v-if="isAuth" to="/">Inicio</RouterLink>
        <RouterLink v-if="isAuth" to="/favorites">Favoritos</RouterLink>
        <RouterLink v-if="isAuth" to="/teams">Equipos</RouterLink>
        <RouterLink v-if="isAuth" to="/friends">Amigos</RouterLink>
        <RouterLink v-if="isAuth" to="/battles">Batallas</RouterLink>
        <RouterLink v-if="!isAuth" to="/login">Login</RouterLink>
        <RouterLink v-if="!isAuth" to="/register">Registro</RouterLink>
      </nav>
      <button v-if="isAuth" class="danger" @click="closeSession">Cerrar sesión</button>
    </header>

    <main class="container">
      <RouterView />
    </main>
  </div>
</template>
