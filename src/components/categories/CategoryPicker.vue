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
const newCategoryName = ref('')

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
    newCategoryName.value = searchQuery.value
    createModalOpen.value = true
    return
  }
  emit('update:modelValue', value)
}

async function confirmCreate() {
  if (!newCategoryName.value.trim()) return
  const cat = await create.mutateAsync({
    name: newCategoryName.value.trim(),
    icon: null,
    color: 'neutral' as UiColor,
    is_income: false
  })
  emit('update:modelValue', cat.id)
  createModalOpen.value = false
  newCategoryName.value = ''
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
      <UFormField label="Nom de la catégorie">
        <UInput
          v-model="newCategoryName"
          placeholder="Alimentation, Transport..."
          class="w-full"
          autofocus
          @keydown.enter="confirmCreate"
        />
      </UFormField>
    </template>
    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton variant="ghost" color="neutral" @click="createModalOpen = false">Annuler</UButton>
        <UButton
          :loading="create.isPending.value"
          :disabled="!newCategoryName.trim()"
          @click="confirmCreate"
        >
          Créer
        </UButton>
      </div>
    </template>
  </UModal>
</template>
