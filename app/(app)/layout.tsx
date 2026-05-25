'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import Link from 'next/link'

const BookIcon    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
const MsgIcon     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
const SearchIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
const ClockIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const WriteIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
const GearIcon    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
const OutIcon     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>

const NAV = [
  { href: '/devotion', Icon: BookIcon,   label: 'Devotion'  },
  { href: '/chat',     Icon: MsgIcon,    label: 'Ask'       },
  { href: '/search',   Icon: SearchIcon, label: 'Search'    },
  { href: '/history',  Icon: ClockIcon,  label: 'History'   },
  { href: '/journal',  Icon: WriteIcon,  label: 'Journal'   },
  { href: '/settings', Icon: GearIcon,   label: 'Settings'  },
]

function Sidebar({ pathname }: { pathname: string }) {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const name = profile?.name || user?.email?.split('@')[0] || 'Account'

  return (
    <aside style={{
      width: '220px', flexShrink: 0, background: 'var(--surface)',
      borderRight: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', height: '100%',
    }}>
      <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '18px',
          letterSpacing: '0.22em', color: 'var(--gold)' }}>BEREAN</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '7.5px',
          letterSpacing: '0.15em', color: 'var(--text-mute)', textTransform: 'uppercase',
          marginTop: '4px' }}>Biblical Principles Corpus</div>
      </div>

      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
        {NAV.map(({ href, Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '11px 20px', color: active ? 'var(--gold)' : 'var(--text-mute)',
              textDecoration: 'none',
              background: active ? 'rgba(201,168,76,0.07)' : 'transparent',
              borderLeft: active ? '2px solid var(--gold)' : '2px solid transparent',
              fontFamily: 'JetBrains Mono, monospace', fontSize: '10.5px',
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              <span style={{ flexShrink: 0, opacity: active ? 1 : 0.6 }}><Icon /></span>
              {label}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
          color: 'var(--gold)', marginBottom: '2px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px',
          color: 'var(--text-mute)', marginBottom: '10px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
        <button onClick={async () => { await signOut(); router.replace('/login') }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-mute)',
            cursor: 'pointer', padding: '7px 10px', fontFamily: 'JetBrains Mono, monospace',
            fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <OutIcon /> Sign Out
        </button>
      </div>
    </aside>
  )
}

function MobileHeader() {
  return (
    <header style={{ height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center',
      padding: '0 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '14px',
        letterSpacing: '0.2em', color: 'var(--gold)' }}>BEREAN</span>
    </header>
  )
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex',
      background: 'var(--surface)', borderTop: '1px solid var(--border)', zIndex: 10 }}>
      {NAV.slice(0, 5).map(({ href, Icon, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link key={href} href={href} style={{ flex: 1, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '2px', padding: '9px 0', textDecoration: 'none',
            color: active ? 'var(--gold)' : 'var(--text-mute)' }}>
            <span style={{ opacity: active ? 1 : 0.65 }}><Icon /></span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '7.5px',
              letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
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
        justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '22px',
          letterSpacing: '0.25em', color: 'var(--gold)' }}>BEREAN</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--gold)',
              animation: `thinking 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      {/* Responsive styles — inline so they always work */}
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
      }}>
        <Sidebar pathname={pathname} />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          maxWidth: '900px' }}>
          {children}
        </main>
        {/* Right gutter for very wide screens */}
        <div style={{ flex: 1, borderLeft: '1px solid var(--border)',
          background: 'var(--surface)', minWidth: 0 }} />
      </div>

      {/* MOBILE */}
      <div className="berean-mobile" style={{
        flexDirection: 'column', height: '100vh', overflow: 'hidden',
      }}>
        <MobileHeader />
        <main style={{ flex: 1, overflow: 'hidden', paddingBottom: '58px' }}>
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
