'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { loadLocal, saveLocal, pushToCloud, keys, calcStreak } from '@/lib/sync'
import type { HistoryEntry, TrackerEntry } from '@/lib/supabase'
import { Download, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

export default function HistoryPage() {
  const { user } = useAuth()
  const [history,  setHistory]  = useState<HistoryEntry[]>([])
  const [tracker,  setTracker]  = useState<Record<string, TrackerEntry>>({})
  const [devCount, setDevCount] = useState(0)
  const [expanded, setExpanded] = useState<number | null>(null)

  const load = useCallback(() => {
    if (!user) return
    const k = keys(user.id)
    setHistory(loadLocal<HistoryEntry[]>(k.history, []))
    setTracker(loadLocal<Record<string, TrackerEntry>>(k.tracker, {}))
    setDevCount(parseInt(localStorage.getItem(k.devcount) || '0'))
  }, [user])

  useEffect(() => { load() }, [load])

  const streak  = calcStreak(history)
  const usedN   = Object.keys(tracker).length
  const totalN  = 960

  // Streak dots — last 30 days
  const streakDots = () => {
    const activeDates = new Set(history.map(h => new Date(h.date).toDateString()))
    const today = new Date(); today.setHours(0,0,0,0)
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (29 - i))
      return { date: d, active: activeDates.has(d.toDateString()), isToday: i === 29 }
    })
  }

  const exportHistory = () => {
    if (!history.length) { toast.error('No history to export yet'); return }
    const lines = ['BEREAN — Devotion History', `Exported: ${new Date().toLocaleDateString()}`, '']
    history.forEach((h, i) => {
      lines.push(`${i+1}. ${h.dateLabel}`, `Query: ${h.query}`, `Passages: ${h.refs}`, '')
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'berean_history.txt'; a.click()
    URL.revokeObjectURL(url)
    toast.success('History exported')
  }

  const resetTracker = () => {
    if (!user) return
    if (!confirm('Reset all tracked principles? This cannot be undone.')) return
    const k = keys(user.id)
    saveLocal(k.tracker, {})
    pushToCloud(user.id, 'tracker', {})
    localStorage.setItem(k.devcount, '0')
    pushToCloud(user.id, 'devotion_count', 0)
    setTracker({})
    setDevCount(0)
    toast.success('Tracker reset')
  }

  return (
    <div className="flex flex-col h-full">

      {/* Stats bar */}
      <div className="flex-shrink-0 px-4 py-4"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-[0.65rem] tracking-[0.2em] uppercase"
              style={{ color: 'var(--gold)' }}>
            Devotion History
          </h2>
          <button
            onClick={exportHistory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[0.55rem] tracking-[0.1em] uppercase transition-colors cursor-pointer"
            style={{ border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text-mute)' }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseOut={e  => (e.currentTarget.style.color = 'var(--text-mute)')}
          >
            <Download size={10} /> Export
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Devotions', value: devCount },
            { label: 'Day Streak', value: streak  },
            { label: 'Principles Used', value: `${usedN}/${totalN}` },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 text-center"
                 style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <div className="text-xl font-bold mb-0.5"
                   style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif" }}>
                {value}
              </div>
              <div className="font-mono text-[0.5rem] tracking-[0.1em] uppercase"
                   style={{ color: 'var(--text-mute)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Streak dots */}
        <div className="mb-1">
          <div className="font-mono text-[0.5rem] tracking-[0.15em] uppercase mb-2"
               style={{ color: 'var(--text-mute)' }}>
            Last 30 days
          </div>
          <div className="flex gap-1 flex-wrap">
            {streakDots().map(({ date, active, isToday }) => (
              <div
                key={date.toISOString()}
                title={date.toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                className="w-2.5 h-2.5 rounded-sm"
                style={{
                  background: active ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isToday ? 'var(--gold)' : 'rgba(255,255,255,0.06)'}`,
                  opacity: active ? 0.85 : 1,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm italic" style={{ color: 'var(--text-mute)' }}>
              No devotions yet
            </p>
            <p className="font-mono text-[0.55rem]" style={{ color: 'var(--text-mute)' }}>
              Run your first devotion to begin your history
            </p>
          </div>
        ) : (
          history.map(h => {
            const isOpen = expanded === h.id
            return (
              <div
                key={h.id}
                className="cursor-pointer transition-colors"
                style={{ borderBottom: '1px solid var(--border)' }}
                onClick={() => setExpanded(isOpen ? null : h.id)}
              >
                <div className="px-4 py-3"
                     style={{ background: isOpen ? 'var(--surface2)' : 'transparent' }}>
                  <div className="font-mono text-[0.5rem] tracking-[0.1em] uppercase mb-1"
                       style={{ color: 'var(--gold)', opacity: 0.7 }}>
                    {h.dateLabel}
                  </div>
                  <p className="text-sm leading-snug mb-1"
                     style={{ color: 'var(--text-dim)', fontFamily: 'Georgia, serif' }}>
                    {h.query}
                  </p>
                  <div className="font-mono text-[0.5rem]" style={{ color: 'var(--text-mute)' }}>
                    {h.refs}
                  </div>

                  {isOpen && (
                    <div className="mt-3 pt-3 animate-fade-up"
                         style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="font-mono text-[0.5rem] tracking-[0.12em] uppercase mb-2"
                           style={{ color: 'var(--text-mute)' }}>
                        Devotion excerpt
                      </div>
                      <p className="text-xs leading-relaxed"
                         style={{ color: 'var(--text-dim)', fontFamily: 'Georgia, serif' }}>
                        {h.reply.substring(0, 400)}…
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}

        {/* Reset tracker option */}
        {Object.keys(tracker).length > 0 && (
          <div className="px-4 py-6 flex justify-center">
            <button
              onClick={resetTracker}
              className="flex items-center gap-1.5 px-3 py-2 font-mono text-[0.55rem] tracking-[0.1em] uppercase transition-colors cursor-pointer"
              style={{ border: '1px solid rgba(248,113,113,0.2)', background: 'transparent', color: 'rgba(248,113,113,0.5)' }}
              onMouseOver={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)' }}
              onMouseOut={e  => { e.currentTarget.style.color = 'rgba(248,113,113,0.5)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)' }}
            >
              <RotateCcw size={10} /> Reset Tracker
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
