'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, User, ChevronDown } from 'lucide-react'

export default function TopBar() {
  const { user, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  const name = profile?.name || user?.email?.split('@')[0] || 'Account'

  const handleSignOut = async () => {
    await signOut()
    router.replace('/login')
  }

  return (
    <header className="flex items-center gap-3 px-4 h-12 flex-shrink-0 relative z-20"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>

      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm tracking-[0.22em]"
              style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif" }}>
          BEREAN
        </span>
        <span className="hidden sm:block font-mono text-[0.5rem] tracking-[0.15em] uppercase"
              style={{ color: 'var(--text-mute)' }}>
          · Biblical Principles Corpus
        </span>
      </div>

      <div className="flex-1" />

      {/* Sync indicator */}
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
           style={{ background: 'var(--green)', boxShadow: '0 0 4px rgba(74,222,128,0.5)' }}
           title="Synced" />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[0.6rem] tracking-[0.12em] uppercase transition-all cursor-pointer"
          style={{
            border: '1px solid var(--border2)',
            background: 'transparent',
            color: 'var(--text-mute)',
            borderRadius: 0,
          }}
        >
          <User size={11} />
          <span className="hidden sm:block max-w-[100px] truncate">{name}</span>
          <ChevronDown size={10} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px]"
                 style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}>
              <div className="px-3 py-2 font-mono text-[0.6rem] tracking-[0.1em]"
                   style={{ color: 'var(--gold)', borderBottom: '1px solid var(--border)' }}>
                {profile?.email || user?.email}
              </div>
              <button
                onClick={() => { setMenuOpen(false); router.push('/settings') }}
                className="flex items-center gap-2 w-full px-3 py-2.5 font-mono text-[0.6rem] tracking-[0.12em] uppercase transition-colors cursor-pointer text-left"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)' }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
                onMouseOut={e  => (e.currentTarget.style.color = 'var(--text-dim)')}
              >
                <Settings size={11} /> Settings
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-3 py-2.5 font-mono text-[0.6rem] tracking-[0.12em] uppercase transition-colors cursor-pointer text-left"
                style={{ background: 'transparent', border: 'none', color: 'rgba(248,113,113,0.7)' }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--red)')}
                onMouseOut={e  => (e.currentTarget.style.color = 'rgba(248,113,113,0.7)')}
              >
                <LogOut size={11} /> Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
