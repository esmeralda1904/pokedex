<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../services/api'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const log = ref([])

const myTeam = ref(null)
const rivalTeam = ref(null)
const myActivePokemon = ref(null)
const rivalActivePokemon = ref(null)
const myPokemonData = ref(null)
const rivalPokemonData = ref(null)

const myCurrentHp = ref(0)
const rivalCurrentHp = ref(0)
const myMaxHp = ref(1)
const rivalMaxHp = ref(1)

const myMoves = ref([])
const movesUsed = ref(0)
const maxMoves = 4
const waitingRival = ref(false)
const battleFinished = ref(false)
const battleResult = ref('')

const normalizePokemonName = (name) => {
  if (!name) {
    return 'Pokémon'
  }

  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const getStatValue = (pokemonData, statName, fallback) => {
  const stat = pokemonData?.stats?.find((item) => item.stat?.name === statName)
  return stat?.base_stat || fallback
}

const toPercent = (current, max) => Math.max(0, Math.min(100, Math.round((current / max) * 100)))

const myHpPercent = computed(() => toPercent(myCurrentHp.value, myMaxHp.value))
const rivalHpPercent = computed(() => toPercent(rivalCurrentHp.value, rivalMaxHp.value))

const addLog = (message) => {
  log.value.unshift(`${new Date().toLocaleTimeString()} · ${message}`)
}

const calcDamage = ({ attackerData, defenderData, moveName }) => {
  const attack = getStatValue(attackerData, 'attack', 60)
  const defense = getStatValue(defenderData, 'defense', 60)
  const base = Math.max(8, Math.round((attack / Math.max(30, defense)) * 14))
  const randomBonus = Math.floor(Math.random() * 9)
  const moveBonus = Math.min(8, (moveName || '').length % 9)
  return base + randomBonus + moveBonus
}

const endBattle = (resultMessage) => {
  battleFinished.value = true
  battleResult.value = resultMessage
  addLog(resultMessage)
}

const rivalCounterAttack = async () => {
  if (battleFinished.value) {
    return
  }

  const randomMove = myMoves.value.length
    ? myMoves.value[Math.floor(Math.random() * myMoves.value.length)]
    : 'ataque rápido'

  const damage = calcDamage({
    attackerData: rivalPokemonData.value,
    defenderData: myPokemonData.value,
    moveName: randomMove,
  })

  myCurrentHp.value = Math.max(0, myCurrentHp.value - damage)
  addLog(`${normalizePokemonName(rivalActivePokemon.value?.pokemonName)} usó ${normalizePokemonName(randomMove)} y causó ${damage} de daño.`)

  if (myCurrentHp.value <= 0) {
    endBattle('Tu Pokémon se debilitó. El rival ganó esta batalla.')
    waitingRival.value = false
    return
  }

  waitingRival.value = false

  if (movesUsed.value >= maxMoves) {
    if (myCurrentHp.value === rivalCurrentHp.value) {
      endBattle('Empate técnico después de 4 movimientos por turno.')
    } else if (myCurrentHp.value > rivalCurrentHp.value) {
      endBattle('Ganaste por tener más vida restante tras 4 movimientos.')
    } else {
      endBattle('El rival ganó por tener más vida restante tras 4 movimientos.')
    }
  }
}

const useMove = async (moveName) => {
  if (loading.value || waitingRival.value || battleFinished.value) {
    return
  }

  if (movesUsed.value >= maxMoves) {
    return
  }

  waitingRival.value = true
  movesUsed.value += 1

  const damage = calcDamage({
    attackerData: myPokemonData.value,
    defenderData: rivalPokemonData.value,
    moveName,
  })

  rivalCurrentHp.value = Math.max(0, rivalCurrentHp.value - damage)
  addLog(`${normalizePokemonName(myActivePokemon.value?.pokemonName)} usó ${normalizePokemonName(moveName)} y causó ${damage} de daño.`)

  if (rivalCurrentHp.value <= 0) {
    endBattle('¡Ganaste! El Pokémon rival se debilitó.')
    waitingRival.value = false
    return
  }

  window.setTimeout(() => {
    rivalCounterAttack()
  }, 900)
}

const buildMoves = (teamPokemon, pokemonData) => {
  const fromTeam = Array.isArray(teamPokemon?.moves) ? teamPokemon.moves.filter(Boolean) : []

  if (fromTeam.length > 0) {
    return fromTeam.slice(0, 4)
  }

  const fromApi = Array.isArray(pokemonData?.moves)
    ? pokemonData.moves.slice(0, 4).map((item) => item.move?.name).filter(Boolean)
    : []

  return fromApi.length > 0 ? fromApi : ['ataque rápido', 'placaje', 'mordida', 'golpe cabeza']
}

const initArena = async () => {
  loading.value = true
  error.value = ''

  try {
    const friendId = String(route.query.friendId || '').trim()
    const teamId = String(route.query.teamId || '').trim()
    const opponentTeamId = String(route.query.opponentTeamId || '').trim()

    if (!friendId || !teamId || !opponentTeamId) {
      throw new Error('Faltan datos para abrir la arena. Inicia la batalla desde el formulario.')
    }

    const [myTeams, rivalTeams] = await Promise.all([
      api.listTeams(),
      api.listFriendTeams(friendId),
    ])

    myTeam.value = myTeams.find((team) => team._id === teamId) || null
    rivalTeam.value = rivalTeams.find((team) => team._id === opponentTeamId) || null

    if (!myTeam.value || !rivalTeam.value) {
      throw new Error('No se pudieron cargar los equipos seleccionados.')
    }

    myActivePokemon.value = myTeam.value.pokemons?.[0] || null
    rivalActivePokemon.value = rivalTeam.value.pokemons?.[0] || null

    if (!myActivePokemon.value || !rivalActivePokemon.value) {
      throw new Error('Ambos equipos deben tener al menos un pokémon para pelear.')
    }

    const [myData, rivalData] = await Promise.all([
      api.getPokemonDetail(myActivePokemon.value.pokemonId || myActivePokemon.value.pokemonName),
      api.getPokemonDetail(rivalActivePokemon.value.pokemonId || rivalActivePokemon.value.pokemonName),
    ])

    myPokemonData.value = myData
    rivalPokemonData.value = rivalData

    myMaxHp.value = Math.max(60, getStatValue(myData, 'hp', 60) * 2)
    rivalMaxHp.value = Math.max(60, getStatValue(rivalData, 'hp', 60) * 2)
    myCurrentHp.value = myMaxHp.value
    rivalCurrentHp.value = rivalMaxHp.value

    myMoves.value = buildMoves(myActivePokemon.value, myData)

    addLog('La batalla comenzó. Tienes 4 movimientos para derrotar al rival.')
  } catch (err) {
    error.value = err.message || 'No se pudo iniciar la batalla interactiva.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  initArena()
})
</script>

<template>
  <section class="card" style="margin-bottom: 1rem">
    <div class="inline" style="justify-content: space-between; align-items: center; margin-bottom: 0.8rem">
      <h2 style="margin: 0">Arena de Batalla</h2>
      <button class="secondary" @click="router.push('/battles')">Volver</button>
    </div>

    <p class="error" v-if="error">{{ error }}</p>
    <p class="muted" v-else-if="loading">Cargando arena...</p>

    <template v-else>
      <div class="arena-grid">
        <article class="pokemon-card">
          <h3>{{ normalizePokemonName(myActivePokemon?.nickname || myActivePokemon?.pokemonName) }}</h3>
          <p class="muted">Tu pokémon</p>
          <img :src="myPokemonData?.sprites?.front_default" alt="Tu pokémon" class="sprite" />
          <div class="hp-wrap">
            <span>HP {{ myCurrentHp }} / {{ myMaxHp }}</span>
            <div class="hp-bar-bg">
              <div class="hp-bar" :style="{ width: `${myHpPercent}%` }"></div>
            </div>
          </div>
        </article>

        <article class="pokemon-card">
          <h3>{{ normalizePokemonName(rivalActivePokemon?.nickname || rivalActivePokemon?.pokemonName) }}</h3>
          <p class="muted">Pokémon rival</p>
          <img :src="rivalPokemonData?.sprites?.front_default" alt="Pokémon rival" class="sprite" />
          <div class="hp-wrap">
            <span>HP {{ rivalCurrentHp }} / {{ rivalMaxHp }}</span>
            <div class="hp-bar-bg">
              <div class="hp-bar danger" :style="{ width: `${rivalHpPercent}%` }"></div>
            </div>
          </div>
        </article>
      </div>

      <div class="card" style="margin-top: 1rem">
        <h3 style="margin-top: 0">Movimientos ({{ movesUsed }}/{{ maxMoves }})</h3>
        <div class="moves-grid">
          <button
            v-for="move in myMoves"
            :key="move"
            class="secondary"
            :disabled="waitingRival || battleFinished || movesUsed >= maxMoves"
            @click="useMove(move)"
          >
            {{ normalizePokemonName(move) }}
          </button>
        </div>

        <p class="muted" v-if="waitingRival">El rival está preparando su ataque...</p>
        <p class="ok" v-if="battleFinished">{{ battleResult }}</p>
      </div>

      <div class="card" style="margin-top: 1rem">
        <h3 style="margin-top: 0">Equipos seleccionados</h3>
        <div class="arena-grid">
          <div>
            <strong>Tu equipo:</strong>
            <ul>
              <li v-for="pokemon in myTeam?.pokemons || []" :key="`my-${pokemon.pokemonId}-${pokemon.pokemonName}`">
                {{ normalizePokemonName(pokemon.nickname || pokemon.pokemonName) }}
              </li>
            </ul>
          </div>
          <div>
            <strong>Equipo rival:</strong>
            <ul>
              <li v-for="pokemon in rivalTeam?.pokemons || []" :key="`rival-${pokemon.pokemonId}-${pokemon.pokemonName}`">
                {{ normalizePokemonName(pokemon.nickname || pokemon.pokemonName) }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 1rem">
        <h3 style="margin-top: 0">Registro de turnos</h3>
        <ul>
          <li v-for="(entry, index) in log" :key="`${entry}-${index}`">{{ entry }}</li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.arena-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.pokemon-card {
  border: 1px solid #9fe6ff;
  border-radius: 12px;
  padding: 0.8rem;
  background: var(--white);
}

.sprite {
  width: 120px;
  height: 120px;
  object-fit: contain;
  display: block;
  margin: 0.4rem auto;
}

.hp-wrap {
  margin-top: 0.5rem;
}

.hp-bar-bg {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: var(--aqua-soft);
  overflow: hidden;
}

.hp-bar {
  height: 100%;
  border-radius: 999px;
  background: var(--green-main);
  transition: width 260ms ease;
}

.hp-bar.danger {
  background: var(--blue-main);
}

.moves-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}
</style>
