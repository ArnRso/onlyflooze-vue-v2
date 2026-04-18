<script setup lang="ts">
import { ref, computed } from 'vue'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import AppLayout from '@/components/layout/AppLayout.vue'
import CategoryPicker from '@/components/categories/CategoryPicker.vue'
import RecurrencePopover from '@/components/recurring/RecurrencePopover.vue'
import MlSuggestionBanner from '@/components/ml/MlSuggestionBanner.vue'
import { useReview } from '@/composables/useReview'
import { useRecurring } from '@/composables/useRecurring'
import { useQueryClient } from '@tanstack/vue-query'
import type { Transaction } from '@/types'

const { query, ignore, setCategory, markRecurring } = useReview()
const { query: recurringQuery } = useRecurring()
const qc = useQueryClient()

// ID de la transaction dont le popover de récurrence est ouvert
const openPopoverId = ref<string | null>(null)

function togglePopover(id: string) {
  openPopoverId.value = openPopoverId.value === id ? null : id
}

async function onCategoryChange(tx: Transaction, categoryId: string | null) {
  if (!categoryId) return
  await setCategory.mutateAsync({ id: tx.id, categoryId })
}

async function onRecurrenceCreated(tx: Transaction) {
  // Récupérer le pattern nouvellement créé (le plus récent)
  await qc.invalidateQueries({ queryKey: ['recurring'] })
  const patterns = recurringQuery.data.value ?? []
  // Trouver le dernier pattern créé (par label correspondant)
  const { normalizeLabel } = await import('@/utils/labelNormalizer')
  const txNorm = normalizeLabel(tx.label)
  const match = patterns.find(p =>
    txNorm.includes((p.label_pattern ?? p.label).toUpperCase())
  )
  if (match) {
    await markRecurring.mutateAsync({ id: tx.id, patternId: match.id })
  } else {
    // Retirer quand même de la liste en invalidant
    await qc.invalidateQueries({ queryKey: ['review'] })
  }
  openPopoverId.value = null
}

function formatDate(date: string) {
  return format(new Date(date), 'd MMM', { locale: fr })
}

function formatEur(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

const count = computed(() => query.data.value?.length ?? 0)
</script>

<template>
  <AppLayout>
    <div class="max-w-2xl space-y-4">

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold">À traiter</h1>
          <p class="text-sm text-gray-400 mt-0.5">
            <template v-if="count > 0">
              {{ count }} transaction{{ count > 1 ? 's' : '' }} en attente de classification
            </template>
            <template v-else>Tout est traité 🎉</template>
          </p>
        </div>
      </div>

      <!-- Suggestions de nouveaux patterns détectés à l'import -->
      <MlSuggestionBanner />

      <!-- État de chargement -->
      <div v-if="query.isPending.value" class="space-y-3">
        <USkeleton v-for="i in 5" :key="i" class="h-20 w-full" />
      </div>

      <!-- Liste vide -->
      <UCard v-else-if="count === 0" class="text-center py-12">
        <UIcon name="i-lucide-check-circle-2" class="text-5xl text-success-500 mb-3" />
        <p class="font-medium">Toutes vos transactions sont classifiées !</p>
        <p class="text-sm text-gray-400 mt-1">
          Importez un nouveau fichier pour continuer.
        </p>
        <UButton to="/import" class="mt-4" icon="i-lucide-upload" label="Importer" />
      </UCard>

      <!-- Transactions à traiter -->
      <div v-else class="space-y-2">
        <div
          v-for="tx in query.data.value"
          :key="tx.id"
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 transition-opacity"
          :class="{ 'opacity-50': ignore.isPending.value || setCategory.isPending.value }"
        >
          <!-- Ligne principale -->
          <div class="flex items-start gap-3">
            <!-- Date -->
            <span class="text-xs text-gray-400 w-12 shrink-0 pt-0.5">
              {{ formatDate(tx.date) }}
            </span>

            <!-- Libellé -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ tx.label }}</p>
              <p v-if="tx.label_normalized && tx.label_normalized !== tx.label.toUpperCase()" class="text-xs text-gray-400 truncate">
                {{ tx.label_normalized }}
              </p>
            </div>

            <!-- Montant -->
            <span
              class="text-sm font-mono font-semibold shrink-0"
              :class="tx.amount >= 0 ? 'text-success-600' : 'text-error-600'"
            >
              {{ formatEur(tx.amount) }}
            </span>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 mt-3 flex-wrap">
            <!-- CategoryPicker avec option + Créer -->
            <div class="flex-1 min-w-36">
              <CategoryPicker
                :model-value="null"
                @update:model-value="onCategoryChange(tx, $event)"
              />
            </div>

            <!-- Bouton récurrence -->
            <UButton
              size="sm"
              variant="outline"
              color="info"
              icon="i-lucide-repeat"
              :label="openPopoverId === tx.id ? 'Fermer' : '+ Récurrence'"
              @click="togglePopover(tx.id)"
            />

            <!-- Ignorer -->
            <UButton
              size="sm"
              variant="ghost"
              color="neutral"
              icon="i-lucide-eye-off"
              label="Ignorer"
              :loading="ignore.isPending.value"
              @click="ignore.mutate(tx.id)"
            />
          </div>

          <!-- Popover récurrence inline -->
          <RecurrencePopover
            :transaction="tx"
            :open="openPopoverId === tx.id"
            @update:open="openPopoverId = $event ? tx.id : null"
            @created="onRecurrenceCreated(tx)"
          />
        </div>
      </div>
    </div>
  </AppLayout>
</template>
