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
  const [expanded, setExpanded] = useState<number|null>(null)

  const load = useCallback(() => {
    if (!user) return
    const k = keys(user.id)
    setHistory(loadLocal<HistoryEntry[]>(k.history, []))
    setTracker(loadLocal<Record<string, TrackerEntry>>(k.tracker, {}))
    setDevCount(parseInt(localStorage.getItem(k.devcount) || '0'))
  }, [user])

  useEffect(() => { load() }, [load])

  const streak        = calcStreak(history)
  const chaptersUsed  = Object.keys(tracker).length   // unique chapters drawn from
  const principlesUsed = Object.values(tracker).length // same — one entry per chapter
  const totalChapters = 960
  const totalPrinciples = 5956

  // Last 30 days streak grid
  const streakDots = () => {
    const activeDates = new Set(history.map(h => new Date(h.date).toDateString()))
    const today = new Date(); today.setHours(0,0,0,0)
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (29 - i))
      return {
        date: d,
        active: activeDates.has(d.toDateString()),
        isToday: i === 29,
      }
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
    if (!user || !confirm('Reset all tracked chapters? This cannot be undone.')) return
    const k = keys(user.id)
    saveLocal(k.tracker, {})
    pushToCloud(user.id, 'tracker', {})
    localStorage.setItem(k.devcount, '0')
    pushToCloud(user.id, 'devotion_count', 0)
    setTracker({}); setDevCount(0)
    toast.success('Tracker reset')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{
        padding: '28px 32px 24px',
        borderBottom: '1px solid var(--rule)',
        background: 'rgba(254,252,248,0.96)',
        position: 'sticky', top: 0, zIndex: 5,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px',
              fontWeight: 500, color: 'var(--ink)', marginBottom: '4px' }}>
              Devotion History
            </h1>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--ink4)' }}>
              Your journey through Scripture — synced across all devices
            </p>
          </div>
          <button onClick={exportHistory}
            style={{ display: 'flex', alignItems: 'center', gap: '7px',
              background: 'transparent', border: '1px solid var(--rule)',
              padding: '8px 16px', cursor: 'pointer', color: 'var(--ink4)',
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
              transition: 'all 0.15s', flexShrink: 0 }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--gold2)'; e.currentTarget.style.color = 'var(--gold)' }}
            onMouseOut={e  => { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.color = 'var(--ink4)' }}
          >
            <Download size={13} /> Export History
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '32px', marginTop: '24px', flexWrap: 'wrap' }}>
          {[
            { num: devCount,         label: 'Total Devotions',          sub: 'all time'                    },
            { num: streak,           label: 'Current Streak',           sub: streak === 1 ? 'day' : 'days' },
            { num: chaptersUsed,     label: 'Chapters Covered',         sub: `of ${totalChapters} total`    },
            { num: totalPrinciples - (chaptersUsed * 6), label: 'Principles Remaining', sub: 'approx.' },
          ].map(({ num, label, sub }) => (
            <div key={label}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px',
                fontWeight: 500, color: 'var(--gold2)', lineHeight: 1 }}>
                {typeof num === 'number' ? num.toLocaleString() : num}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink3)',
                marginTop: '3px' }}>{label}</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px',
                color: 'var(--ink5)' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Streak grid */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink5)',
            marginBottom: '8px' }}>Last 30 days</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {streakDots().map(({ date, active, isToday }) => (
              <div key={date.toISOString()}
                title={date.toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                style={{
                  width: '14px', height: '14px', borderRadius: '3px',
                  background: active ? 'var(--gold2)' : 'var(--paper3)',
                  border: isToday ? '2px solid var(--gold2)' : '1px solid var(--rule)',
                  opacity: active ? 1 : 0.6,
                  transition: 'all 0.15s',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* History list */}
      <div style={{ flex: 1 }}>
        {history.length === 0 ? (
          <div style={{ padding: '60px 32px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '18px',
              fontStyle: 'italic', color: 'var(--ink4)', marginBottom: '8px' }}>
              No devotions yet
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--ink5)' }}>
              Run your first devotion to begin building your history
            </p>
          </div>
        ) : (
          history.map(h => {
            const open = expanded === h.id
            return (
              <div key={h.id} className={'entry-row' + (open ? ' open' : '')}
                onClick={() => setExpanded(open ? null : h.id)}
                style={{ borderLeft: open ? '3px solid var(--gold2)' : '3px solid transparent',
                  paddingLeft: open ? '21px' : '24px' }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold2)',
                  marginBottom: '6px' }}>
                  {h.dateLabel}
                </div>
                <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '16px',
                  color: 'var(--ink)', lineHeight: 1.5, marginBottom: '6px' }}>
                  {h.query}
                </p>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                  color: 'var(--ink4)' }}>
                  {h.refs}
                </div>

                {open && (
                  <div className="fade-in" style={{ marginTop: '16px', paddingTop: '16px',
                    borderTop: '1px solid var(--rule)' }}>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600,
                      letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink5)',
                      marginBottom: '8px' }}>Excerpt</div>
                    <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '14px',
                      lineHeight: 1.75, color: 'var(--ink3)' }}>
                      {h.reply.substring(0, 350)}…
                    </p>
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Reset option */}
        {Object.keys(tracker).length > 0 && (
          <div style={{ padding: '32px', display: 'flex', justifyContent: 'center' }}>
            <button onClick={resetTracker}
              style={{ display: 'flex', alignItems: 'center', gap: '7px',
                background: 'transparent', border: '1px solid rgba(122,42,42,0.2)',
                padding: '8px 18px', cursor: 'pointer', color: 'rgba(122,42,42,0.6)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
                transition: 'all 0.15s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--crimson)'; e.currentTarget.style.color = 'var(--crimson)' }}
              onMouseOut={e  => { e.currentTarget.style.borderColor = 'rgba(122,42,42,0.2)'; e.currentTarget.style.color = 'rgba(122,42,42,0.6)' }}
            >
              <RotateCcw size={12} /> Reset Tracker
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
