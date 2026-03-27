import { authState, logout } from '../stores/auth'

const DEFAULT_API_URL = 'http://localhost:3001/api'

const normalizeApiBaseUrl = (value) => {
  const sanitizedValue = (value || DEFAULT_API_URL).trim().replace(/\/+$/, '')

  if (sanitizedValue.endsWith('/api')) {
    return sanitizedValue
  }

  return `${sanitizedValue}/api`
}

const API_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL)

const notifyQueuedRequest = (payload) => {
  window.dispatchEvent(
    new CustomEvent('offline-request-queued', {
      detail: payload,
    })
  )
}

const notifyFavoritesUpdated = (action, payload = null) => {
  window.dispatchEvent(
    new CustomEvent('favorites-updated', {
      detail: { action, payload, at: Date.now() },
    })
  )
}

const request = async (path, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (authState.token) {
    headers.Authorization = `Bearer ${authState.token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    logout()
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error de red' }))
    throw new Error(errorData.message || 'Error de red')
  }

  if (response.status === 204) {
    return null
  }

  if (response.status === 202) {
    const queuedData = await response.json().catch(() => ({ queued: true }))

    if (queuedData?.queued) {
      notifyQueuedRequest(queuedData)
    }

    return queuedData
  }

  return response.json()
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  getVapidPublicKey: () => request('/notifications/vapid-public-key'),
  subscribePush: (payload) => request('/notifications/subscribe', { method: 'POST', body: JSON.stringify(payload) }),
  sendPushTest: (payload) => request('/notifications/send', { method: 'POST', body: JSON.stringify(payload) }),
  listPokemon: (query) => request(`/pokemon?${new URLSearchParams(query).toString()}`),
  getPokemonDetail: (idOrName) => request(`/pokemon/${idOrName}`),

  listFavorites: () => request('/favorites'),
  createFavorite: async (payload) => {
    const created = await request('/favorites', { method: 'POST', body: JSON.stringify(payload) })
    notifyFavoritesUpdated('create', created)
    return created
  },
  updateFavorite: async (id, payload) => {
    const updated = await request(`/favorites/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    notifyFavoritesUpdated('update', updated)
    return updated
  },
  deleteFavorite: async (id) => {
    const removed = await request(`/favorites/${id}`, { method: 'DELETE' })
    notifyFavoritesUpdated('delete', { id })
    return removed
  },

  listTeams: () => request('/teams'),
  listFriendTeams: (friendId) => request(`/teams/friend/${friendId}`),
  listFriendTeamsByCode: (friendCode) => request(`/teams/friend-code/${encodeURIComponent(friendCode)}`),
  createTeam: (payload) => request('/teams', { method: 'POST', body: JSON.stringify(payload) }),
  updateTeam: (id, payload) => request(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTeam: (id) => request(`/teams/${id}`, { method: 'DELETE' }),

  listFriends: () => request('/friends'),
  addFriend: (payload) => request('/friends/add', { method: 'POST', body: JSON.stringify(payload) }),
  acceptFriendRequest: (requesterId) => request(`/friends/requests/${requesterId}/accept`, { method: 'POST' }),
  rejectFriendRequest: (requesterId) => request(`/friends/requests/${requesterId}`, { method: 'DELETE' }),
  deleteFriend: (friendId) => request(`/friends/${friendId}`, { method: 'DELETE' }),

  listBattles: () => request('/battles'),
  createBattleChallenge: (payload) => request('/battles/challenges', { method: 'POST', body: JSON.stringify(payload) }),
  getBattle: (battleId) => request(`/battles/${battleId}`),
  deleteBattle: (battleId) => request(`/battles/${battleId}`, { method: 'DELETE' }),
  acceptBattle: (battleId) => request(`/battles/${battleId}/accept`, { method: 'POST' }),
  rejectBattle: (battleId) => request(`/battles/${battleId}/reject`, { method: 'POST' }),
  cancelBattle: (battleId) => request(`/battles/${battleId}/cancel`, { method: 'POST' }),
  selectBattleTeam: (battleId, payload) => request(`/battles/${battleId}/team`, { method: 'POST', body: JSON.stringify(payload) }),
  performBattleMove: (battleId, payload) => request(`/battles/${battleId}/move`, { method: 'POST', body: JSON.stringify(payload) }),
}
