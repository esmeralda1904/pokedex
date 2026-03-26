<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../services/api'
import { authState } from '../stores/auth'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const actionLoading = ref(false)
const error = ref('')
const battle = ref(null)
const myPokemonData = ref(null)
const rivalPokemonData = ref(null)
let refreshInterval = null

const normalizePokemonName = (name) => {
  if (!name) {
    return 'Pokémon'
  }

  return String(name)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const toPercent = (current, max) => Math.max(0, Math.min(100, Math.round((current / Math.max(1, max)) * 100)))

const myId = computed(() => String(authState.user?._id || ''))
const isUserChallenger = computed(() => String(battle.value?.user?._id || battle.value?.user || '') === myId.value)
const myTurn = computed(() => String(battle.value?.turnUser || '') === myId.value)
const myMoveSubmitted = computed(() => {
  if (!battle.value) {
    return false
  }

  return isUserChallenger.value
    ? Boolean(battle.value.pendingMoves?.user)
    : Boolean(battle.value.pendingMoves?.opponent)
})

const rivalMoveSubmitted = computed(() => {
  if (!battle.value) {
    return false
  }

  return isUserChallenger.value
    ? Boolean(battle.value.pendingMoves?.opponent)
    : Boolean(battle.value.pendingMoves?.user)
})

const myHp = computed(() => (isUserChallenger.value ? battle.value?.userHp : battle.value?.opponentHp) || 0)
const myMaxHp = computed(() => (isUserChallenger.value ? battle.value?.userMaxHp : battle.value?.opponentMaxHp) || 1)
const rivalHp = computed(() => (isUserChallenger.value ? battle.value?.opponentHp : battle.value?.userHp) || 0)
const rivalMaxHp = computed(() => (isUserChallenger.value ? battle.value?.opponentMaxHp : battle.value?.userMaxHp) || 1)

const myHpPercent = computed(() => toPercent(myHp.value, myMaxHp.value))
const rivalHpPercent = computed(() => toPercent(rivalHp.value, rivalMaxHp.value))

const myActivePokemon = computed(() => {
  if (!battle.value) {
    return null
  }

  return isUserChallenger.value ? battle.value.userActivePokemon : battle.value.opponentActivePokemon
})

const rivalActivePokemon = computed(() => {
  if (!battle.value) {
    return null
  }

  return isUserChallenger.value ? battle.value.opponentActivePokemon : battle.value.userActivePokemon
})

const availableMoves = computed(() => {
  const moves = myActivePokemon.value?.moves || []

  if (moves.length > 0) {
    return moves
  }

  return ['ataque rápido', 'placaje', 'mordida', 'golpe cabeza']
})

const battleResult = computed(() => {
  if (battle.value?.status !== 'finished') {
    return ''
  }

  const winnerId = String(battle.value?.winner?._id || battle.value?.winner || '')

  if (!winnerId) {
    return 'Empate'
  }

  return winnerId === myId.value ? 'Ganaste!!!!' : 'Perdiste'
})

const syncBattleSprites = async () => {
  if (!myActivePokemon.value || !rivalActivePokemon.value) {
    myPokemonData.value = null
    rivalPokemonData.value = null
    return
  }

  const [myData, rivalData] = await Promise.all([
    api.getPokemonDetail(myActivePokemon.value.pokemonId || myActivePokemon.value.pokemonName),
    api.getPokemonDetail(rivalActivePokemon.value.pokemonId || rivalActivePokemon.value.pokemonName),
  ])

  myPokemonData.value = myData
  rivalPokemonData.value = rivalData
}

const loadBattle = async (silent = false) => {
  const battleId = String(route.query.battleId || '').trim()

  if (!battleId) {
    error.value = 'Falta battleId para abrir la arena.'
    return
  }

  if (!silent) {
    loading.value = true
  }

  try {
    const battleData = await api.getBattle(battleId)
    battle.value = battleData
    await syncBattleSprites()
    error.value = ''
  } catch (err) {
    error.value = err.message || 'No se pudo cargar la batalla.'
  } finally {
    loading.value = false
  }
}

const useMove = async (moveName) => {
  if (!battle.value || battle.value.status !== 'in_progress' || myMoveSubmitted.value || actionLoading.value) {
    return
  }

  actionLoading.value = true
  error.value = ''

  try {
    const updated = await api.performBattleMove(battle.value._id, { moveName })
    battle.value = updated
    await syncBattleSprites()
  } catch (err) {
    error.value = err.message
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  loadBattle()
  refreshInterval = window.setInterval(() => loadBattle(true), 3000)
})

onBeforeUnmount(() => {
  if (refreshInterval) {
    window.clearInterval(refreshInterval)
    refreshInterval = null
  }
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

    <template v-else-if="battle">
      <p class="muted">Estado: <strong>{{ battle.status }}</strong></p>
      <p class="muted">Ronda actual: <strong>{{ battle.roundNumber || 1 }}</strong></p>

      <div class="arena-grid">
        <article class="pokemon-card">
          <h3>{{ normalizePokemonName(myActivePokemon?.pokemonName) }}</h3>
          <p class="muted" v-if="myActivePokemon?.pokemonId">ID: #{{ myActivePokemon?.pokemonId }}</p>
          <p class="muted">Tu pokémon</p>
          <img :src="myPokemonData?.sprites?.front_default" alt="Tu pokémon" class="sprite" />
          <div class="hp-wrap">
            <span>HP {{ myHp }} / {{ myMaxHp }}</span>
            <div class="hp-bar-bg">
              <div class="hp-bar" :style="{ width: `${myHpPercent}%` }"></div>
            </div>
          </div>
        </article>

        <article class="pokemon-card">
          <h3>{{ normalizePokemonName(rivalActivePokemon?.pokemonName) }}</h3>
          <p class="muted" v-if="rivalActivePokemon?.pokemonId">ID: #{{ rivalActivePokemon?.pokemonId }}</p>
          <p class="muted">Pokémon rival</p>
          <img :src="rivalPokemonData?.sprites?.front_default" alt="Pokémon rival" class="sprite" />
          <div class="hp-wrap">
            <span>HP {{ rivalHp }} / {{ rivalMaxHp }}</span>
            <div class="hp-bar-bg">
              <div class="hp-bar danger" :style="{ width: `${rivalHpPercent}%` }"></div>
            </div>
          </div>
        </article>
      </div>

      <div class="card" style="margin-top: 1rem" v-if="battle.status === 'in_progress'">
        <h3 style="margin-top: 0">Movimientos</h3>
        <div class="moves-grid">
          <button
            v-for="move in availableMoves"
            :key="move"
            class="secondary"
            :disabled="myMoveSubmitted || actionLoading"
            @click="useMove(move)"
          >
            {{ normalizePokemonName(move) }}
          </button>
        </div>

        <p class="muted" v-if="!myMoveSubmitted">Elige tu movimiento para esta ronda.</p>
        <p class="muted" v-else-if="myMoveSubmitted && !rivalMoveSubmitted">Movimiento enviado. Esperando al rival...</p>
        <p class="muted" v-else>Ambos movimientos listos. Resolviendo ronda...</p>
      </div>

      <div class="card" style="margin-top: 1rem" v-if="battle.status === 'finished'">
        <p class="ok" :class="{ 'result-lose': battleResult === 'Perdiste', 'result-draw': battleResult === 'Empate' }">
          {{ battleResult }}
        </p>
        <p class="muted">{{ battle.summary }}</p>
      </div>

      <div class="card" style="margin-top: 1rem">
        <h3 style="margin-top: 0">Equipos seleccionados</h3>
        <div class="arena-grid">
          <div>
            <strong>Tu equipo:</strong>
            <ul>
              <li v-for="pokemon in (isUserChallenger ? (battle.team?.pokemons || []) : (battle.opponentTeam?.pokemons || []))" :key="`my-${pokemon.pokemonId}-${pokemon.pokemonName}`">
                #{{ pokemon.pokemonId }} · {{ normalizePokemonName(pokemon.pokemonName) }}
              </li>
            </ul>
          </div>
          <div>
            <strong>Equipo rival:</strong>
            <ul>
              <li v-for="pokemon in (isUserChallenger ? (battle.opponentTeam?.pokemons || []) : (battle.team?.pokemons || []))" :key="`rival-${pokemon.pokemonId}-${pokemon.pokemonName}`">
                #{{ pokemon.pokemonId }} · {{ normalizePokemonName(pokemon.pokemonName) }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 1rem">
        <h3 style="margin-top: 0">Registro de turnos</h3>
        <ul>
          <li v-for="(entry, index) in battle.battleLog || []" :key="`${entry}-${index}`">{{ entry }}</li>
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

.result-lose {
  color: #b91c1c;
}

.result-draw {
  color: #92400e;
}
</style>
