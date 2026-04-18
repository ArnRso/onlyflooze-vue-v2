import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { ref, type Ref } from 'vue'
import { useSupabase } from './useSupabase'
import { useAuthStore } from '@/stores/auth.store'
import { parseOFX } from '@/utils/ofxParser'
import { normalizeLabel } from '@/utils/labelNormalizer'
import { matchRecurringPattern, detectNewPatterns } from '@/utils/recurringDetector'
import { predictCategory, AUTO_ASSIGN_THRESHOLD, SUGGEST_THRESHOLD } from '@/utils/mlCategorizer'
import type { RawTransaction, Transaction, MlTrainingData } from '@/types'

export interface PreviewTransaction extends RawTransaction {
  label_normalized: string
  recurring_pattern_id: string | null
  recurring_pattern_label: string | null
  is_recurring: boolean
  category_id: string | null
  ml_category_score: number | null
  is_duplicate: boolean
}

export function useImport(accountId: Ref<string | null>) {
  const { supabase } = useSupabase()
  const authStore = useAuthStore()
  const qc = useQueryClient()
  const preview = ref<PreviewTransaction[]>([])

  async function parseFile(file: File): Promise<RawTransaction[]> {
    const content = await file.text()
    return parseOFX(content)
  }

  async function preparePreview(rawTxs: RawTransaction[]): Promise<PreviewTransaction[]> {
    const [{ data: patterns }, { data: trainingData }, { data: existingIds }] = await Promise.all([
      supabase.from('recurring_patterns').select('*').eq('is_active', true),
      supabase.from('ml_training_data').select('*'),
      supabase
        .from('transactions')
        .select('external_id')
        .in('external_id', rawTxs.map(t => t.external_id))
    ])

    const duplicateIds = new Set((existingIds ?? []).map(r => r.external_id))

    return rawTxs.map(tx => {
      const normalized = normalizeLabel(tx.label)
      const match = matchRecurringPattern(tx, patterns ?? [])
      const prediction = predictCategory(tx.label, (trainingData ?? []) as MlTrainingData[])

      return {
        ...tx,
        label_normalized: normalized,
        recurring_pattern_id: match?.pattern.id ?? null,
        recurring_pattern_label: match?.pattern.label ?? null,
        is_recurring: !!match,
        category_id: prediction && prediction.confidence >= SUGGEST_THRESHOLD
          ? prediction.category_id
          : null,
        ml_category_score: prediction?.confidence ?? null,
        is_duplicate: duplicateIds.has(tx.external_id)
      }
    })
  }

  const importMutation = useMutation({
    mutationFn: async (txs: PreviewTransaction[]) => {
      if (!authStore.user) throw new Error('Non authentifié')

      const toInsert = txs
        .filter(t => !t.is_duplicate)
        .map(t => ({
          account_id: accountId.value,
          external_id: t.external_id,
          date: t.date,
          amount: t.amount,
          label: t.label,
          label_normalized: t.label_normalized,
          category_id: t.ml_category_score && t.ml_category_score >= AUTO_ASSIGN_THRESHOLD
            ? t.category_id
            : null,
          recurring_pattern_id: t.recurring_pattern_id,
          is_recurring: t.is_recurring,
          ml_category_score: t.ml_category_score
        }))

      if (toInsert.length === 0) return []

      const { data, error } = await supabase
        .from('transactions')
        .upsert(toInsert, { onConflict: 'user_id,account_id,external_id' })
        .select()
      if (error) throw error

      return data as Transaction[]
    },
    onSuccess: async (insertedTxs) => {
      qc.invalidateQueries({ queryKey: ['transactions'] })

      // Passe 2 : détection de nouveaux patterns en arrière-plan
      const { data: allTxs } = await supabase
        .from('transactions')
        .select('*')
        .eq('is_recurring', false)
        .eq('is_ignored', false)

      if (allTxs) {
        const suggestions = detectNewPatterns(allTxs as Transaction[])
        qc.setQueryData(['recurring-suggestions'], suggestions)
      }
    }
  })

  return { preview, parseFile, preparePreview, importMutation }
}
