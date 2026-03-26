<script setup>
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../services/api'
import { authState } from '../stores/auth'

const filters = reactive({
  name: '',
  type1: '',
  type2: '',
  region: '',
})

const pokemonTypes = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark',
  'steel', 'fairy',
]

const pokemonRegions = [
  'kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea',
]

const state = reactive({
  items: [],
  total: 0,
  offset: 0,
  limit: 24,
  loading: false,
  error: '',
})

const savingId = ref(null)
const favoriteIdByName = ref({})

const rangeStart = () => (state.items.length ? state.offset + 1 : 0)
const rangeEnd = () => (state.items.length ? state.offset + state.items.length : 0)

const loadFavorites = async () => {
  const list = await api.listFavorites()
  favoriteIdByName.value = list.reduce((acc, item) => {
    acc[item.pokemonName] = item._id
    return acc
  }, {})
}

const isFavorite = (pokemonName) => Boolean(favoriteIdByName.value[pokemonName])

const pokemonId = (pokemon) => {
  if (pokemon?.id) {
    return Number(pokemon.id) || 0
  }

  return Number((pokemon.url.match(/\/(\d+)\/?$/) || [])[1]) || 0
}

const pokemonImage = (pokemon) => {
  if (pokemon?.image) {
    return pokemon.image
  }

  const id = pokemonId(pokemon)
  if (!id) {
    return ''
  }

  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
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

const toggleFavorite = async (pokemon) => {
  savingId.value = pokemon.name
  try {
    if (isFavorite(pokemon.name)) {
      const favoriteId = favoriteIdByName.value[pokemon.name]
      await api.deleteFavorite(favoriteId)
    } else {
      await api.createFavorite({
        pokemonId: pokemonId(pokemon),
        pokemonName: pokemon.name,
      })
    }

    await loadFavorites()
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

const clearFilters = async () => {
  filters.name = ''
  filters.type1 = ''
  filters.type2 = ''
  filters.region = ''
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
  <div class="view-stack">
    <section class="card explore-panel">
      <h2 class="explore-title">Explorar Pokémon</h2>
      <p class="muted explore-subtitle">Tu código de amigo: <strong>{{ authState.user?.friendCode }}</strong></p>

      <div class="form-row">
        <input v-model="filters.name" placeholder="Buscar solo por nombre" />
        <select v-model="filters.type1">
          <option value="">Tipo 1</option>
          <option v-for="type in pokemonTypes" :key="`type1-${type}`" :value="type">
            {{ type }}
          </option>
        </select>
        <select v-model="filters.type2">
          <option value="">Tipo 2</option>
          <option v-for="type in pokemonTypes" :key="`type2-${type}`" :value="type">
            {{ type }}
          </option>
        </select>
        <select v-model="filters.region">
          <option value="">Región</option>
          <option v-for="region in pokemonRegions" :key="`region-${region}`" :value="region">
            {{ region }}
          </option>
        </select>
        <button @click="applyFilters">Buscar</button>
        <button class="secondary" @click="clearFilters">Limpiar</button>
      </div>
      <p class="error" v-if="state.error">{{ state.error }}</p>
    </section>

    <section class="grid grid-3 pokemon-grid">
      <article class="card pokemon-card" v-for="pokemon in state.items" :key="pokemon.name">
        <h3 style="text-transform: capitalize">{{ pokemon.name }}</h3>
        <p class="muted" v-if="pokemonId(pokemon)">ID: #{{ pokemonId(pokemon) }}</p>
        <img
          v-if="pokemonImage(pokemon)"
          class="list-pokemon-image"
          :src="pokemonImage(pokemon)"
          :alt="pokemon.name"
        />
        <div class="pokemon-actions">
          <RouterLink class="detail-link" :to="`/pokemon/${pokemon.name}`">Ver detalles</RouterLink>
          <button
            class="star-btn"
            :class="{ active: isFavorite(pokemon.name) }"
            @click="toggleFavorite(pokemon)"
            :disabled="savingId === pokemon.name"
            :title="isFavorite(pokemon.name) ? 'Quitar de favoritos' : 'Agregar a favoritos'"
          >
            {{ savingId === pokemon.name ? '…' : '★' }}
          </button>
        </div>
      </article>
    </section>

    <section class="pagination-row">
      <button class="secondary" @click="prevPage" :disabled="state.offset === 0">Anterior</button>
      <button class="secondary" @click="nextPage" :disabled="state.offset + state.limit >= state.total">
        Siguiente
      </button>
      <span class="muted">Mostrando {{ rangeStart() }} - {{ rangeEnd() }} de {{ state.total }}</span>
    </section>

    <p v-if="state.loading">Cargando...</p>
  </div>
</template>

<style scoped>
.explore-panel {
  position: relative;
  overflow: hidden;
  border-color: #7fd9f8;
  background:
    radial-gradient(circle at 8% 0%, rgba(18, 194, 233, 0.2), transparent 40%),
    radial-gradient(circle at 90% 95%, rgba(9, 210, 184, 0.14), transparent 35%),
    var(--white);
}

.explore-title {
  margin-bottom: 0.25rem;
  letter-spacing: 0.2px;
}

.explore-subtitle {
  margin-bottom: 0.95rem;
}

.pokemon-card {
  position: relative;
  text-align: center;
  padding-bottom: 3.2rem;
  transition: transform 180ms ease, box-shadow 220ms ease;
}

.pokemon-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 28px rgba(13, 110, 253, 0.12);
}

.pokemon-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.detail-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0.5rem 0.9rem;
  border-radius: 999px;
  border: 1px solid #8ecff3;
  background: #eef8ff;
  color: #0b4fc0;
  font-weight: 600;
  text-decoration: none;
  transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
  animation: detail-fade-in 300ms ease;
}

.detail-link:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 14px rgba(13, 110, 253, 0.16);
  background: #e4f3ff;
}

.star-btn {
  position: absolute;
  right: 0.9rem;
  bottom: 0.85rem;
  width: 46px;
  height: 46px;
  font-size: 1.35rem;
  box-shadow: 0 8px 16px rgba(13, 110, 253, 0.12);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.star-btn:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 12px 18px rgba(13, 110, 253, 0.18);
}

.star-btn.active {
  animation: favorite-pop 0.35s ease-out, star-glow 0.45s ease-out;
}

@keyframes detail-fade-in {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes star-glow {
  0% {
    box-shadow: 0 0 0 rgba(122, 75, 194, 0.25);
  }
  60% {
    box-shadow: 0 0 0 8px rgba(122, 75, 194, 0);
  }
  100% {
    box-shadow: 0 0 0 rgba(122, 75, 194, 0);
  }
}

@media (max-width: 640px) {
  .pokemon-card {
    padding-bottom: 3.4rem;
  }

  .detail-link {
    font-size: 0.88rem;
    padding: 0.45rem 0.8rem;
  }

  .star-btn {
    width: 44px;
    height: 44px;
  }
}
</style>
