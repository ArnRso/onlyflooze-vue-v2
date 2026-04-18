import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User, Session } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)

  function setSession(s: Session | null) {
    session.value = s
    user.value = s?.user ?? null
  }

  return { user, session, setSession }
})
