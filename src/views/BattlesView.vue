<script setup>
import { onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/api'
import { authState } from '../stores/auth'

const router = useRouter()

const friends = ref([])
const myTeams = ref([])
const battles = ref([])
const error = ref('')
const ok = ref('')
let refreshInterval = null
const selectedTeamByBattle = reactive({})

const form = reactive({
  friendId: '',
  friendCode: '',
})

const loadBattles = async () => {
  battles.value = await api.listBattles()
}

const loadData = async () => {
  error.value = ''
  try {
    const [friendsData, teamsData] = await Promise.all([api.listFriends(), api.listTeams()])
    friends.value = Array.isArray(friendsData) ? friendsData : friendsData.friends || []
    myTeams.value = teamsData
    await loadBattles()
  } catch (err) {
    error.value = err.message
  }
}

const normalizeStatus = (status) => {
  const map = {
    pending: 'Pendiente',
    accepted: 'Aceptada',
    in_progress: 'En progreso',
    finished: 'Finalizada',
    rejected: 'Rechazada',
  }

  return map[status] || status
}

const getEntityId = (entity) => {
  if (!entity) {
    return ''
  }

  if (typeof entity === 'string') {
    return entity
  }

  if (entity._id) {
    return String(entity._id)
  }

  return String(entity)
}

const getBattleStatus = (battle) => {
  if (battle?.status) {
    return battle.status
  }

  if (battle?.winner) {
    return 'finished'
  }

  return 'pending'
}

const battleResultLabel = (battle) => {
  if (getBattleStatus(battle) !== 'finished') {
    return ''
  }

  const winnerId = battle?.winner?._id || battle?.winner
  const myId = authState.user?._id

  if (!winnerId) {
    return 'Empate'
  }

  return String(winnerId) === String(myId) ? 'Ganaste!!!!' : 'Perdiste'
}

const battleResultClass = (battle) => {
  const result = battleResultLabel(battle)

  if (result === 'Ganaste!!!!') {
    return 'battle-result win'
  }

  if (result === 'Perdiste') {
    return 'battle-result lose'
  }

  if (result === 'Empate') {
    return 'battle-result draw'
  }

  return 'battle-result'
}

const isOpponent = (battle) => getEntityId(battle.opponent) === String(authState.user?._id || '')
const isChallenger = (battle) => getEntityId(battle.user) === String(authState.user?._id || '')

const isMyTeamMissing = (battle) => {
  if (isChallenger(battle)) {
    return !battle.team
  }

  return !battle.opponentTeam
}

const createChallenge = async () => {
  error.value = ''
  ok.value = ''

  try {
    await api.createBattleChallenge({
      friendId: form.friendId || undefined,
      friendCode: form.friendCode || undefined,
    })

    ok.value = 'Desafío enviado. Esperando aceptación del rival.'
    form.friendCode = ''
    await loadBattles()
  } catch (err) {
    error.value = err.message
  }
}

const acceptBattle = async (battleId) => {
  error.value = ''
  ok.value = ''

  try {
    const updatedBattle = await api.acceptBattle(battleId)

    if (updatedBattle.status === 'in_progress') {
      ok.value = 'Reto aceptado. Iniciando batalla...'
      openArena(updatedBattle._id)
      return
    }

    ok.value = 'Reto aceptado. Seleccionen equipo para iniciar.'
    await loadBattles()
  } catch (err) {
    error.value = err.message
  }
}

const rejectBattle = async (battleId) => {
  error.value = ''
  ok.value = ''

  try {
    await api.rejectBattle(battleId)
    ok.value = 'Solicitud rechazada.'
    await loadBattles()
  } catch (err) {
    error.value = err.message
  }
}

const cancelBattle = async (battleId) => {
  error.value = ''
  ok.value = ''

  try {
    await api.cancelBattle(battleId)
    ok.value = 'Solicitud eliminada correctamente.'
    await loadBattles()
  } catch (err) {
    error.value = err.message
  }
}

const selectTeam = async (battleId) => {
  error.value = ''
  ok.value = ''

  const teamId = selectedTeamByBattle[battleId]

  if (!teamId) {
    error.value = 'Selecciona tu equipo primero.'
    return
  }

  try {
    const updatedBattle = await api.selectBattleTeam(battleId, { teamId })

    if (updatedBattle.status === 'in_progress') {
      ok.value = 'Equipos listos. Ya pueden pelear por turnos.'
    } else {
      ok.value = 'Equipo guardado. Esperando al rival.'
    }

    await loadBattles()
  } catch (err) {
    error.value = err.message
  }
}

const openArena = (battleId) => {
  router.push({
    path: '/battles/arena',
    query: { battleId },
  })
}

const deleteBattleRecord = async (battleId) => {
  error.value = ''
  ok.value = ''

  const confirmed = window.confirm('¿Quieres eliminar esta batalla?')

  if (!confirmed) {
    return
  }

  try {
    await api.deleteBattle(battleId)
    ok.value = 'Batalla eliminada correctamente.'
    await loadBattles()
  } catch (err) {
    error.value = err.message
  }
}

const handlePushRefresh = () => {
  loadData()
}

onMounted(() => {
  loadData()
  window.addEventListener('app-push-received', handlePushRefresh)
  refreshInterval = window.setInterval(loadData, 12000)
})

onBeforeUnmount(() => {
  window.removeEventListener('app-push-received', handlePushRefresh)

  if (refreshInterval) {
    window.clearInterval(refreshInterval)
    refreshInterval = null
  }
})
</script>

<template>
  <section class="card" style="margin-bottom: 1rem">
    <h2>Batallas entre amigos</h2>
    <form @submit.prevent="createChallenge">
      <select v-model="form.friendId">
        <option value="">Selecciona amigo</option>
        <option v-for="friend in friends" :key="friend._id" :value="friend._id">
          {{ friend.email }}
        </option>
      </select>

      <div class="inline">
        <input
          v-model="form.friendCode"
          placeholder="O usa código de jugadora"
          style="flex: 1"
        />
      </div>

      <button>Desafiar</button>
    </form>
    <p class="muted">Envía el desafío. Cuando el rival acepte, entran directo a la batalla.</p>
    <p class="error" v-if="error">{{ error }}</p>
    <p class="ok" v-if="ok">{{ ok }}</p>
  </section>

  <section class="grid grid-2">
    <article class="card" v-for="battle in battles" :key="battle._id">
      <h3>Batalla</h3>
      <p class="muted">ID: {{ battle._id }}</p>
      <p>{{ battle.user?.email }} vs {{ battle.opponent?.email }}</p>
      <p class="muted">Estado: <strong>{{ normalizeStatus(getBattleStatus(battle)) }}</strong></p>

      <template v-if="getBattleStatus(battle) === 'pending' && isOpponent(battle)">
        <div class="inline">
          <button @click="acceptBattle(battle._id)">Aceptar y jugar</button>
          <button class="danger" @click="rejectBattle(battle._id)">Rechazar</button>
        </div>
      </template>

      <template v-if="getBattleStatus(battle) === 'pending' && isChallenger(battle)">
        <button class="danger" @click="cancelBattle(battle._id)">Eliminar solicitud</button>
      </template>

      <template v-if="getBattleStatus(battle) === 'accepted' && isMyTeamMissing(battle)">
        <select v-model="selectedTeamByBattle[battle._id]">
          <option value="">Selecciona tu equipo</option>
          <option v-for="team in myTeams" :key="team._id" :value="team._id">{{ team.name }}</option>
        </select>
        <div class="inline">
          <button class="secondary" @click="selectTeam(battle._id)">Guardar equipo</button>
          <button class="danger" v-if="isChallenger(battle)" @click="cancelBattle(battle._id)">Eliminar solicitud</button>
        </div>
      </template>

      <template v-if="getBattleStatus(battle) === 'in_progress' || getBattleStatus(battle) === 'finished'">
        <p class="muted">HP: {{ battle.userHp }} - {{ battle.opponentHp }}</p>
        <p v-if="getBattleStatus(battle) === 'finished'" :class="battleResultClass(battle)"><strong>{{ battleResultLabel(battle) }}</strong></p>
        <div class="inline">
          <button
            class="secondary"
            @click="openArena(battle._id)"
          >
            {{ getBattleStatus(battle) === 'in_progress' ? 'Jugar' : 'Ver batalla' }}
          </button>
          <button class="danger" @click="deleteBattleRecord(battle._id)">Eliminar</button>
        </div>
      </template>

      <template v-if="getBattleStatus(battle) === 'pending' || getBattleStatus(battle) === 'accepted' || getBattleStatus(battle) === 'rejected'">
        <button class="danger" @click="deleteBattleRecord(battle._id)">Eliminar</button>
      </template>

      <p class="muted">{{ battle.summary }}</p>
    </article>
  </section>
</template>

<style scoped>
.battle-result {
  margin-bottom: 0.25rem;
}

.battle-result.win {
  color: var(--green-main);
}

.battle-result.lose {
  color: #b91c1c;
}

.battle-result.draw {
  color: #92400e;
}
</style>
