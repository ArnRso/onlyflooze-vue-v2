<script setup lang="ts">
import { ref, computed } from 'vue'
import { startOfMonth, format, subMonths, addMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import AppLayout from '@/components/layout/AppLayout.vue'
import CategoryPicker from '@/components/categories/CategoryPicker.vue'
import { useTransactions } from '@/composables/useTransactions'
import { useSupabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/stores/auth.store'
import { predictCategory, SUGGEST_THRESHOLD } from '@/utils/mlCategorizer'
import type { Transaction, MlTrainingData } from '@/types'

const currentMonth = ref(startOfMonth(new Date()))
const { query, updateCategory } = useTransactions(currentMonth)
const { supabase } = useSupabase()
const authStore = useAuthStore()

const monthLabel = computed(() =>
  format(currentMonth.value, 'MMMM yyyy', { locale: fr })
)

function prevMonth() { currentMonth.value = subMonths(currentMonth.value, 1) }
function nextMonth() { currentMonth.value = addMonths(currentMonth.value, 1) }

async function onCategoryChange(tx: Transaction, categoryId: string | null) {
  await updateCategory.mutateAsync({ id: tx.id, categoryId })

  // Enregistrer dans ml_training_data si catégorie choisie manuellement
  if (categoryId && tx.label_normalized) {
    await supabase.from('ml_training_data').upsert(
      {
        user_id: authStore.user!.id,
        label_normalized: tx.label_normalized,
        category_id: categoryId
      },
      { onConflict: 'user_id,label_normalized' }
    )
  }
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(date))
}
</script>

<template>
  <AppLayout>
    <div class="space-y-4">
      <!-- Navigation mois -->
      <div class="flex items-center gap-3">
        <UButton icon="i-lucide-chevron-left" variant="ghost" color="neutral" @click="prevMonth" />
        <h1 class="text-xl font-semibold capitalize">{{ monthLabel }}</h1>
        <UButton icon="i-lucide-chevron-right" variant="ghost" color="neutral" @click="nextMonth" />
        <div class="ml-auto">
          <UButton to="/import" icon="i-lucide-upload" label="Importer" size="sm" />
        </div>
      </div>

      <!-- Liste transactions -->
      <UCard>
        <div v-if="query.isPending.value" class="space-y-3 p-2">
          <USkeleton v-for="i in 8" :key="i" class="h-10 w-full" />
        </div>

        <div v-else-if="!query.data.value?.length" class="text-center py-10 text-gray-400">
          <UIcon name="i-lucide-receipt" class="text-4xl mb-2" />
          <p>Aucune transaction ce mois-ci.</p>
          <UButton to="/import" class="mt-3" size="sm" label="Importer un fichier" />
        </div>

        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500">
              <th class="py-2 pr-3 font-medium">Date</th>
              <th class="py-2 pr-3 font-medium">Libellé</th>
              <th class="py-2 pr-3 font-medium">Catégorie</th>
              <th class="py-2 text-right font-medium">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="tx in query.data.value"
              :key="tx.id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <td class="py-2 pr-3 text-gray-400 whitespace-nowrap">{{ formatDate(tx.date) }}</td>
              <td class="py-2 pr-3">
                <div class="flex items-center gap-2">
                  <span>{{ tx.label }}</span>
                  <UBadge v-if="tx.is_recurring" size="xs" color="info" variant="soft" label="récurrent" />
                  <UBadge
                    v-if="tx.ml_category_score && tx.ml_category_score >= SUGGEST_THRESHOLD && !tx.is_recurring"
                    size="xs"
                    color="warning"
                    variant="soft"
                    label="ML"
                  />
                </div>
              </td>
              <td class="py-2 pr-3 w-44">
                <CategoryPicker
                  :model-value="tx.category_id"
                  :loading="updateCategory.isPending.value"
                  @update:model-value="onCategoryChange(tx, $event)"
                />
              </td>
              <td
                class="py-2 text-right font-mono font-medium"
                :class="tx.amount >= 0 ? 'text-success-600' : 'text-error-600'"
              >
                {{ formatEur(tx.amount) }}
              </td>
            </tr>
          </tbody>
        </table>
      </UCard>
    </div>
  </AppLayout>
</template>
