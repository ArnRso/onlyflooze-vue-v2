<script setup lang="ts">
import { ref } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import CategoryPicker from '@/components/categories/CategoryPicker.vue'
import { useRecurring } from '@/composables/useRecurring'
import type { RecurringPattern, RecurringFrequency, MonthEndBehavior } from '@/types'

const { query, create, update, remove } = useRecurring()

const modalOpen = ref(false)
const editing = ref<RecurringPattern | null>(null)

const form = ref({
  label: '',
  label_pattern: '',
  expected_amount: 0,
  amount_tolerance: 0.2,
  frequency: 'monthly' as RecurringFrequency,
  day_of_month: 1,
  day_tolerance: 3,
  month_end_behavior: 'last_or_first' as MonthEndBehavior,
  is_income: false,
  is_active: true,
  category_id: null as string | null
})

function openCreate() {
  editing.value = null
  form.value = {
    label: '', label_pattern: '', expected_amount: 0, amount_tolerance: 0.2,
    frequency: 'monthly', day_of_month: 1, day_tolerance: 3,
    month_end_behavior: 'last_or_first', is_income: false, is_active: true, category_id: null
  }
  modalOpen.value = true
}

function openEdit(pattern: RecurringPattern) {
  editing.value = pattern
  form.value = {
    label: pattern.label,
    label_pattern: pattern.label_pattern ?? '',
    expected_amount: pattern.expected_amount ?? 0,
    amount_tolerance: pattern.amount_tolerance,
    frequency: pattern.frequency,
    day_of_month: pattern.day_of_month ?? 1,
    day_tolerance: pattern.day_tolerance,
    month_end_behavior: pattern.month_end_behavior,
    is_income: pattern.is_income,
    is_active: pattern.is_active,
    category_id: pattern.category_id
  }
  modalOpen.value = true
}

async function save() {
  const payload = {
    ...form.value,
    label_pattern: form.value.label_pattern || null
  }
  if (editing.value) {
    await update.mutateAsync({ id: editing.value.id, ...payload })
  } else {
    await create.mutateAsync(payload)
  }
  modalOpen.value = false
}

function formatEur(amount: number | null): string {
  if (amount === null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

const freqLabel: Record<string, string> = {
  monthly: 'Mensuel', quarterly: 'Trimestriel', annual: 'Annuel', weekly: 'Hebdo'
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6 max-w-3xl">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold">Dépenses récurrentes</h1>
        <UButton icon="i-lucide-plus" label="Nouveau pattern" @click="openCreate" />
      </div>

      <div v-if="query.isPending.value" class="space-y-2">
        <USkeleton v-for="i in 4" :key="i" class="h-16 w-full" />
      </div>

      <div v-else class="space-y-2">
        <UCard
          v-for="p in query.data.value"
          :key="p.id"
          class="cursor-pointer hover:border-primary transition-colors"
          @click="openEdit(p)"
        >
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ p.label }}</span>
                <UBadge :color="p.is_income ? 'success' : 'error'" variant="soft" size="xs" :label="p.is_income ? 'Revenu' : 'Dépense'" />
                <UBadge color="neutral" variant="soft" size="xs" :label="freqLabel[p.frequency]" />
                <UBadge v-if="!p.is_active" color="neutral" variant="soft" size="xs" label="inactif" />
              </div>
              <p class="text-xs text-gray-400">
                Jour {{ p.day_of_month }} ± {{ p.day_tolerance }}j · ±{{ Math.round(p.amount_tolerance * 100) }}%
              </p>
            </div>
            <div class="text-right">
              <span class="font-semibold" :class="p.is_income ? 'text-success-600' : 'text-error-600'">
                {{ formatEur(p.expected_amount) }}
              </span>
              <p v-if="p.category" class="text-xs text-gray-400">{{ p.category.name }}</p>
            </div>
          </div>
        </UCard>

        <p v-if="!query.data.value?.length" class="text-center text-gray-400 py-8">
          Aucun pattern récurrent. Créez-en un ou importez des transactions pour que la détection automatique propose des suggestions.
        </p>
      </div>
    </div>

    <!-- Modal édition -->
    <UModal v-model:open="modalOpen" :title="editing ? 'Modifier le pattern' : 'Nouveau pattern récurrent'">
      <template #body>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Libellé" class="col-span-2">
              <UInput v-model="form.label" placeholder="EDF, Salaire, Loyer..." class="w-full" />
            </UFormField>
            <UFormField label="Pattern de matching (optionnel)" class="col-span-2">
              <UInput v-model="form.label_pattern" placeholder="Fragment ou regex" class="w-full" />
            </UFormField>
            <UFormField label="Montant attendu">
              <UInput v-model.number="form.expected_amount" type="number" step="0.01" class="w-full" />
            </UFormField>
            <UFormField label="Tolérance montant (%)">
              <UInput v-model.number="form.amount_tolerance" type="number" step="0.05" min="0" max="1" class="w-full" />
            </UFormField>
            <UFormField label="Fréquence">
              <USelect
                v-model="form.frequency"
                :options="[
                  { label: 'Mensuel', value: 'monthly' },
                  { label: 'Trimestriel', value: 'quarterly' },
                  { label: 'Annuel', value: 'annual' },
                  { label: 'Hebdomadaire', value: 'weekly' }
                ]"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Jour du mois">
              <UInput v-model.number="form.day_of_month" type="number" min="1" max="31" class="w-full" />
            </UFormField>
            <UFormField label="Tolérance jours">
              <UInput v-model.number="form.day_tolerance" type="number" min="0" max="10" class="w-full" />
            </UFormField>
            <UFormField label="Catégorie">
              <CategoryPicker v-model="form.category_id" class="w-full" />
            </UFormField>
          </div>
          <div class="flex gap-4">
            <UCheckbox v-model="form.is_income" label="C'est un revenu" />
            <UCheckbox v-model="form.is_active" label="Actif" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-between w-full">
          <UButton
            v-if="editing"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            label="Supprimer"
            :loading="remove.isPending.value"
            @click="remove.mutate(editing!.id); modalOpen = false"
          />
          <div class="flex gap-2 ml-auto">
            <UButton variant="ghost" color="neutral" @click="modalOpen = false">Annuler</UButton>
            <UButton :loading="create.isPending.value || update.isPending.value" @click="save">
              {{ editing ? 'Enregistrer' : 'Créer' }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </AppLayout>
</template>
