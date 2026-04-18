<script setup lang="ts">
import { ref } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useCategories } from '@/composables/useCategories'
import type { Category } from '@/types'

const { query, create, remove } = useCategories()

const modalOpen = ref(false)

const form = ref({
  name: '',
  icon: '',
  color: 'primary',
  is_income: false
})

const colorOptions = [
  { label: 'Bleu (primaire)', value: 'primary' },
  { label: 'Vert (succès)', value: 'success' },
  { label: 'Rouge (erreur)', value: 'error' },
  { label: 'Orange (avertissement)', value: 'warning' },
  { label: 'Neutre', value: 'neutral' }
]

function openCreate() {
  form.value = { name: '', icon: '', color: 'primary', is_income: false }
  modalOpen.value = true
}

async function save() {
  await create.mutateAsync({
    name: form.value.name,
    icon: form.value.icon || null,
    color: form.value.color,
    is_income: form.value.is_income
  })
  modalOpen.value = false
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6 max-w-2xl">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold">Catégories</h1>
        <UButton icon="i-lucide-plus" label="Nouvelle catégorie" @click="openCreate" />
      </div>

      <div v-if="query.isPending.value" class="space-y-2">
        <USkeleton v-for="i in 5" :key="i" class="h-12 w-full" />
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="cat in query.data.value"
          :key="cat.id"
          class="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
        >
          <div class="flex items-center gap-3">
            <span v-if="cat.icon" class="text-lg">{{ cat.icon }}</span>
            <div>
              <span class="font-medium">{{ cat.name }}</span>
              <UBadge
                class="ml-2"
                size="xs"
                :color="cat.color ?? 'neutral'"
                variant="soft"
                :label="cat.is_income ? 'Revenu' : 'Dépense'"
              />
            </div>
          </div>
          <UButton
            icon="i-lucide-trash-2"
            size="xs"
            variant="ghost"
            color="error"
            :loading="remove.isPending.value"
            @click.stop="remove.mutate(cat.id)"
          />
        </div>

        <p v-if="!query.data.value?.length" class="text-center text-gray-400 py-8">
          Aucune catégorie. Commencez par en créer quelques-unes (Alimentation, Transport, Loyer…).
        </p>
      </div>
    </div>

    <UModal v-model:open="modalOpen" title="Nouvelle catégorie">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Nom">
            <UInput v-model="form.name" placeholder="Alimentation, Transport..." class="w-full" />
          </UFormField>
          <UFormField label="Icône (emoji)">
            <UInput v-model="form.icon" placeholder="🛒" class="w-full" />
          </UFormField>
          <UFormField label="Couleur">
            <USelect v-model="form.color" :options="colorOptions" class="w-full" />
          </UFormField>
          <UCheckbox v-model="form.is_income" label="C'est une catégorie de revenus" />
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <UButton variant="ghost" color="neutral" @click="modalOpen = false">Annuler</UButton>
          <UButton :loading="create.isPending.value" :disabled="!form.name" @click="save">
            Créer
          </UButton>
        </div>
      </template>
    </UModal>
  </AppLayout>
</template>
