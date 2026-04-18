import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useSupabase } from './useSupabase'
import { useAuthStore } from '@/stores/auth.store'
import type { RecurringPattern } from '@/types'

type NewPattern = Omit<RecurringPattern, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'category'>

export function useRecurring() {
  const { supabase } = useSupabase()
  const authStore = useAuthStore()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['recurring'],
    queryFn: async (): Promise<RecurringPattern[]> => {
      const { data, error } = await supabase
        .from('recurring_patterns')
        .select('*, category:categories(*)')
        .order('label')
      if (error) throw error
      return data as RecurringPattern[]
    },
    staleTime: 2 * 60 * 1000
  })

  const create = useMutation({
    mutationFn: async (payload: NewPattern) => {
      const { data, error } = await supabase
        .from('recurring_patterns')
        .insert({ ...payload, user_id: authStore.user!.id })
        .select('*, category:categories(*)')
        .single()
      if (error) throw error
      return data as RecurringPattern
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['recurring'] })
      const prev = qc.getQueryData<RecurringPattern[]>(['recurring'])
      const optimistic: RecurringPattern = {
        id: `temp-${Date.now()}`,
        user_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...payload
      }
      qc.setQueryData<RecurringPattern[]>(['recurring'], old => [...(old ?? []), optimistic])
      return { prev }
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(['recurring'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['recurring'] })
  })

  const update = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<NewPattern> & { id: string }) => {
      const { error } = await supabase
        .from('recurring_patterns')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, ...payload }) => {
      await qc.cancelQueries({ queryKey: ['recurring'] })
      const prev = qc.getQueryData<RecurringPattern[]>(['recurring'])
      qc.setQueryData<RecurringPattern[]>(['recurring'], old =>
        old?.map(p => p.id === id ? { ...p, ...payload } : p) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(['recurring'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['recurring'] })
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_patterns').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['recurring'] })
      const prev = qc.getQueryData<RecurringPattern[]>(['recurring'])
      qc.setQueryData<RecurringPattern[]>(['recurring'], old => old?.filter(p => p.id !== id) ?? [])
      return { prev }
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(['recurring'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['recurring'] })
  })

  return { query, create, update, remove }
}
