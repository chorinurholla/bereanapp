'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import BottomNav from '@/components/berean/BottomNav'
import TopBar from '@/components/berean/TopBar'

function AppGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="text-2xl tracking-[0.25em]"
               style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif" }}>
            BEREAN
          </div>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full"
                   style={{
                     background: 'var(--gold)',
                     animation: `thinking 1.2s ease-in-out ${i*0.2}s infinite`,
                   }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex flex-col h-screen overflow-hidden"
         style={{ background: 'var(--bg)' }}>
      <TopBar />
      <main className="flex-1 overflow-hidden pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav currentPath={pathname} />
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppGuard>{children}</AppGuard>
    </AuthProvider>
  )
}
