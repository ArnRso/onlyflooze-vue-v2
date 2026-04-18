<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import type { SuggestedPattern } from '@/utils/recurringDetector'
import { useRecurring } from '@/composables/useRecurring'

const qc = useQueryClient()
const { create } = useRecurring()

const suggestions = computed<SuggestedPattern[]>(
  () => qc.getQueryData(['recurring-suggestions']) ?? []
)

async function accept(suggestion: SuggestedPattern) {
  await create.mutateAsync({
    label: suggestion.label,
    label_pattern: suggestion.label_normalized,
    category_id: null,
    expected_amount: suggestion.expected_amount,
    amount_tolerance: 0.2,
    frequency: suggestion.frequency,
    day_of_month: suggestion.day_of_month,
    day_tolerance: 3,
    month_end_behavior: 'last_or_first',
    is_income: suggestion.expected_amount > 0,
    is_active: true
  })
  dismiss(suggestion)
}

function dismiss(suggestion: SuggestedPattern) {
  const current = qc.getQueryData<SuggestedPattern[]>(['recurring-suggestions']) ?? []
  qc.setQueryData(
    ['recurring-suggestions'],
    current.filter(s => s.label !== suggestion.label)
  )
}
</script>

<template>
  <div v-if="suggestions.length > 0" class="space-y-2">
    <UAlert
      v-for="s in suggestions"
      :key="s.label"
      color="info"
      variant="soft"
      :title="`Pattern détecté : ${s.label}`"
      :description="`${s.occurrences} occurrences, ~${s.frequency === 'monthly' ? 'mensuel' : s.frequency === 'quarterly' ? 'trimestriel' : 'hebdomadaire'}, ~${Math.round(s.expected_amount)}€`"
    >
      <template #actions>
        <UButton size="xs" color="primary" @click="accept(s)">Créer le pattern</UButton>
        <UButton size="xs" variant="ghost" color="neutral" @click="dismiss(s)">Ignorer</UButton>
      </template>
    </UAlert>
  </div>
</template>
