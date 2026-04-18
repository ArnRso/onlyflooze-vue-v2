<script setup lang="ts">
import { computed } from 'vue'
import type { MonthlySummaryRow } from '@/types'

const props = defineProps<{
  rows: MonthlySummaryRow[]
  loading?: boolean
}>()

function pct(row: MonthlySummaryRow): number {
  if (!row.goal || row.goal === 0) return 0
  return Math.min(100, Math.round((Math.abs(row.total) / Math.abs(row.goal)) * 100))
}

function color(row: MonthlySummaryRow): 'error' | 'warning' | 'primary' {
  const p = pct(row)
  if (p >= 100) return 'error'
  if (p >= 80) return 'warning'
  return 'primary'
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="loading" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-14 w-full" />
    </div>
    <template v-else>
      <div
        v-for="row in rows"
        :key="row.category_id"
        class="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-sm">{{ row.category_name }}</span>
          <span class="text-sm text-gray-500">
            {{ formatEur(Math.abs(row.total)) }}
            <span v-if="row.goal">/ {{ formatEur(Math.abs(row.goal)) }}</span>
          </span>
        </div>
        <UProgress
          v-if="row.goal"
          :value="pct(row)"
          :color="color(row)"
          size="sm"
        />
        <p v-if="row.goal && row.goal !== 0" class="text-xs text-gray-400 mt-1">
          {{ pct(row) }}% —
          <span v-if="Math.abs(row.total) < Math.abs(row.goal)">
            {{ formatEur(Math.abs(row.goal) - Math.abs(row.total)) }} restant
          </span>
          <span v-else class="text-error-500">
            {{ formatEur(Math.abs(row.total) - Math.abs(row.goal)) }} dépassé
          </span>
        </p>
      </div>
      <p v-if="rows.length === 0" class="text-sm text-gray-400 text-center py-4">
        Aucune dépense ce mois-ci.
      </p>
    </template>
  </div>
</template>
