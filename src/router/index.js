import { createRouter, createWebHistory } from 'vue-router'
import { authState } from '../stores/auth'

import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import HomeView from '../views/HomeView.vue'
import PokemonDetailView from '../views/PokemonDetailView.vue'
import FavoritesView from '../views/FavoritesView.vue'
import TeamsView from '../views/TeamsView.vue'
import FriendsView from '../views/FriendsView.vue'
import BattlesView from '../views/BattlesView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', component: LoginView, meta: { guest: true } },
    { path: '/register', component: RegisterView, meta: { guest: true } },
    { path: '/', component: HomeView, meta: { auth: true } },
    { path: '/pokemon/:idOrName', component: PokemonDetailView, meta: { auth: true } },
    { path: '/favorites', component: FavoritesView, meta: { auth: true } },
    { path: '/teams', component: TeamsView, meta: { auth: true } },
    { path: '/friends', component: FriendsView, meta: { auth: true } },
    { path: '/battles', component: BattlesView, meta: { auth: true } },
  ],
})

router.beforeEach((to) => {
  if (to.meta.auth && !authState.token) {
    return '/login'
  }

  if (to.meta.guest && authState.token) {
    return '/'
  }
})

export default router
