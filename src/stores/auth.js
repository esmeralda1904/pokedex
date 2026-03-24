import { reactive } from 'vue'

const token = localStorage.getItem('token') || ''
const userRaw = localStorage.getItem('user')

export const authState = reactive({
  token,
  user: userRaw ? JSON.parse(userRaw) : null,
})

export const setAuth = ({ token: nextToken, user }) => {
  authState.token = nextToken
  authState.user = user
  localStorage.setItem('token', nextToken)
  localStorage.setItem('user', JSON.stringify(user))
}

export const logout = () => {
  authState.token = ''
  authState.user = null
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}
