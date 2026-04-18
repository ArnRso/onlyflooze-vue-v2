import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useSupabase } from './useSupabase'
import { useAuthStore } from '@/stores/auth.store'
import type { Category } from '@/types'

export function useCategories() {
  const { supabase } = useSupabase()
  const authStore = useAuthStore()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000
  })

  const create = useMutation({
    mutationFn: async (payload: Omit<Category, 'id' | 'user_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...payload, user_id: authStore.user!.id })
        .select()
        .single()
      if (error) throw error
      return data as Category
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['categories'] })
      const prev = qc.getQueryData<Category[]>(['categories'])
      const optimistic: Category = {
        id: `temp-${Date.now()}`,
        user_id: '',
        created_at: new Date().toISOString(),
        ...payload
      }
      qc.setQueryData<Category[]>(['categories'], old => [...(old ?? []), optimistic])
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(['categories'], ctx?.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] })
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['categories'] })
      const prev = qc.getQueryData<Category[]>(['categories'])
      qc.setQueryData<Category[]>(['categories'], old => old?.filter(c => c.id !== id) ?? [])
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(['categories'], ctx?.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] })
  })

  return { query, create, remove }
}
