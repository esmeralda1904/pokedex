<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../services/api'

const route = useRoute()
const pokemon = ref(null)
const error = ref('')
const loading = ref(false)

const statMap = {
  hp: 'PS',
  attack: 'Ataque',
  defense: 'Defensa',
  'special-attack': 'Ataque especial',
  'special-defense': 'Defensa especial',
  speed: 'Velocidad',
}

const typeMap = {
  normal: 'normal',
  fire: 'fuego',
  water: 'agua',
  electric: 'eléctrico',
  grass: 'planta',
  ice: 'hielo',
  fighting: 'lucha',
  poison: 'veneno',
  ground: 'tierra',
  flying: 'volador',
  psychic: 'psíquico',
  bug: 'bicho',
  rock: 'roca',
  ghost: 'fantasma',
  dragon: 'dragón',
  dark: 'siniestro',
  steel: 'acero',
  fairy: 'hada',
}

const statInSpanish = (value) => statMap[value] || value
const typeInSpanish = (value) => typeMap[value] || value

const typeColorMap = {
  normal: '#cfd3d8',
  fire: '#ffb088',
  water: '#8ecbff',
  electric: '#ffe27b',
  grass: '#99e7a0',
  ice: '#a5eef4',
  fighting: '#f5a6a6',
  poison: '#d2a2f9',
  ground: '#e8cf9f',
  flying: '#b7c8ff',
  psychic: '#ff9ec1',
  bug: '#c7e86f',
  rock: '#d4c093',
  ghost: '#b4a8e8',
  dragon: '#9cb0ff',
  dark: '#b7a89c',
  steel: '#c6d2dd',
  fairy: '#ffc2e5',
}

const typeStyle = (type) => ({
  backgroundColor: typeColorMap[type] || '#dbeafe',
})

const statPercent = (value) => Math.min(100, Math.max(6, Math.round((value / 180) * 100)))

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    pokemon.value = await api.getPokemonDetail(route.params.idOrName)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <p v-if="loading">Cargando detalle...</p>
  <p class="error" v-if="error">{{ error }}</p>

  <section class="card detail-shell" v-if="pokemon">
    <div class="detail-header">
      <h2 class="detail-title">{{ pokemon.name }} <span>#{{ pokemon.id }}</span></h2>
      <div class="type-chips">
        <span
          class="type-chip"
          v-for="type in pokemon.types"
          :key="type"
          :style="typeStyle(type)"
        >
          {{ typeInSpanish(type) }}
        </span>
      </div>
    </div>

    <img class="pokemon-img detail-image" :src="pokemon.image" :alt="pokemon.name" />

    <div class="detail-grid">
      <article class="detail-card">
        <h3>Especie</h3>
        <p>{{ pokemon.species }}</p>
      </article>

      <article class="detail-card">
        <h3>Línea evolutiva</h3>
        <p class="evo-line">{{ pokemon.evolutionLine.join(' → ') }}</p>
      </article>
    </div>

    <article class="detail-card">
      <h3>Estadísticas</h3>
      <ul class="stats-list">
        <li v-for="stat in pokemon.stats" :key="stat.name">
          <div class="stat-label-row">
            <span>{{ statInSpanish(stat.name) }}</span>
            <strong>{{ stat.value }}</strong>
          </div>
          <div class="stat-track">
            <div class="stat-fill" :style="{ width: `${statPercent(stat.value)}%` }"></div>
          </div>
        </li>
      </ul>
    </article>

    <article class="detail-card">
      <h3>Ataques</h3>
      <div class="moves-wrap">
        <span class="move-pill" v-for="move in pokemon.attacks" :key="move">{{ move }}</span>
      </div>
    </article>
  </section>
</template>

<style scoped>
.detail-shell {
  border-color: #82d6ff;
  background: linear-gradient(180deg, #ffffff 0%, #f5fcff 100%);
}

.detail-header {
  display: grid;
  gap: 0.7rem;
  margin-bottom: 0.7rem;
}

.detail-title {
  text-transform: capitalize;
  margin: 0;
}

.detail-title span {
  color: #5b6d86;
  font-size: 0.9em;
}

.detail-image {
  max-width: 220px;
  margin-bottom: 1rem;
}

.type-chips {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.type-chip {
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.82rem;
  text-transform: capitalize;
  color: #22324a;
}

.detail-grid {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
}

.detail-card {
  background: #f8fcff;
  border: 1px solid #bee9ff;
  border-radius: 12px;
  padding: 0.8rem;
}

.detail-card h3 {
  margin: 0 0 0.55rem;
}

.evo-line {
  text-transform: capitalize;
}

.stats-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}

.stat-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.92rem;
}

.stat-track {
  width: 100%;
  height: 8px;
  background: #e7f2ff;
  border-radius: 999px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  background: linear-gradient(90deg, #59d4ff 0%, #7f8dff 100%);
  border-radius: 999px;
}

.moves-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.move-pill {
  background: #e7ecff;
  color: #3646a8;
  border: 1px solid #ccd6ff;
  border-radius: 999px;
  padding: 0.28rem 0.6rem;
  font-size: 0.84rem;
  text-transform: capitalize;
}
</style>
