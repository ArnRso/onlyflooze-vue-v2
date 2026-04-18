<script setup lang="ts">
import { ref, computed } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useImport, type PreviewTransaction } from '@/composables/useImport'
import { useRouter } from 'vue-router'

const router = useRouter()
const accountId = ref<string | null>(null)
const { parseFile, preparePreview, importMutation } = useImport(accountId)

const previewing = ref(false)
const preparing = ref(false)
const transactions = ref<PreviewTransaction[]>([])
const error = ref<string | null>(null)

async function onFileDrop(event: DragEvent) {
  const file = event.dataTransfer?.files[0]
  if (file) await loadFile(file)
}

async function onFileInput(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) await loadFile(file)
}

async function loadFile(file: File) {
  error.value = null
  preparing.value = true
  try {
    const raw = await parseFile(file)
    const prepared = await preparePreview(raw)
    transactions.value = prepared
    previewing.value = true
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur lors du parsing'
  } finally {
    preparing.value = false
  }
}

async function confirmImport() {
  error.value = null
  try {
    await importMutation.mutateAsync(transactions.value)
    router.push('/transactions')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur lors de l\'import'
  }
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

const newCount = computed(() => transactions.value.filter(t => !t.is_duplicate).length)
const dupCount = computed(() => transactions.value.filter(t => t.is_duplicate).length)
</script>

<template>
  <AppLayout>
    <div class="space-y-6 max-w-4xl">
      <h1 class="text-xl font-semibold">Importer des transactions</h1>

      <!-- Zone de drop -->
      <div v-if="!previewing">
        <UAlert v-if="error" :description="error" color="error" class="mb-4" />
        <div
          class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
          @dragover.prevent
          @drop.prevent="onFileDrop"
          @click="($refs.fileInput as HTMLInputElement).click()"
        >
          <input ref="fileInput" type="file" accept=".ofx,.qfx" class="hidden" @change="onFileInput" />
          <UIcon name="i-lucide-upload-cloud" class="text-4xl text-gray-400 mb-3" />
          <p class="font-medium">Glissez un fichier OFX / QFX</p>
          <p class="text-sm text-gray-400 mt-1">ou cliquez pour sélectionner</p>
          <USkeleton v-if="preparing" class="h-4 w-32 mx-auto mt-4" />
        </div>
      </div>

      <!-- Prévisualisation -->
      <div v-else class="space-y-4">
        <div class="flex items-center gap-4">
          <UBadge color="success" :label="`${newCount} nouvelles`" />
          <UBadge v-if="dupCount > 0" color="neutral" :label="`${dupCount} doublons ignorés`" />
          <div class="ml-auto flex gap-2">
            <UButton variant="ghost" color="neutral" @click="previewing = false">Annuler</UButton>
            <UButton
              color="primary"
              :loading="importMutation.isPending.value"
              :disabled="newCount === 0"
              @click="confirmImport"
            >
              Importer {{ newCount }} transaction{{ newCount > 1 ? 's' : '' }}
            </UButton>
          </div>
        </div>

        <UAlert v-if="error" :description="error" color="error" />

        <UCard>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500">
                <th class="py-2 pr-3 font-medium">Date</th>
                <th class="py-2 pr-3 font-medium">Libellé</th>
                <th class="py-2 pr-3 font-medium">Tags</th>
                <th class="py-2 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="tx in transactions"
                :key="tx.external_id"
                class="border-b border-gray-100 dark:border-gray-800"
                :class="tx.is_duplicate ? 'opacity-40' : ''"
              >
                <td class="py-2 pr-3 text-gray-400">{{ tx.date }}</td>
                <td class="py-2 pr-3">{{ tx.label }}</td>
                <td class="py-2 pr-3">
                  <div class="flex gap-1 flex-wrap">
                    <UBadge v-if="tx.is_duplicate" size="xs" color="neutral" variant="soft" label="doublon" />
                    <UBadge v-if="tx.is_recurring" size="xs" color="info" variant="soft" :label="tx.recurring_pattern_label ?? 'récurrent'" />
                    <UBadge
                      v-if="tx.ml_category_score && tx.ml_category_score >= 0.5 && !tx.is_recurring"
                      size="xs"
                      color="warning"
                      variant="soft"
                      :label="`ML ${Math.round((tx.ml_category_score ?? 0) * 100)}%`"
                    />
                  </div>
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
    </div>
  </AppLayout>
</template>
