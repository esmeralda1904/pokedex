<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api } from '../services/api'

const teams = ref([])
const favorites = ref([])
const selectedFavoriteIds = ref([])
const error = ref('')
const ok = ref('')
const imageByName = reactive({})
const movesByName = reactive({})
const movesLoadingByName = reactive({})
const selectedMovesByFavoriteId = reactive({})
const editOpenByTeamId = reactive({})
const editedMovesByTeamId = reactive({})
const savingMovesByTeamId = reactive({})
const maxTeamSize = 6
const maxMovesPerPokemon = 4
const favoritesPage = ref(1)
const favoritesPageSize = 5

const createForm = reactive({
  name: '',
})

const spriteUrlById = (pokemonId) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`

const totalFavoritesPages = computed(() => Math.max(1, Math.ceil(favorites.value.length / favoritesPageSize)))

const selectedFavorites = computed(() =>
  favorites.value.filter((item) => selectedFavoriteIds.value.includes(item._id)).slice(0, maxTeamSize)
)

const paginatedFavorites = computed(() => {
  const start = (favoritesPage.value - 1) * favoritesPageSize
  return favorites.value.slice(start, start + favoritesPageSize)
})

const previousFavoritesPage = () => {
  if (favoritesPage.value > 1) {
    favoritesPage.value -= 1
  }
}

const nextFavoritesPage = () => {
  if (favoritesPage.value < totalFavoritesPages.value) {
    favoritesPage.value += 1
  }
}

const loadMovesForPokemon = async (pokemonName) => {
  if (movesByName[pokemonName] || movesLoadingByName[pokemonName]) {
    return
  }

  movesLoadingByName[pokemonName] = true

  try {
    const detail = await api.getPokemonDetail(pokemonName)
    movesByName[pokemonName] = detail.attacks || []
  } catch (err) {
    movesByName[pokemonName] = []
  } finally {
    movesLoadingByName[pokemonName] = false
  }
}

const teamPokemonKey = (pokemon, index) => `${pokemon.pokemonName}-${pokemon.pokemonId || 0}-${index}`

const initTeamEditor = async (team) => {
  if (!editedMovesByTeamId[team._id]) {
    editedMovesByTeamId[team._id] = {}
  }

  await Promise.all(
    team.pokemons.map(async (pokemon, index) => {
      const key = teamPokemonKey(pokemon, index)

      if (!Array.isArray(editedMovesByTeamId[team._id][key])) {
        editedMovesByTeamId[team._id][key] = (pokemon.moves || []).slice(0, maxMovesPerPokemon)
      }

      await loadMovesForPokemon(pokemon.pokemonName)
    })
  )
}

const toggleTeamEditor = async (team) => {
  const isOpen = Boolean(editOpenByTeamId[team._id])
  editOpenByTeamId[team._id] = !isOpen

  if (!isOpen) {
    await initTeamEditor(team)
  }
}

const saveTeamMoves = async (team) => {
  error.value = ''
  ok.value = ''
  savingMovesByTeamId[team._id] = true

  try {
    const pokemons = team.pokemons.map((pokemon, index) => {
      const key = teamPokemonKey(pokemon, index)
      return {
        ...pokemon,
        moves: (editedMovesByTeamId[team._id]?.[key] || []).slice(0, maxMovesPerPokemon),
      }
    })

    await api.updateTeam(team._id, { pokemons })
    ok.value = 'Movimientos actualizados'
    await load()
    editOpenByTeamId[team._id] = false
  } catch (err) {
    error.value = err.message
  } finally {
    savingMovesByTeamId[team._id] = false
  }
}

const initSelectedMoves = (favoriteId) => {
  if (!selectedMovesByFavoriteId[favoriteId]) {
    selectedMovesByFavoriteId[favoriteId] = []
  }
}

const load = async () => {
  error.value = ''
  const [teamData, favoriteData] = await Promise.all([api.listTeams(), api.listFavorites()])
  teams.value = teamData
  favorites.value = favoriteData
  favoritesPage.value = 1

  favorites.value.forEach((item) => {
    initSelectedMoves(item._id)
  })

  const uniqueNames = [
    ...new Set([
      ...teams.value.flatMap((team) => team.pokemons.map((p) => p.pokemonName)),
      ...favorites.value.filter((item) => !item.pokemonId).map((item) => item.pokemonName),
    ]),
  ]

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

  if (selectedFavorites.value.length === 0) {
    error.value = 'Selecciona al menos 1 favorito para crear el equipo'
    return
  }

  try {
    await api.createTeam({
      name: createForm.name,
      pokemons: selectedFavorites.value.map((item) => ({
        pokemonId: item.pokemonId || 0,
        pokemonName: item.pokemonName,
        nickname: (item.nickname || '').trim() || item.pokemonName,
        moves: (selectedMovesByFavoriteId[item._id] || []).slice(0, maxMovesPerPokemon),
        role: '',
      })),
    })
    ok.value = 'Equipo creado'
    createForm.name = ''
    selectedFavoriteIds.value = []
    Object.keys(selectedMovesByFavoriteId).forEach((id) => {
      selectedMovesByFavoriteId[id] = []
    })
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

watch(
  selectedFavoriteIds,
  async () => {
    await Promise.all(
      selectedFavorites.value.map(async (item) => {
        initSelectedMoves(item._id)
        await loadMovesForPokemon(item.pokemonName)
      })
    )
  },
  { deep: true }
)

onMounted(load)
</script>

<template>
  <div class="view-stack">
    <section class="card">
      <h2>Equipos</h2>
      <form @submit.prevent="createTeam">
      <input v-model="createForm.name" placeholder="Nombre del equipo" required />

      <details style="margin: 0.6rem 0 0.8rem">
        <summary style="cursor: pointer; font-weight: 600">Favoritos</summary>
        <p class="muted" style="margin: 0.6rem 0 0.4rem">Selecciona favoritos (máx {{ maxTeamSize }})</p>

        <div class="grid" style="margin-bottom: 0.8rem">
          <label
            class="inline"
            v-for="item in paginatedFavorites"
            :key="item._id"
            style="display: flex; align-items: center; gap: 0.5rem"
          >
            <input
              type="checkbox"
              :value="item._id"
              v-model="selectedFavoriteIds"
              :disabled="!selectedFavoriteIds.includes(item._id) && selectedFavoriteIds.length >= maxTeamSize"
            />
            <img
              v-if="item.pokemonId > 0"
              class="team-pokemon-image"
              :src="spriteUrlById(item.pokemonId)"
              :alt="item.pokemonName"
            />
            <img
              v-else-if="imageByName[item.pokemonName]"
              class="team-pokemon-image"
              :src="imageByName[item.pokemonName]"
              :alt="item.pokemonName"
            />
            <span style="text-transform: capitalize">{{ item.pokemonName }}</span>
          </label>
        </div>

        <div class="inline" v-if="favorites.length > favoritesPageSize" style="justify-content: space-between; margin-bottom: 0.6rem">
          <button type="button" class="secondary" @click="previousFavoritesPage" :disabled="favoritesPage === 1">
            Anterior
          </button>
          <span class="muted">Página {{ favoritesPage }} de {{ totalFavoritesPages }}</span>
          <button
            type="button"
            class="secondary"
            @click="nextFavoritesPage"
            :disabled="favoritesPage === totalFavoritesPages"
          >
            Siguiente
          </button>
        </div>
      </details>

      <p class="muted" v-if="favorites.length === 0" style="margin: 0 0 0.8rem">
        No tienes favoritos todavía. Agrega favoritos para crear equipos desde esta lista.
      </p>

        <button>Crear equipo</button>
      </form>

      <section v-if="selectedFavorites.length > 0" class="view-stack">
        <h3>Seleccionar movimientos</h3>
        <p class="muted">Elige hasta {{ maxMovesPerPokemon }} movimientos por Pokémon.</p>

      <article class="card" v-for="item in selectedFavorites" :key="`moves-${item._id}`">
        <h4 style="margin-bottom: 0.5rem; text-transform: capitalize">{{ item.nickname || item.pokemonName }}</h4>

        <p class="muted" v-if="movesLoadingByName[item.pokemonName]">Cargando movimientos...</p>

        <div class="grid grid-2" v-else>
          <label
            class="inline"
            v-for="move in movesByName[item.pokemonName] || []"
            :key="`${item._id}-${move}`"
            style="display: flex; align-items: center; gap: 0.5rem"
          >
            <input
              type="checkbox"
              :value="move"
              v-model="selectedMovesByFavoriteId[item._id]"
              :disabled="
                !selectedMovesByFavoriteId[item._id]?.includes(move) &&
                (selectedMovesByFavoriteId[item._id]?.length || 0) >= maxMovesPerPokemon
              "
            />
            <span style="text-transform: capitalize">{{ move }}</span>
          </label>
        </div>

        <p class="muted" v-if="(movesByName[item.pokemonName] || []).length === 0 && !movesLoadingByName[item.pokemonName]">
          No se encontraron movimientos para este Pokémon.
        </p>
      </article>
      </section>

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
            <div>
              <span style="text-transform: capitalize; display: block">{{ pokemon.nickname || pokemon.pokemonName }}</span>
              <small class="muted" v-if="pokemon.moves?.length">Movs: {{ pokemon.moves.join(', ') }}</small>
            </div>
          </div>
        </li>
      </ul>
      <button class="secondary" type="button" @click="toggleTeamEditor(team)">
        {{ editOpenByTeamId[team._id] ? 'Cerrar edición de movimientos' : 'Editar movimientos' }}
      </button>

      <section v-if="editOpenByTeamId[team._id]" class="view-stack">
        <p class="muted">Elige hasta {{ maxMovesPerPokemon }} movimientos por Pokémon.</p>

        <article class="card" v-for="(pokemon, index) in team.pokemons" :key="`team-edit-${team._id}-${index}`">
          <h4 style="text-transform: capitalize; margin-bottom: 0.5rem">{{ pokemon.nickname || pokemon.pokemonName }}</h4>
          <p class="muted" v-if="movesLoadingByName[pokemon.pokemonName]">Cargando movimientos...</p>

          <div class="grid grid-2" v-else>
            <label
              class="inline"
              v-for="move in movesByName[pokemon.pokemonName] || []"
              :key="`team-move-${team._id}-${index}-${move}`"
              style="display: flex; align-items: center; gap: 0.5rem"
            >
              <input
                type="checkbox"
                :value="move"
                v-model="editedMovesByTeamId[team._id][teamPokemonKey(pokemon, index)]"
                :disabled="
                  !editedMovesByTeamId[team._id][teamPokemonKey(pokemon, index)]?.includes(move) &&
                  (editedMovesByTeamId[team._id][teamPokemonKey(pokemon, index)]?.length || 0) >= maxMovesPerPokemon
                "
              />
              <span style="text-transform: capitalize">{{ move }}</span>
            </label>
          </div>
        </article>

        <button
          type="button"
          class="secondary"
          @click="saveTeamMoves(team)"
          :disabled="savingMovesByTeamId[team._id]"
        >
          {{ savingMovesByTeamId[team._id] ? 'Guardando...' : 'Guardar movimientos' }}
        </button>
      </section>

      <button class="danger" @click="remove(team._id)">Eliminar</button>
      </article>
    </section>
  </div>
</template>
