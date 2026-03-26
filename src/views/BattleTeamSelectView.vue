<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../services/api'
import { authState } from '../stores/auth'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const battle = ref(null)
const myTeams = ref([])
const selectedTeamId = ref('')
const error = ref('')
const ok = ref('')
const saving = ref(false)
let pollInterval = null

const getEntityId = (entity) => {
  if (!entity) return ''
  if (typeof entity === 'string') return entity
  if (entity._id) return String(entity._id)
  return String(entity)
}

const isChallenger = () => getEntityId(battle.value?.user) === String(authState.user?._id || '')
const isOpponent = () => getEntityId(battle.value?.opponent) === String(authState.user?._id || '')

const iMyTeamSet = () => {
  if (isChallenger()) {
    return Boolean(battle.value?.team)
  }
  return Boolean(battle.value?.opponentTeam)
}

const isRivalTeamSet = () => {
  if (isChallenger()) {
    return Boolean(battle.value?.opponentTeam)
  }
  return Boolean(battle.value?.team)
}

const loadBattle = async (silent = false) => {
  const battleId = String(route.query.battleId || '').trim()

  if (!battleId) {
    error.value = 'Falta battleId para seleccionar equipo.'
    loading.value = false
    return
  }

  if (!silent) {
    loading.value = true
  }

  try {
    const battleData = await api.getBattle(battleId)
    battle.value = battleData

    if (battleData.status === 'in_progress') {
      // Si ya están en progreso, ir directo a arena
      router.push({
        path: '/battles/arena',
        query: { battleId: battleData._id },
      })
      return
    }

    error.value = ''
  } catch (err) {
    error.value = err.message || 'No se pudo cargar la batalla.'
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

const loadTeams = async () => {
  try {
    const teams = await api.listTeams()
    myTeams.value = teams
  } catch (err) {
    error.value = err.message
  }
}

const selectTeam = async () => {
  if (!selectedTeamId.value) {
    error.value = 'Selecciona tu equipo primero.'
    return
  }

  saving.value = true
  error.value = ''
  ok.value = ''

  try {
    const updatedBattle = await api.selectBattleTeam(battle.value._id, { teamId: selectedTeamId.value })
    battle.value = updatedBattle
    ok.value = 'Equipo guardado. Esperando al rival...'

    if (updatedBattle.status === 'in_progress') {
      // Ambos ya tienen equipo, ir a arena
      setTimeout(() => {
        router.push({
          path: '/battles/arena',
          query: { battleId: updatedBattle._id },
        })
      }, 1500)
    }
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadBattle(), loadTeams()])

  // Poll cada 2 segundos para ver si rival ya eligió
  pollInterval = setInterval(async () => {
    await loadBattle(true)
  }, 2000)
})

onBeforeUnmount(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
})
</script>

<template>
  <section class="card">
    <div class="inline" style="justify-content: space-between; align-items: center; margin-bottom: 0.8rem">
      <h2 style="margin: 0">Seleccionar Equipo</h2>
      <button class="secondary" @click="router.push('/battles')">Volver</button>
    </div>

    <p class="error" v-if="error">{{ error }}</p>
    <p class="muted" v-else-if="loading">Cargando batalla...</p>

    <template v-else-if="battle">
      <p class="muted">
        Batalla entre <strong>{{ battle.user?.email }}</strong> y
        <strong>{{ battle.opponent?.email }}</strong>
      </p>

      <div class="team-select-container">
        <article class="card" style="flex: 1">
          <h3>Tu equipo</h3>
          <p class="muted">Selecciona el equipo con el que quieres jugar</p>

          <select v-model="selectedTeamId">
            <option value="">-- Elige un equipo --</option>
            <option v-for="team in myTeams" :key="team._id" :value="team._id">
              {{ team.name }} ({{ team.pokemons?.length || 0 }} pokémon)
            </option>
          </select>

          <button
            @click="selectTeam"
            :disabled="!selectedTeamId || saving || iMyTeamSet()"
            style="margin-top: 0.6rem"
          >
            {{ saving ? 'Guardando...' : iMyTeamSet() ? '✓ Equipo guardado' : 'Guardar equipo' }}
          </button>

          <p v-if="iMyTeamSet()" class="ok" style="margin-top: 0.5rem">
            ✓ Tu equipo está listo
          </p>
        </article>

        <article class="card" style="flex: 1">
          <h3>Equipo del rival</h3>
          <p class="muted">Esperando que el rival seleccione su equipo...</p>

          <p v-if="isRivalTeamSet()" class="ok">
            ✓ El rival ya seleccionó su equipo
          </p>
          <p v-else class="muted">
            Esperando...
          </p>
        </article>
      </div>

      <div v-if="iMyTeamSet() && isRivalTeamSet()" class="card" style="margin-top: 1rem; text-align: center">
        <p class="ok">
          ¡Ambos equipos listos! Redirigiendo a la arena en un momento...
        </p>
      </div>

      <p v-if="ok" class="ok" style="margin-top: 0.5rem">{{ ok }}</p>
    </template>
  </section>
</template>

<style scoped>
.team-select-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1rem 0;
}

@media (max-width: 768px) {
  .team-select-container {
    grid-template-columns: 1fr;
  }
}

select {
  width: 100%;
  margin: 0.5rem 0;
  padding: 0.5rem;
  border: 1px solid #9fe6ff;
  border-radius: 8px;
  font-size: 1rem;
}
</style>
