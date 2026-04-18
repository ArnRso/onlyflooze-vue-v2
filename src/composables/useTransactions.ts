import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { startOfMonth, endOfMonth, formatISO } from 'date-fns'
import type { Ref } from 'vue'
import { useSupabase } from './useSupabase'
import type { Transaction } from '@/types'

export function useTransactions(month: Ref<Date>) {
  const { supabase } = useSupabase()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['transactions', month],
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(*), recurring_pattern:recurring_patterns(*), account:accounts(*)')
        .gte('date', formatISO(startOfMonth(month.value), { representation: 'date' }))
        .lte('date', formatISO(endOfMonth(month.value), { representation: 'date' }))
        .eq('is_ignored', false)
        .order('date', { ascending: false })
      if (error) throw error
      return data as Transaction[]
    }
  })

  const updateCategory = useMutation({
    mutationFn: async ({ id, categoryId }: { id: string; categoryId: string | null }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ category_id: categoryId })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, categoryId }) => {
      await qc.cancelQueries({ queryKey: ['transactions', month] })
      const prev = qc.getQueryData<Transaction[]>(['transactions', month])
      qc.setQueryData<Transaction[]>(['transactions', month], old =>
        old?.map(t => t.id === id ? { ...t, category_id: categoryId } : t) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(['transactions', month], ctx?.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['transactions', month] })
  })

  const updateNote = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ note })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, note }) => {
      await qc.cancelQueries({ queryKey: ['transactions', month] })
      const prev = qc.getQueryData<Transaction[]>(['transactions', month])
      qc.setQueryData<Transaction[]>(['transactions', month], old =>
        old?.map(t => t.id === id ? { ...t, note } : t) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(['transactions', month], ctx?.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['transactions', month] })
  })

  return { query, updateCategory, updateNote }
}
