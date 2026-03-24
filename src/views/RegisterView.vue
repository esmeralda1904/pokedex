<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/api'
import { setAuth } from '../stores/auth'

const router = useRouter()
const loading = ref(false)
const error = ref('')

const form = reactive({
  email: '',
  password: '',
})

const onSubmit = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await api.register(form)
    setAuth(data)
    router.push('/')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="card" style="max-width: 420px; margin: 0 auto">
    <h2>Registro</h2>
    <form @submit.prevent="onSubmit">
      <input v-model="form.email" placeholder="Correo" type="email" required />
      <input
        v-model="form.password"
        placeholder="Password (mínimo 6)"
        minlength="6"
        type="password"
        required
      />
      <button :disabled="loading">{{ loading ? 'Creando...' : 'Crear cuenta' }}</button>
    </form>
    <p class="error" v-if="error">{{ error }}</p>
  </section>
</template>
