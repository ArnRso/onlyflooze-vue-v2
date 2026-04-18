import { useSupabase } from './useSupabase'
import { useAuthStore } from '@/stores/auth.store'

export function useAuth() {
  const { supabase } = useSupabase()
  const authStore = useAuthStore()

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    authStore.setSession(data.session)
    return data
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    authStore.setSession(null)
  }

  async function initAuth() {
    const { data } = await supabase.auth.getSession()
    authStore.setSession(data.session)

    supabase.auth.onAuthStateChange((_event, session) => {
      authStore.setSession(session)
    })
  }

  return { signIn, signUp, signOut, initAuth }
}
