<script setup lang="ts">
import { computed } from 'vue'
import { useCategories } from '@/composables/useCategories'

const props = defineProps<{
  modelValue: string | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const { query } = useCategories()

const options = computed(() =>
  (query.data.value ?? []).map(c => ({
    label: c.name,
    value: c.id,
    color: c.color ?? 'neutral'
  }))
)
</script>

<template>
  <USelect
    :options="options"
    :model-value="modelValue"
    placeholder="Catégorie..."
    :loading="loading || query.isPending.value"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
