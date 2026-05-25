'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { loadLocal, saveLocal, pushToCloud, keys } from '@/lib/sync'
import type { JournalEntry } from '@/lib/supabase'
import { Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'

export default function JournalPage() {
  const { user } = useAuth()
  const [journal, setJournal] = useState<JournalEntry[]>([])

  const load = useCallback(() => {
    if (!user) return
    setJournal(loadLocal<JournalEntry[]>(keys(user.id).journal, []))
  }, [user])

  useEffect(() => { load() }, [load])

  const deleteEntry = (id: number) => {
    if (!user || !confirm('Delete this journal entry?')) return
    const k       = keys(user.id)
    const updated = journal.filter(e => e.id !== id)
    setJournal(updated)
    saveLocal(k.journal, updated)
    pushToCloud(user.id, 'journal', updated)
    toast.success('Entry deleted')
  }

  const exportJournal = () => {
    if (!journal.length) { toast.error('No journal entries yet'); return }
    const lines = ['BEREAN — Prayer Journal', `Exported: ${new Date().toLocaleDateString()}`, '']
    journal.forEach(e => {
      lines.push(`--- ${e.dateLabel} ---`, `Passages: ${e.refs}`, '', e.text, '')
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'berean_journal.txt'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Journal exported')
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-4 py-4 flex-shrink-0 flex items-center justify-between"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div>
          <h2 className="font-mono text-[0.65rem] tracking-[0.2em] uppercase"
              style={{ color: 'var(--gold)' }}>
            Prayer Journal
          </h2>
          <p className="font-mono text-[0.5rem] tracking-[0.1em] mt-0.5"
             style={{ color: 'var(--text-mute)' }}>
            {journal.length} {journal.length === 1 ? 'entry' : 'entries'} · synced across devices
          </p>
        </div>
        <button
          onClick={exportJournal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[0.55rem] tracking-[0.1em] uppercase transition-colors cursor-pointer"
          style={{ border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text-mute)' }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseOut={e  => (e.currentTarget.style.color = 'var(--text-mute)')}
        >
          <Download size={10} /> Export
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto">
        {journal.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
            <p className="text-sm italic" style={{ color: 'var(--text-mute)' }}>
              No journal entries yet
            </p>
            <p className="font-mono text-[0.55rem] max-w-xs leading-relaxed"
               style={{ color: 'var(--text-mute)' }}>
              After a devotion, write your personal prayer response to save it here
            </p>
          </div>
        ) : (
          journal.map(entry => (
            <div key={entry.id} className="px-4 py-4"
                 style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="font-mono text-[0.5rem] tracking-[0.12em] uppercase"
                       style={{ color: 'var(--gold)', opacity: 0.7 }}>
                    {entry.dateLabel}
                  </div>
                  {entry.refs && (
                    <div className="font-mono text-[0.45rem] mt-0.5"
                         style={{ color: 'var(--text-mute)' }}>
                      {entry.refs}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="flex-shrink-0 p-1 transition-colors cursor-pointer"
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.12)' }}
                  onMouseOver={e => (e.currentTarget.style.color = 'var(--red)')}
                  onMouseOut={e  => (e.currentTarget.style.color = 'rgba(255,255,255,0.12)')}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap"
                 style={{ color: 'var(--text-dim)', fontFamily: 'Georgia, serif' }}>
                {entry.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
