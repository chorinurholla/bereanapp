'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import Link from 'next/link'

// Clean SVG icons
const I = {
  devotion: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  chat:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  search:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  history:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>,
  journal:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  logout:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
}

const NAV = [
  { href: '/devotion',  icon: I.devotion, label: 'Devotion'  },
  { href: '/chat',      icon: I.chat,     label: 'Ask'       },
  { href: '/search',    icon: I.search,   label: 'Search'    },
  { href: '/history',   icon: I.history,  label: 'History'   },
  { href: '/journal',   icon: I.journal,  label: 'Journal'   },
  { href: '/settings',  icon: I.settings, label: 'Settings'  },
]

function Sidebar({ pathname }: { pathname: string }) {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const name = profile?.name || user?.email?.split('@')[0] || 'Account'
  const occ  = profile?.occupation || ''

  return (
    <aside style={{
      width: '240px', flexShrink: 0,
      background: 'var(--parchment)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      height: '100%',
    }}>
      {/* Logo area */}
      <div style={{
        padding: '28px 24px 24px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '20px',
          fontWeight: 500,
          letterSpacing: '0.2em',
          color: 'var(--gold)',
          marginBottom: '6px',
        }}>BEREAN</div>
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.58rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontWeight: 500,
          color: 'var(--ink-mute)',
        }}>Biblical Principles Corpus</div>
        <div style={{
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '16px',
        }}>
          {[['66', 'Books'], ['960', 'Chapters'], ['5,956', 'Principles']].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '13px', color: 'var(--gold)', fontWeight: 500 }}>{n}</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mute)', marginTop: '1px' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        <div style={{ padding: '8px 24px 4px', fontFamily: 'Inter, sans-serif', fontSize: '0.55rem',
          letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--ink-ghost)', marginBottom: '4px' }}>
          Navigate
        </div>
        {NAV.map(({ href, icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} className={'nav-item' + (active ? ' active' : '')}>
              <span style={{ flexShrink: 0 }}>{icon}</span>
              <span>{label}</span>
              {active && (
                <span style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%',
                  background: 'var(--gold)', flexShrink: 0 }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--border)',
        background: 'var(--parchment2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'var(--gold-dim2)', border: '1.5px solid var(--border2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', fontWeight: 600,
            color: 'var(--gold)', flexShrink: 0,
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 500,
              color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </div>
            {occ && (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: 'var(--ink-mute)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {occ}
              </div>
            )}
          </div>
        </div>
        <button onClick={async () => { await signOut(); router.replace('/login') }}
          className="btn-ghost"
          style={{ padding: '6px 0', fontSize: '0.6rem', color: 'var(--ink-mute)', width: '100%',
            justifyContent: 'flex-start' }}>
          {I.logout}
          Sign out
        </button>
      </div>
    </aside>
  )
}

function MobileHeader({ pathname }: { pathname: string }) {
  const label = NAV.find(n => pathname.startsWith(n.href))?.label || 'Berean'
  return (
    <header style={{
      height: '52px', flexShrink: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 20px',
      background: 'var(--parchment)',
      borderBottom: '1px solid var(--border)',
      boxShadow: '0 1px 8px var(--shadow)',
    }}>
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '16px',
        letterSpacing: '0.18em', color: 'var(--gold)', fontWeight: 500 }}>BEREAN</span>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem',
        letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 500 }}>
        {label}
      </span>
    </header>
  )
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex',
      background: 'var(--parchment)', borderTop: '1px solid var(--border)',
      zIndex: 10, boxShadow: '0 -2px 12px var(--shadow)',
    }}>
      {NAV.slice(0, 5).map(({ href, icon, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link key={href} href={href} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '3px', padding: '10px 4px',
            textDecoration: 'none',
            color: active ? 'var(--gold)' : 'var(--ink-mute)',
            background: active ? 'var(--gold-dim)' : 'transparent',
            borderTop: active ? '2px solid var(--gold2)' : '2px solid transparent',
          }}>
            <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.5rem',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: active ? 600 : 400 }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--cream)', flexDirection: 'column', gap: '20px' }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '24px',
          letterSpacing: '0.25em', color: 'var(--gold)', fontWeight: 500 }}>BEREAN</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%',
              background: 'var(--gold-light)',
              animation: `thinking 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <style>{`
        .berean-desktop { display: none  !important; }
        .berean-mobile  { display: flex  !important; }
        @media (min-width: 768px) {
          .berean-desktop { display: flex !important; }
          .berean-mobile  { display: none !important; }
        }
      `}</style>

      {/* DESKTOP */}
      <div className="berean-desktop" style={{
        height: '100vh', overflow: 'hidden', flexDirection: 'row',
        background: 'var(--cream)',
      }}>
        <Sidebar pathname={pathname} />
        <main style={{
          flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          background: 'var(--cream)',
        }}>
          {children}
        </main>
      </div>

      {/* MOBILE */}
      <div className="berean-mobile" style={{
        flexDirection: 'column', height: '100vh', overflow: 'hidden',
        background: 'var(--cream)',
      }}>
        <MobileHeader pathname={pathname} />
        <main style={{ flex: 1, overflow: 'hidden', paddingBottom: '60px' }}>
          {children}
        </main>
        <MobileNav pathname={pathname} />
      </div>
    </>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  )
}
