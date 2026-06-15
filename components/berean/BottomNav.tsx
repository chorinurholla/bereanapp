'use client'

import Link from 'next/link'
import { BookOpen, MessageSquare, Clock, BookMarked, Search } from 'lucide-react'

const NAV = [
  { href: '/devotion', icon: BookOpen,      label: 'Devotion' },
  { href: '/chat',     icon: MessageSquare, label: 'Ask'      },
  { href: '/search',   icon: Search,        label: 'Search'   },
  { href: '/history',  icon: Clock,         label: 'History'  },
  { href: '/journal',  icon: BookMarked,    label: 'Journal'  },
]

export default function BottomNav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-10 flex"
         style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
      {NAV.map(({ href, icon: Icon, label }) => {
        const active = currentPath.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors"
            style={{ color: active ? 'var(--gold)' : 'var(--text-mute)' }}
          >
            <Icon size={18} strokeWidth={active ? 2 : 1.5} />
            <span className="font-mono text-[0.45rem] tracking-[0.1em] uppercase">
              {label}
            </span>
            {active && (
              <div className="absolute bottom-0 w-1 h-1 rounded-full"
                   style={{ background: 'var(--gold)' }} />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
