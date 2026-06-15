'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import Link from 'next/link'

// Minimal icon set
const Icon = {
  book:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  msg:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  pray:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>,
  search:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  history: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>,
  pen:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  gear:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  out:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
}

const NAV = [
  { href: '/devotion', Icon: Icon.book,    label: 'Devotion'  },
  { href: '/prayer',   Icon: Icon.pray,    label: 'Prayer'    },
  { href: '/chat',     Icon: Icon.msg,     label: 'Ask'       },
  { href: '/search',   Icon: Icon.search,  label: 'Search'    },
  { href: '/history',  Icon: Icon.history, label: 'History'   },
  { href: '/journal',  Icon: Icon.pen,     label: 'Journal'   },
  { href: '/settings', Icon: Icon.gear,    label: 'Settings'  },
]

function TopNav({ pathname }: { pathname: string }) {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const name = profile?.name || user?.email?.split('@')[0] || ''

  return (
    <header className="topnav">
      {/* Logo */}
      <Link href="/devotion" className="topnav-logo">
        Bere<span>an</span>
      </Link>

      {/* Nav links */}
      <nav style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href}
            className={'topnav-link' + (pathname.startsWith(href) ? ' active' : '')}>
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {name && (
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
            color: 'var(--ink3)', fontWeight: 500 }}>
            {name}
          </span>
        )}
        <button onClick={async () => { await signOut(); router.replace('/login') }}
          className="btn btn-text" style={{ display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 10px', fontSize: '12px' }}>
          <Icon.out /> Sign out
        </button>
      </div>
    </header>
  )
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="bottomnav">
      {NAV.slice(0, 5).map(({ href, Icon: NavIcon, label }) => (
        <Link key={href} href={href}
          className={'bottomnav-item' + (pathname.startsWith(href) ? ' active' : '')}>
          <NavIcon />
          <span className="bottomnav-label">{label}</span>
        </Link>
      ))}
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
        justifyContent: 'center', background: 'var(--paper)', flexDirection: 'column', gap: '24px' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px',
          fontWeight: 500, letterSpacing: '0.06em', color: 'var(--ink)' }}>
          Bere<span style={{ color: 'var(--gold2)' }}>an</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%',
              background: 'var(--gold3)',
              animation: `thinking 1.3s ease-in-out ${i * 0.22}s infinite` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <style>{`
        .show-desktop { display: none  !important; }
        .show-mobile  { display: flex  !important; }
        @media (min-width: 768px) {
          .show-desktop { display: flex !important; }
          .show-mobile  { display: none !important; }
        }
      `}</style>

      {/* DESKTOP — top nav + full-width content */}
      <div className="show-desktop" style={{
        flexDirection: 'column', height: '100vh', overflow: 'hidden',
        background: 'var(--paper)',
      }}>
        <TopNav pathname={pathname} />
        <main style={{ flex: 1, overflow: 'hidden' }}>
          {children}
        </main>
      </div>

      {/* MOBILE — compact header + content + bottom nav */}
      <div className="show-mobile" style={{
        flexDirection: 'column', height: '100vh', overflow: 'hidden',
        background: 'var(--paper)',
      }}>
        {/* Mobile header */}
        <header style={{ height: '50px', flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', borderBottom: '1px solid var(--rule)',
          background: 'rgba(254,252,248,0.95)', backdropFilter: 'blur(8px)' }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px',
            fontWeight: 500, letterSpacing: '0.06em', color: 'var(--ink)' }}>
            Bere<span style={{ color: 'var(--gold2)' }}>an</span>
          </span>
        </header>
        <main style={{ flex: 1, overflow: 'hidden', paddingBottom: '60px' }}>
          {children}
        </main>
        <BottomNav pathname={pathname} />
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
