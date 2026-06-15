'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { syncFromCloud, wipeStaleData, keys } from '@/lib/sync'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/lib/supabase'

interface AuthContextType {
  user:    User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, loading: true,
  signOut: async () => {}, refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await sb
      .from('user_profiles')
      .select('*')
      .eq('id', uid)
      .single()
    if (data) setProfile(data as UserProfile)
  }, [sb])

  const handleSignIn = useCallback(async (u: User) => {
    setUser(u)
    wipeStaleData(u.id)
    await loadProfile(u.id)
    await syncFromCloud(u.id)
    setLoading(false)
  }, [loadProfile])

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleSignIn(session.user)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleSignIn(session.user)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    if (user) {
      const k = keys(user.id)
      ;[k.tracker, k.history, k.journal, k.devcount].forEach(key =>
        localStorage.removeItem(key)
      )
    }
    await sb.auth.signOut()
  }

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
