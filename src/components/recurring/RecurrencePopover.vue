<script setup lang="ts">
import { ref, watch } from 'vue'
import { getDate } from 'date-fns'
import { normalizeLabel } from '@/utils/labelNormalizer'
import { useRecurring } from '@/composables/useRecurring'
import CategoryPicker from '@/components/categories/CategoryPicker.vue'
import type { Transaction, RecurringFrequency } from '@/types'

const props = defineProps<{
  transaction: Transaction
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: []
}>()

const { create } = useRecurring()

const form = ref({
  label: '',
  expected_amount: 0,
  amount_tolerance: 0.2,
  frequency: 'monthly' as RecurringFrequency,
  day_of_month: 1,
  day_tolerance: 3,
  is_income: false,
  category_id: null as string | null
})

// Pré-remplir quand la transaction change ou que le popover s'ouvre
watch(
  () => [props.transaction, props.open] as const,
  ([tx, isOpen]) => {
    if (!isOpen) return
    form.value = {
      label: normalizeLabel(tx.label),
      expected_amount: tx.amount,
      amount_tolerance: 0.2,
      frequency: 'monthly',
      day_of_month: getDate(new Date(tx.date)),
      day_tolerance: 3,
      is_income: tx.amount > 0,
      category_id: tx.category_id
    }
  },
  { immediate: true }
)

async function submit() {
  await create.mutateAsync({
    label: form.value.label,
    label_pattern: form.value.label || null,
    category_id: form.value.category_id,
    expected_amount: form.value.expected_amount,
    amount_tolerance: form.value.amount_tolerance,
    frequency: form.value.frequency,
    day_of_month: form.value.day_of_month,
    day_tolerance: form.value.day_tolerance,
    month_end_behavior: 'last_or_first',
    is_income: form.value.is_income,
    is_active: true
  })
  emit('created')
  emit('update:open', false)
}

const freqOptions = [
  { label: 'Hebdomadaire', value: 'weekly' },
  { label: 'Mensuel', value: 'monthly' },
  { label: 'Trimestriel', value: 'quarterly' },
  { label: 'Annuel', value: 'annual' }
]
</script>

<template>
  <Transition name="popover">
    <div
      v-if="open"
      class="mt-2 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg space-y-3"
    >
      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nouvelle récurrence</p>

      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Libellé" class="col-span-2">
          <UInput v-model="form.label" placeholder="EDF, Salaire…" size="sm" class="w-full" />
        </UFormField>

        <UFormField label="Montant attendu">
          <UInput v-model.number="form.expected_amount" type="number" step="0.01" size="sm" class="w-full" />
        </UFormField>

        <UFormField label="Tolérance (%)">
          <UInput
            :model-value="Math.round(form.amount_tolerance * 100)"
            type="number" min="0" max="100" size="sm" class="w-full"
            @update:model-value="form.amount_tolerance = Number($event) / 100"
          />
        </UFormField>

        <UFormField label="Fréquence">
          <USelect v-model="form.frequency" :options="freqOptions" size="sm" class="w-full" />
        </UFormField>

        <UFormField label="Jour ± jours">
          <div class="flex gap-1">
            <UInput v-model.number="form.day_of_month" type="number" min="1" max="31" size="sm" class="w-16" />
            <span class="self-center text-gray-400 text-sm">±</span>
            <UInput v-model.number="form.day_tolerance" type="number" min="0" max="15" size="sm" class="w-14" />
          </div>
        </UFormField>

        <UFormField label="Catégorie" class="col-span-2">
          <CategoryPicker v-model="form.category_id" class="w-full" />
        </UFormField>
      </div>

      <UCheckbox v-model="form.is_income" label="C'est un revenu" />

      <div class="flex justify-end gap-2 pt-1">
        <UButton size="sm" variant="ghost" color="neutral" @click="emit('update:open', false)">
          Annuler
        </UButton>
        <UButton
          size="sm"
          icon="i-lucide-repeat"
          :loading="create.isPending.value"
          :disabled="!form.label.trim()"
          @click="submit"
        >
          Créer la récurrence
        </UButton>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.popover-enter-active,
.popover-leave-active {
  transition: all 0.15s ease;
}
.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
