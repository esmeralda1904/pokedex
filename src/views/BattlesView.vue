<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from '../services/api'

const friends = ref([])
const myTeams = ref([])
const enemyTeams = ref([])
const battles = ref([])
const error = ref('')
const ok = ref('')

const form = reactive({
  friendId: '',
  friendCode: '',
  teamId: '',
  opponentTeamId: '',
})

const loadBattles = async () => {
  battles.value = await api.listBattles()
}

const loadData = async () => {
  error.value = ''
  try {
    const [friendsData, teamsData] = await Promise.all([api.listFriends(), api.listTeams()])
    friends.value = friendsData
    myTeams.value = teamsData
    await loadBattles()
  } catch (err) {
    error.value = err.message
  }
}

const refreshEnemyTeams = async () => {
  form.opponentTeamId = ''
  enemyTeams.value = []
  form.friendCode = ''
  if (!form.friendId) {
    return
  }

  enemyTeams.value = await api.listFriendTeams(form.friendId)
}

const loadEnemyTeamsByCode = async () => {
  error.value = ''
  ok.value = ''
  form.opponentTeamId = ''
  enemyTeams.value = []

  if (!form.friendCode) {
    return
  }

  try {
    const data = await api.listFriendTeamsByCode(form.friendCode)
    form.friendId = data.friend._id
    enemyTeams.value = data.teams
    ok.value = `Rival cargada: ${data.friend.email}`
  } catch (err) {
    error.value = err.message
  }
}

const createBattle = async () => {
  error.value = ''
  ok.value = ''
  try {
    await api.createBattle(form)
    ok.value = 'Batalla registrada'
    await loadBattles()
  } catch (err) {
    error.value = err.message
  }
}

onMounted(loadData)
</script>

<template>
  <section class="card" style="margin-bottom: 1rem">
    <h2>Batallas entre amigas</h2>
    <form @submit.prevent="createBattle">
      <select v-model="form.friendId" @change="refreshEnemyTeams" required>
        <option value="">Selecciona amiga</option>
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
        <button type="button" class="secondary" @click="loadEnemyTeamsByCode">
          Cargar por código
        </button>
      </div>

      <select v-model="form.teamId" required>
        <option value="">Tu equipo</option>
        <option v-for="team in myTeams" :key="team._id" :value="team._id">{{ team.name }}</option>
      </select>

      <select v-model="form.opponentTeamId" required>
        <option value="">Equipo de tu amiga</option>
        <option v-for="team in enemyTeams" :key="team._id" :value="team._id">{{ team.name }}</option>
      </select>

      <button>Iniciar batalla</button>
    </form>
    <p class="muted">Puedes seleccionar amiga o cargar rival con su código de jugadora.</p>
    <p class="error" v-if="error">{{ error }}</p>
    <p class="ok" v-if="ok">{{ ok }}</p>
  </section>

  <section class="grid grid-2">
    <article class="card" v-for="battle in battles" :key="battle._id">
      <h3>Batalla</h3>
      <p>{{ battle.user?.email }} vs {{ battle.opponent?.email }}</p>
      <p>Puntaje: {{ battle.userScore }} - {{ battle.opponentScore }}</p>
      <p><strong>{{ battle.summary }}</strong></p>
    </article>
  </section>
</template>
