<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { signIn, signUp } = useAuth()

const email = ref('')
const password = ref('')
const mode = ref<'login' | 'signup'>('login')
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  error.value = null
  loading.value = true
  try {
    if (mode.value === 'login') {
      await signIn(email.value, password.value)
      router.push('/dashboard')
    } else {
      await signUp(email.value, password.value)
      error.value = 'Compte créé. Vérifiez votre email pour confirmer votre inscription.'
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-primary">OnlyFlooze</h1>
          <p class="text-sm text-gray-500 mt-1">Gérez votre budget simplement</p>
        </div>
      </template>

      <div class="space-y-4">
        <UTabs
          :items="[{ label: 'Connexion', value: 'login' }, { label: 'Inscription', value: 'signup' }]"
          v-model="mode"
        />

        <UFormField label="Email">
          <UInput v-model="email" type="email" placeholder="vous@exemple.com" class="w-full" />
        </UFormField>

        <UFormField label="Mot de passe">
          <UInput v-model="password" type="password" placeholder="••••••••" class="w-full" />
        </UFormField>

        <UAlert v-if="error" :description="error" color="error" variant="soft" />

        <UButton
          class="w-full justify-center"
          :loading="loading"
          @click="submit"
        >
          {{ mode === 'login' ? 'Se connecter' : "S'inscrire" }}
        </UButton>
      </div>
    </UCard>
  </div>
</template>
