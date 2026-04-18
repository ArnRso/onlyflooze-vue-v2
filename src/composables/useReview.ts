import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useSupabase } from './useSupabase'
import { useAuthStore } from '@/stores/auth.store'
import type { Transaction } from '@/types'

export function useReview() {
  const { supabase } = useSupabase()
  const authStore = useAuthStore()
  const qc = useQueryClient()

  // Toutes les transactions sans catégorie ET sans pattern récurrent, non ignorées
  const query = useQuery({
    queryKey: ['review'],
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(*), recurring_pattern:recurring_patterns(*)')
        .is('category_id', null)
        .is('recurring_pattern_id', null)
        .eq('is_ignored', false)
        .eq('is_recurring', false)
        .order('date', { ascending: false })
      if (error) throw error
      return data as Transaction[]
    }
  })

  const ignore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .update({ is_ignored: true })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['review'] })
      const prev = qc.getQueryData<Transaction[]>(['review'])
      qc.setQueryData<Transaction[]>(['review'], old => old?.filter(t => t.id !== id) ?? [])
      return { prev }
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(['review'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['review'] })
  })

  const setCategory = useMutation({
    mutationFn: async ({ id, categoryId }: { id: string; categoryId: string }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ category_id: categoryId })
        .eq('id', id)
      if (error) throw error

      // Enregistrer dans ml_training_data
      const tx = query.data.value?.find(t => t.id === id)
      if (tx?.label_normalized) {
        await supabase.from('ml_training_data').upsert(
          {
            user_id: authStore.user!.id,
            label_normalized: tx.label_normalized,
            category_id: categoryId
          },
          { onConflict: 'user_id,label_normalized' }
        )
      }
    },
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['review'] })
      const prev = qc.getQueryData<Transaction[]>(['review'])
      // Retire immédiatement de la liste (la tx est traitée)
      qc.setQueryData<Transaction[]>(['review'], old => old?.filter(t => t.id !== id) ?? [])
      return { prev }
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(['review'], ctx?.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['review'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    }
  })

  const markRecurring = useMutation({
    mutationFn: async ({ id, patternId }: { id: string; patternId: string }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ recurring_pattern_id: patternId, is_recurring: true })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['review'] })
      const prev = qc.getQueryData<Transaction[]>(['review'])
      qc.setQueryData<Transaction[]>(['review'], old => old?.filter(t => t.id !== id) ?? [])
      return { prev }
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(['review'], ctx?.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['review'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    }
  })

  return { query, ignore, setCategory, markRecurring }
}
