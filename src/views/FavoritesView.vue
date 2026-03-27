<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { api } from '../services/api'

const favorites = ref([])
const loading = ref(false)
const error = ref('')
const ok = ref('')
const imageByFavoriteId = reactive({})

const formById = reactive({})
const handleFavoritesUpdated = async () => {
  await load()
}

const spriteUrlById = (pokemonId) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await api.listFavorites()
    favorites.value = data
    await Promise.all(
      data.map(async (item) => {
        if (item.pokemonId && item.pokemonId > 0) {
          imageByFavoriteId[item._id] = spriteUrlById(item.pokemonId)
        } else {
          try {
            const detail = await api.getPokemonDetail(item.pokemonName)
            imageByFavoriteId[item._id] = detail.image
          } catch (err) {
            imageByFavoriteId[item._id] = ''
          }
        }
      })
    )

    data.forEach((item) => {
      formById[item._id] = {
        nickname: item.nickname || '',
        notes: item.notes || '',
        isShiny: item.isShiny || false,
        tags: (item.tags || []).join(', '),
      }
    })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const save = async (id) => {
  ok.value = ''
  error.value = ''
  try {
    const payload = {
      ...formById[id],
      tags: formById[id].tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    }
    await api.updateFavorite(id, payload)
    ok.value = 'Favorito actualizado'
    await load()
  } catch (err) {
    error.value = err.message
  }
}

const remove = async (id) => {
  error.value = ''
  ok.value = ''
  try {
    await api.deleteFavorite(id)
    ok.value = 'Favorito eliminado'
    await load()
  } catch (err) {
    error.value = err.message
  }
}

onMounted(() => {
  window.addEventListener('favorites-updated', handleFavoritesUpdated)
  load()
})

onBeforeUnmount(() => {
  window.removeEventListener('favorites-updated', handleFavoritesUpdated)
})
</script>

<template>
  <section class="card">
    <h2 class="favorite-header">★ Favoritos</h2>
    <p class="error" v-if="error">{{ error }}</p>
    <p class="ok" v-if="ok">{{ ok }}</p>
    <p v-if="loading">Cargando...</p>

    <div class="grid grid-2 favorites-grid" v-if="!loading">
      <article class="card favorite-card" v-for="item in favorites" :key="item._id">
        <img
          v-if="imageByFavoriteId[item._id]"
          class="favorite-image"
          :src="imageByFavoriteId[item._id]"
          :alt="item.pokemonName"
        />
        <h3 style="text-transform: capitalize">{{ item.pokemonName }}</h3>
        <p class="favorite-pill">★ #{{ item.pokemonId }}</p>

        <div class="grid">
          <input v-model="formById[item._id].nickname" placeholder="Apodo" />
          <textarea v-model="formById[item._id].notes" rows="3" placeholder="Notas"></textarea>
          <input v-model="formById[item._id].tags" placeholder="Tags separadas por coma" />
          <label class="inline">
            <input type="checkbox" v-model="formById[item._id].isShiny" />
            Shiny
          </label>
        </div>

        <div class="inline" style="margin-top: 0.7rem">
          <button class="secondary" @click="save(item._id)">Guardar</button>
          <button class="danger" @click="remove(item._id)">Eliminar</button>
        </div>
      </article>
    </div>
  </section>
</template>
