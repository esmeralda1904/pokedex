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

  <section class="card" v-if="pokemon">
    <h2 style="text-transform: capitalize">{{ pokemon.name }} #{{ pokemon.id }}</h2>
    <img class="pokemon-img" :src="pokemon.image" :alt="pokemon.name" />
    <p><strong>Especie:</strong> {{ pokemon.species }}</p>
    <p><strong>Tipos:</strong> {{ pokemon.types.map(typeInSpanish).join(', ') }}</p>

    <h3>Estadísticas</h3>
    <ul>
      <li v-for="stat in pokemon.stats" :key="stat.name">{{ statInSpanish(stat.name) }}: {{ stat.value }}</li>
    </ul>

    <h3>Ataques</h3>
    <ul>
      <li v-for="move in pokemon.attacks" :key="move">{{ move }}</li>
    </ul>

    <h3>Línea evolutiva</h3>
    <p style="text-transform: capitalize">{{ pokemon.evolutionLine.join(' → ') }}</p>
  </section>
</template>
