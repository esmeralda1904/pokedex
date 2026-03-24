<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from '../services/api'

const teams = ref([])
const error = ref('')
const ok = ref('')
const imageByName = reactive({})

const createForm = reactive({
  name: '',
  pokemonNames: '',
})

const parsePokemons = (raw) =>
  raw
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6)
    .map((name) => ({
      pokemonId: 0,
      pokemonName: name,
      nickname: '',
      role: '',
    }))

const load = async () => {
  error.value = ''
  teams.value = await api.listTeams()

  const uniqueNames = [...new Set(teams.value.flatMap((team) => team.pokemons.map((p) => p.pokemonName)))]

  await Promise.all(
    uniqueNames.map(async (name) => {
      if (imageByName[name]) {
        return
      }

      try {
        const detail = await api.getPokemonDetail(name)
        imageByName[name] = detail.image
      } catch (err) {
        imageByName[name] = ''
      }
    })
  )
}

const createTeam = async () => {
  error.value = ''
  ok.value = ''
  try {
    await api.createTeam({
      name: createForm.name,
      pokemons: parsePokemons(createForm.pokemonNames),
    })
    ok.value = 'Equipo creado'
    createForm.name = ''
    createForm.pokemonNames = ''
    await load()
  } catch (err) {
    error.value = err.message
  }
}

const remove = async (id) => {
  error.value = ''
  try {
    await api.deleteTeam(id)
    ok.value = 'Equipo eliminado'
    await load()
  } catch (err) {
    error.value = err.message
  }
}

onMounted(load)
</script>

<template>
  <section class="card" style="margin-bottom: 1rem">
    <h2>Equipos</h2>
    <form @submit.prevent="createTeam">
      <input v-model="createForm.name" placeholder="Nombre del equipo" required />
      <input
        v-model="createForm.pokemonNames"
        placeholder="Pokémon separados por coma (máx 6): pikachu, charizard"
        required
      />
      <button>Crear equipo</button>
    </form>
    <p class="error" v-if="error">{{ error }}</p>
    <p class="ok" v-if="ok">{{ ok }}</p>
  </section>

  <section class="grid grid-2">
    <article class="card" v-for="team in teams" :key="team._id">
      <h3>{{ team.name }}</h3>
      <p class="muted">Pokémon del equipo</p>
      <ul>
        <li v-for="pokemon in team.pokemons" :key="`${team._id}-${pokemon.pokemonName}`">
          <div class="team-pokemon-row">
            <img
              v-if="imageByName[pokemon.pokemonName]"
              class="team-pokemon-image"
              :src="imageByName[pokemon.pokemonName]"
              :alt="pokemon.pokemonName"
            />
            <span style="text-transform: capitalize">{{ pokemon.pokemonName }}</span>
          </div>
        </li>
      </ul>
      <button class="danger" @click="remove(team._id)">Eliminar</button>
    </article>
  </section>
</template>
