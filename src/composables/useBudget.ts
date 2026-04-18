import { useQuery } from '@tanstack/vue-query'
import { formatISO } from 'date-fns'
import type { Ref } from 'vue'
import { useSupabase } from './useSupabase'
import type { MonthlySummaryRow } from '@/types'

export function useBudget(month: Ref<Date>) {
  const { supabase } = useSupabase()

  return useQuery({
    queryKey: ['budget', month],
    queryFn: async (): Promise<MonthlySummaryRow[]> => {
      const { data, error } = await supabase.rpc('monthly_summary', {
        target_month: formatISO(month.value, { representation: 'date' })
      })
      if (error) throw error
      return data as MonthlySummaryRow[]
    }
  })
}
