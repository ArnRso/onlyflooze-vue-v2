import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  {
    auth: {
      persistSession: true,
      storageKey: 'onlyflooze-auth',
      detectSessionInUrl: false
    }
  }
)

export function useSupabase() {
  return { supabase }
}
