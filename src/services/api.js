import { authState, logout } from '../stores/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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

  return response.json()
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  listPokemon: (query) => request(`/pokemon?${new URLSearchParams(query).toString()}`),
  getPokemonDetail: (idOrName) => request(`/pokemon/${idOrName}`),

  listFavorites: () => request('/favorites'),
  createFavorite: (payload) => request('/favorites', { method: 'POST', body: JSON.stringify(payload) }),
  updateFavorite: (id, payload) => request(`/favorites/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteFavorite: (id) => request(`/favorites/${id}`, { method: 'DELETE' }),

  listTeams: () => request('/teams'),
  listFriendTeams: (friendId) => request(`/teams/friend/${friendId}`),
  createTeam: (payload) => request('/teams', { method: 'POST', body: JSON.stringify(payload) }),
  updateTeam: (id, payload) => request(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTeam: (id) => request(`/teams/${id}`, { method: 'DELETE' }),

  listFriends: () => request('/friends'),
  addFriend: (payload) => request('/friends/add', { method: 'POST', body: JSON.stringify(payload) }),

  listBattles: () => request('/battles'),
  createBattle: (payload) => request('/battles', { method: 'POST', body: JSON.stringify(payload) }),
}
