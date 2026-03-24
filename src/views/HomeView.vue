<script setup>
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../services/api'
import { authState } from '../stores/auth'

const filters = reactive({
  name: '',
})

const state = reactive({
  items: [],
  total: 0,
  offset: 0,
  limit: 24,
  loading: false,
  error: '',
})

const savingId = ref(null)
const favoriteNames = ref([])

const rangeStart = () => (state.items.length ? state.offset + 1 : 0)
const rangeEnd = () => (state.items.length ? state.offset + state.items.length : 0)

const loadFavorites = async () => {
  const list = await api.listFavorites()
  favoriteNames.value = list.map((item) => item.pokemonName)
}

const isFavorite = (pokemonName) => favoriteNames.value.includes(pokemonName)

const pokemonImage = (pokemon) => {
  const pokemonId = Number((pokemon.url.match(/\/(\d+)\/?$/) || [])[1]) || 0
  if (!pokemonId) {
    return ''
  }

  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`
}

const loadPokemon = async () => {
  state.loading = true
  state.error = ''
  try {
    const data = await api.listPokemon({ ...filters, limit: state.limit, offset: state.offset })
    state.items = data.items
    state.total = data.total
  } catch (err) {
    state.error = err.message
  } finally {
    state.loading = false
  }
}

const addFavorite = async (pokemon) => {
  if (isFavorite(pokemon.name)) {
    return
  }

  savingId.value = pokemon.name
  try {
    await api.createFavorite({
      pokemonId: Number((pokemon.url.match(/\/(\d+)\/?$/) || [])[1]) || 0,
      pokemonName: pokemon.name,
    })
    favoriteNames.value = [...favoriteNames.value, pokemon.name]
  } catch (err) {
    state.error = err.message
  } finally {
    savingId.value = null
  }
}

const applyFilters = async () => {
  state.offset = 0
  await loadPokemon()
}

const nextPage = async () => {
  state.offset += state.limit
  await loadPokemon()
}

const prevPage = async () => {
  state.offset = Math.max(0, state.offset - state.limit)
  await loadPokemon()
}

onMounted(async () => {
  await Promise.all([loadPokemon(), loadFavorites()])
})
</script>

<template>
  <section class="card" style="margin-bottom: 1rem">
    <h2>Explorar Pokémon</h2>
    <p class="muted">Tu código de amiga: <strong>{{ authState.user?.friendCode }}</strong></p>

    <div class="inline" style="margin-top: 1rem">
      <input v-model="filters.name" placeholder="Buscar solo por nombre" />
      <button @click="applyFilters">Buscar</button>
    </div>
    <p class="error" v-if="state.error">{{ state.error }}</p>
  </section>

  <section class="grid grid-3">
    <article class="card" v-for="pokemon in state.items" :key="pokemon.name">
      <h3 style="text-transform: capitalize">{{ pokemon.name }}</h3>
      <img
        v-if="pokemonImage(pokemon)"
        class="list-pokemon-image"
        :src="pokemonImage(pokemon)"
        :alt="pokemon.name"
      />
      <div class="inline">
        <RouterLink :to="`/pokemon/${pokemon.name}`">Ver detalles</RouterLink>
        <button
          class="star-btn"
          :class="{ active: isFavorite(pokemon.name) }"
          @click="addFavorite(pokemon)"
          :disabled="savingId === pokemon.name"
          :title="isFavorite(pokemon.name) ? 'Ya está en favoritos' : 'Agregar a favoritos'"
        >
          {{ savingId === pokemon.name ? '…' : '★' }}
        </button>
      </div>
    </article>
  </section>

  <section class="inline" style="margin-top: 1rem">
    <button class="secondary" @click="prevPage" :disabled="state.offset === 0">Anterior</button>
    <button class="secondary" @click="nextPage" :disabled="state.offset + state.limit >= state.total">
      Siguiente
    </button>
    <span class="muted">Mostrando {{ rangeStart() }} - {{ rangeEnd() }} de {{ state.total }}</span>
  </section>

  <p v-if="state.loading">Cargando...</p>
</template>
