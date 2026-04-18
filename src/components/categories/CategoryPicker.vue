<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCategories } from '@/composables/useCategories'
import type { UiColor } from '@/types'

const props = defineProps<{
  modelValue: string | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const { query, create } = useCategories()

const CREATE_KEY = '__create__'
const searchQuery = ref('')
const createModalOpen = ref(false)
const newCategory = ref<{ name: string; icon: string; color: UiColor; is_income: boolean }>({
  name: '',
  icon: '',
  color: 'primary',
  is_income: false
})

const colorOptions = [
  { label: 'Bleu', value: 'primary' },
  { label: 'Vert', value: 'success' },
  { label: 'Rouge', value: 'error' },
  { label: 'Orange', value: 'warning' },
  { label: 'Neutre', value: 'neutral' }
]

const options = computed(() => {
  const cats = (query.data.value ?? [])
    .filter(c => !searchQuery.value || c.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
    .map(c => ({
      label: c.icon ? `${c.icon} ${c.name}` : c.name,
      value: c.id
    }))

  const createLabel = searchQuery.value
    ? `+ Créer "${searchQuery.value}"`
    : '+ Nouvelle catégorie'

  return [...cats, { label: createLabel, value: CREATE_KEY }]
})

function onSelect(value: string | null) {
  if (value === CREATE_KEY) {
    newCategory.value = { name: searchQuery.value, icon: '', color: 'primary', is_income: false }
    createModalOpen.value = true
    return
  }
  emit('update:modelValue', value)
}

async function confirmCreate() {
  if (!newCategory.value.name.trim()) return
  const cat = await create.mutateAsync({
    name: newCategory.value.name.trim(),
    icon: newCategory.value.icon.trim() || null,
    color: newCategory.value.color,
    is_income: newCategory.value.is_income
  })
  emit('update:modelValue', cat.id)
  createModalOpen.value = false
  searchQuery.value = ''
}
</script>

<template>
  <USelect
    :options="options"
    :model-value="modelValue"
    placeholder="Catégorie..."
    :loading="loading || query.isPending.value"
    size="sm"
    @update:model-value="onSelect(($event as string | null) ?? null)"
  />

  <UModal v-model:open="createModalOpen" title="Nouvelle catégorie">
    <template #body>
      <div class="space-y-4">
        <UFormField label="Nom">
          <UInput
            v-model="newCategory.name"
            placeholder="Alimentation, Transport..."
            class="w-full"
            autofocus
            @keydown.enter="confirmCreate"
          />
        </UFormField>
        <UFormField label="Icône (emoji)">
          <UInput v-model="newCategory.icon" placeholder="🛒" class="w-full" />
        </UFormField>
        <UFormField label="Couleur">
          <USelect v-model="newCategory.color" :options="colorOptions" class="w-full" />
        </UFormField>
        <UCheckbox v-model="newCategory.is_income" label="C'est une catégorie de revenus" />
      </div>
    </template>
    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton variant="ghost" color="neutral" @click="createModalOpen = false">Annuler</UButton>
        <UButton
          :loading="create.isPending.value"
          :disabled="!newCategory.name.trim()"
          @click="confirmCreate"
        >
          Créer
        </UButton>
      </div>
    </template>
  </UModal>
</template>
