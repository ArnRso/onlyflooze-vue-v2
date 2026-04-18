<script setup lang="ts">
import { ref, computed } from 'vue'
import { startOfMonth, format, addMonths, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import AppLayout from '@/components/layout/AppLayout.vue'
import BudgetSummary from '@/components/budget/BudgetSummary.vue'
import MlSuggestionBanner from '@/components/ml/MlSuggestionBanner.vue'
import { useBudget } from '@/composables/useBudget'
import { useRecurring } from '@/composables/useRecurring'
import { useTransactions } from '@/composables/useTransactions'

const currentMonth = ref(startOfMonth(new Date()))

const budgetQuery = useBudget(currentMonth)
const { query: recurringQuery } = useRecurring()
const { query: txQuery } = useTransactions(currentMonth)

const monthLabel = computed(() =>
  format(currentMonth.value, 'MMMM yyyy', { locale: fr })
)

function prevMonth() { currentMonth.value = subMonths(currentMonth.value, 1) }
function nextMonth() { currentMonth.value = addMonths(currentMonth.value, 1) }

const totalExpenses = computed(() => {
  const txs = txQuery.data.value ?? []
  return txs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)
})

const totalIncome = computed(() => {
  const txs = txQuery.data.value ?? []
  return txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
})

const recurringStatus = computed(() => {
  const patterns = (recurringQuery.data.value ?? []).filter(p => p.is_active && p.frequency === 'monthly')
  const txs = txQuery.data.value ?? []
  return patterns.map(p => {
    const paid = txs.some(t => t.recurring_pattern_id === p.id)
    return { pattern: p, paid }
  })
})

function formatEur(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- En-tête mois -->
      <div class="flex items-center gap-3">
        <UButton icon="i-lucide-chevron-left" variant="ghost" color="neutral" @click="prevMonth" />
        <h1 class="text-xl font-semibold capitalize">{{ monthLabel }}</h1>
        <UButton icon="i-lucide-chevron-right" variant="ghost" color="neutral" @click="nextMonth" />
      </div>

      <!-- Suggestions ML -->
      <MlSuggestionBanner />

      <!-- Cartes résumé -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UCard>
          <div class="text-sm text-gray-500">Revenus</div>
          <div class="text-2xl font-bold text-success-600">{{ formatEur(totalIncome) }}</div>
        </UCard>
        <UCard>
          <div class="text-sm text-gray-500">Dépenses</div>
          <div class="text-2xl font-bold text-error-600">{{ formatEur(Math.abs(totalExpenses)) }}</div>
        </UCard>
        <UCard>
          <div class="text-sm text-gray-500">Solde</div>
          <div
            class="text-2xl font-bold"
            :class="totalIncome + totalExpenses >= 0 ? 'text-success-600' : 'text-error-600'"
          >
            {{ formatEur(totalIncome + totalExpenses) }}
          </div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Récurrents du mois -->
        <UCard>
          <template #header>
            <h2 class="font-semibold">Dépenses récurrentes</h2>
          </template>
          <div class="space-y-2">
            <div
              v-for="item in recurringStatus"
              :key="item.pattern.id"
              class="flex items-center justify-between py-1"
            >
              <div class="flex items-center gap-2">
                <UIcon
                  :name="item.paid ? 'i-lucide-check-circle-2' : 'i-lucide-clock'"
                  :class="item.paid ? 'text-success-500' : 'text-warning-500'"
                />
                <span class="text-sm">{{ item.pattern.label }}</span>
              </div>
              <span class="text-sm font-medium" :class="item.paid ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'">
                {{ item.pattern.expected_amount ? formatEur(Math.abs(item.pattern.expected_amount)) : '—' }}
              </span>
            </div>
            <p v-if="recurringStatus.length === 0" class="text-sm text-gray-400 text-center py-2">
              Aucun pattern récurrent. <RouterLink to="/recurring" class="text-primary underline">En créer un</RouterLink>
            </p>
          </div>
        </UCard>

        <!-- Budget par catégorie -->
        <UCard>
          <template #header>
            <h2 class="font-semibold">Budget par catégorie</h2>
          </template>
          <BudgetSummary
            :rows="budgetQuery.data.value ?? []"
            :loading="budgetQuery.isPending.value"
          />
        </UCard>
      </div>
    </div>
  </AppLayout>
</template>
