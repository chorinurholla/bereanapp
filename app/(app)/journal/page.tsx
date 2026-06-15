'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { loadLocal, saveLocal, pushToCloud, keys } from '@/lib/sync'
import type { JournalEntry, SermonNote } from '@/lib/supabase'
import { Trash2, Download, Plus, ChevronDown, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

// ─────────────────────────────────────────────
// PRAYER JOURNAL TAB
// ─────────────────────────────────────────────
function PrayerJournalTab() {
  const { user } = useAuth()
  const [journal, setJournal] = useState<JournalEntry[]>([])

  const load = useCallback(() => {
    if (!user) return
    setJournal(loadLocal<JournalEntry[]>(keys(user.id).journal, []))
  }, [user])

  useEffect(() => { load() }, [load])

  const deleteEntry = (id: number) => {
    if (!user || !confirm('Delete this entry?')) return
    const k = keys(user.id)
    const updated = journal.filter(e => e.id !== id)
    setJournal(updated)
    saveLocal(k.journal, updated)
    pushToCloud(user.id, 'journal', updated)
    toast.success('Entry deleted')
  }

  const exportJournal = () => {
    if (!journal.length) { toast.error('No entries yet'); return }
    const lines = ['BEREAN — Prayer Journal', `Exported: ${new Date().toLocaleDateString()}`, '']
    journal.forEach(e => {
      lines.push(`--- ${e.dateLabel} ---`, `Passages: ${e.refs}`, '', e.text, '')
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'berean_journal.txt'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Journal exported')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 32px 16px', borderBottom: '1px solid var(--rule)' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--ink5)' }}>
          {journal.length} {journal.length === 1 ? 'entry' : 'entries'} — prayers, reflections, devotion responses
        </p>
        <button onClick={exportJournal}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
            background: 'transparent', border: '1px solid var(--rule)', color: 'var(--ink4)',
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseOver={e => { e.currentTarget.style.borderColor='var(--gold2)'; e.currentTarget.style.color='var(--gold)' }}
          onMouseOut={e  => { e.currentTarget.style.borderColor='var(--rule)';  e.currentTarget.style.color='var(--ink4)' }}>
          <Download size={12} /> Export
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {journal.length === 0 ? (
          <div style={{ padding: '60px 32px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '17px',
              fontStyle: 'italic', color: 'var(--ink4)', lineHeight: 1.75 }}>
              Prayers saved from devotions and the Prayer Workshop appear here
            </p>
          </div>
        ) : (
          journal.map(entry => (
            <div key={entry.id} style={{ padding: '20px 32px', borderBottom: '1px solid var(--rule)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
                    color: 'var(--gold2)', letterSpacing: '0.08em', marginBottom: '3px' }}>
                    {entry.dateLabel}
                  </div>
                  {entry.refs && (
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'var(--ink5)' }}>
                      {entry.refs}
                    </div>
                  )}
                </div>
                <button onClick={() => deleteEntry(entry.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'rgba(122,42,42,0.25)', padding: '2px', transition: 'color 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.color='var(--crimson)')}
                  onMouseOut={e  => (e.currentTarget.style.color='rgba(122,42,42,0.25)')}>
                  <Trash2 size={13} />
                </button>
              </div>
              <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '15px',
                lineHeight: 1.8, color: 'var(--ink2)', whiteSpace: 'pre-wrap' }}>
                {entry.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// SERMON NOTES TAB
// ─────────────────────────────────────────────
const EMPTY_NOTE = (): SermonNote => ({
  id:          0,
  date:        new Date().toISOString(),
  dateLabel:   new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
  title:       '',
  preacher:    '',
  passage:     '',
  mainPoint:   '',
  points:      [''],
  insights:    '',
  application: '',
  questions:   '',
  refs:        '',
})

function SermonNotesTab() {
  const { user } = useAuth()
  const [sermons,    setSermons]    = useState<SermonNote[]>([])
  const [view,       setView]       = useState<'list'|'new'>('list')
  const [draft,      setDraft]      = useState<SermonNote>(EMPTY_NOTE())
  const [expanded,   setExpanded]   = useState<number|null>(null)
  const [searching,  setSearching]  = useState(false)
  const [corpusHits, setCorpusHits] = useState<string>('')

  const load = useCallback(() => {
    if (!user) return
    setSermons(loadLocal<SermonNote[]>(keys(user.id).sermons, []))
  }, [user])

  useEffect(() => { load() }, [load])

  const saveNote = useCallback(() => {
    if (!user) return
    if (!draft.title && !draft.passage) { toast.error('Add a title or passage first'); return }
    const k = keys(user.id)
    const note: SermonNote = { ...draft, id: draft.id || Date.now() }
    const existing = loadLocal<SermonNote[]>(k.sermons, [])
    const idx = existing.findIndex(s => s.id === note.id)
    const updated = idx > -1 ? existing.map((s, i) => i === idx ? note : s) : [note, ...existing]
    setSermons(updated)
    saveLocal(k.sermons, updated)
    pushToCloud(user.id, 'sermons', updated)
    toast.success('Sermon note saved')
    setView('list')
    setDraft(EMPTY_NOTE())
  }, [draft, user])

  const deleteSermon = (id: number) => {
    if (!user || !confirm('Delete this sermon note?')) return
    const k = keys(user.id)
    const updated = sermons.filter(s => s.id !== id)
    setSermons(updated)
    saveLocal(k.sermons, updated)
    pushToCloud(user.id, 'sermons', updated)
    toast.success('Deleted')
  }

  const exportSermons = () => {
    if (!sermons.length) { toast.error('No sermon notes yet'); return }
    const lines = ['BEREAN — Sermon Notes', `Exported: ${new Date().toLocaleDateString()}`, '']
    sermons.forEach(s => {
      lines.push(
        `=== ${s.title || 'Untitled'} ===`,
        `Date: ${s.dateLabel}  |  Preacher: ${s.preacher || '-'}  |  Passage: ${s.passage || '-'}`,
        `Main Point: ${s.mainPoint || '-'}`,
        '', 'Outline:',
        ...s.points.filter(Boolean).map((p, i) => `  ${i+1}. ${p}`),
        '', 'Personal Insights:', s.insights || '-',
        '', 'Application:', s.application || '-',
        '', 'Questions:', s.questions || '-',
        '', '',
      )
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'berean_sermons.txt'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported')
  }

  const searchCorpus = useCallback(async (query: string) => {
    if (!query.trim()) return
    setSearching(true)
    setCorpusHits('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 400,
          system: 'You are Berean. The user is mid-sermon and wants a quick corpus connection. Give 2-3 sentences connecting their question to a specific biblical principle, citing the book and passage. Be concise — they are listening to a sermon right now.',
          messages: [{ role: 'user', content: query }],
        }),
      })
      const data = await res.json()
      setCorpusHits(data.content?.[0]?.text || '')
    } catch { toast.error('Corpus search failed') }
    finally { setSearching(false) }
  }, [])

  const addPoint    = () => setDraft(d => ({ ...d, points: [...d.points, ''] }))
  const updatePoint = (i: number, v: string) => setDraft(d => ({ ...d, points: d.points.map((p, pi) => pi === i ? v : p) }))
  const removePoint = (i: number) => setDraft(d => ({ ...d, points: d.points.filter((_, pi) => pi !== i) }))

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', boxSizing: 'border-box',
    background: 'white', border: '1.5px solid var(--rule)',
    color: 'var(--ink)', fontFamily: "'Source Serif 4', serif",
    fontSize: '15px', lineHeight: 1.6, outline: 'none',
    transition: 'border-color 0.2s', boxShadow: 'var(--s1)',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '10px',
    fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: 'var(--ink5)', marginBottom: '6px',
  }

  // LIST VIEW
  if (view === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 32px 16px', borderBottom: '1px solid var(--rule)', flexWrap: 'wrap', gap: '10px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--ink5)' }}>
            {sermons.length} {sermons.length === 1 ? 'sermon' : 'sermons'} recorded
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {sermons.length > 0 && (
              <button onClick={exportSermons}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
                  background: 'transparent', border: '1px solid var(--rule)', color: 'var(--ink4)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor='var(--gold2)'; e.currentTarget.style.color='var(--gold)' }}
                onMouseOut={e  => { e.currentTarget.style.borderColor='var(--rule)';  e.currentTarget.style.color='var(--ink4)' }}>
                <Download size={12} /> Export
              </button>
            )}
            <button onClick={() => { setDraft(EMPTY_NOTE()); setCorpusHits(''); setView('new') }}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 18px',
                background: 'var(--gold)', color: 'white', border: 'none',
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', boxShadow: 'var(--s2)', transition: 'all 0.15s' }}
              onMouseOver={e => e.currentTarget.style.background='var(--gold2)'}
              onMouseOut={e  => e.currentTarget.style.background='var(--gold)'}>
              <Plus size={13} /> New Sermon Note
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sermons.length === 0 ? (
            <div style={{ padding: '60px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '16px', opacity: 0.4 }}>📖</div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px',
                color: 'var(--ink3)', marginBottom: '10px', fontWeight: 500 }}>
                Capture what you are hearing
              </p>
              <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '15px',
                fontStyle: 'italic', color: 'var(--ink4)', lineHeight: 1.75,
                maxWidth: '380px', margin: '0 auto 24px' }}>
                Structured sermon notes with live corpus search — take notes while you listen and connect what you hear to Scripture.
              </p>
              <button onClick={() => { setDraft(EMPTY_NOTE()); setView('new') }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px',
                  background: 'var(--gold)', color: 'white', border: 'none',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', boxShadow: 'var(--s2)' }}>
                <Plus size={14} /> Start taking notes
              </button>
            </div>
          ) : (
            sermons.map(s => {
              const open = expanded === s.id
              return (
                <div key={s.id} style={{ borderBottom: '1px solid var(--rule)',
                  borderLeft: open ? '3px solid var(--gold2)' : '3px solid transparent' }}>
                  <div onClick={() => setExpanded(open ? null : s.id)}
                    style={{ padding: open ? '18px 32px 14px 29px' : '18px 32px', cursor: 'pointer',
                      background: open ? 'var(--paper2)' : 'transparent', transition: 'background 0.12s',
                      display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
                        color: 'var(--gold2)', letterSpacing: '0.08em', marginBottom: '4px' }}>
                        {s.dateLabel}{s.preacher ? ` · ${s.preacher}` : ''}
                      </div>
                      <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '17px',
                        fontWeight: 500, color: 'var(--ink)', marginBottom: '3px', lineHeight: 1.4 }}>
                        {s.title || 'Untitled Sermon'}
                      </p>
                      {s.passage && <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--ink4)' }}>{s.passage}</div>}
                      {s.mainPoint && <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '14px',
                        fontStyle: 'italic', color: 'var(--ink4)', marginTop: '5px', lineHeight: 1.5 }}>{s.mainPoint}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); deleteSermon(s.id) }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                          color: 'rgba(122,42,42,0.2)', padding: '4px', transition: 'color 0.15s' }}
                        onMouseOver={e => (e.currentTarget.style.color='var(--crimson)')}
                        onMouseOut={e  => (e.currentTarget.style.color='rgba(122,42,42,0.2)')}>
                        <Trash2 size={13}/>
                      </button>
                      <div style={{ color: 'var(--ink5)', transition: 'transform 0.2s',
                        transform: open ? 'rotate(180deg)' : 'none' }}>
                        <ChevronDown size={16}/>
                      </div>
                    </div>
                  </div>

                  {open && (
                    <div className="fade-in" style={{ padding: '0 32px 24px 29px', background: 'white' }}>
                      {s.points.filter(Boolean).length > 0 && (
                        <div style={{ marginTop: '16px', marginBottom: '14px' }}>
                          <div style={labelStyle}>Outline</div>
                          {s.points.filter(Boolean).map((p, i) => (
                            <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '6px' }}>
                              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                                color: 'var(--gold2)', fontWeight: 600, marginTop: '2px', flexShrink: 0 }}>{i+1}.</span>
                              <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '15px',
                                color: 'var(--ink2)', lineHeight: 1.6, margin: 0 }}>{p}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {s.insights && (
                        <div style={{ marginBottom: '14px' }}>
                          <div style={labelStyle}>Personal Insights</div>
                          <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '15px',
                            color: 'var(--ink2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{s.insights}</p>
                        </div>
                      )}
                      {s.application && (
                        <div style={{ marginBottom: '14px' }}>
                          <div style={labelStyle}>Application</div>
                          <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '15px',
                            color: 'var(--ink2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{s.application}</p>
                        </div>
                      )}
                      {s.questions && (
                        <div style={{ padding: '14px 16px', background: 'var(--paper2)',
                          borderLeft: '3px solid var(--gold2)', marginBottom: '14px' }}>
                          <div style={labelStyle}>Questions to Explore</div>
                          <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '15px',
                            color: 'var(--ink2)', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>{s.questions}</p>
                        </div>
                      )}
                      <button onClick={e => { e.stopPropagation(); setDraft(s); setCorpusHits(''); setView('new') }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '7px 16px', background: 'transparent',
                          border: '1px solid var(--border2,rgba(154,123,58,0.3))',
                          color: 'var(--gold)', fontFamily: 'DM Sans, sans-serif',
                          fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }}>
                        Edit note
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // EDIT / NEW NOTE VIEW
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ padding: '14px 32px', borderBottom: '1px solid var(--rule)',
        background: 'var(--paper2)', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => { setView('list'); setDraft(EMPTY_NOTE()); setCorpusHits('') }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--gold)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, padding: 0 }}>
            ← Back
          </button>
          <span style={{ color: 'var(--rule2)', fontSize: '14px' }}>|</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--ink4)' }}>
            {draft.id ? 'Editing' : `New note · ${draft.dateLabel}`}
          </span>
        </div>
        <button onClick={saveNote}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 22px',
            background: 'var(--gold)', color: 'white', border: 'none',
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--s2)' }}
          onMouseOver={e => e.currentTarget.style.background='var(--gold2)'}
          onMouseOut={e  => e.currentTarget.style.background='var(--gold)'}>
          Save Note
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Sermon Title</label>
              <input type="text" value={draft.title}
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                placeholder="What is this sermon about?" style={fieldStyle}
                onFocus={e => e.target.style.borderColor='var(--gold2)'}
                onBlur={e  => e.target.style.borderColor='var(--rule)'}/>
            </div>
            <div>
              <label style={labelStyle}>Preacher</label>
              <input type="text" value={draft.preacher}
                onChange={e => setDraft(d => ({ ...d, preacher: e.target.value }))}
                placeholder="Who is preaching?" style={fieldStyle}
                onFocus={e => e.target.style.borderColor='var(--gold2)'}
                onBlur={e  => e.target.style.borderColor='var(--rule)'}/>
            </div>
            <div>
              <label style={labelStyle}>Primary Passage</label>
              <input type="text" value={draft.passage}
                onChange={e => setDraft(d => ({ ...d, passage: e.target.value }))}
                placeholder="e.g. Romans 8:1-17" style={fieldStyle}
                onFocus={e => e.target.style.borderColor='var(--gold2)'}
                onBlur={e  => e.target.style.borderColor='var(--rule)'}/>
            </div>
          </div>

          {/* Main point */}
          <div>
            <label style={labelStyle}>Main Point — The Big Idea</label>
            <input type="text" value={draft.mainPoint}
              onChange={e => setDraft(d => ({ ...d, mainPoint: e.target.value }))}
              placeholder="One sentence that captures the heart of this sermon…" style={fieldStyle}
              onFocus={e => e.target.style.borderColor='var(--gold2)'}
              onBlur={e  => e.target.style.borderColor='var(--rule)'}/>
          </div>

          {/* Outline */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ ...labelStyle, margin: 0 }}>Sermon Outline / Points</label>
              <button onClick={addPoint}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px',
                  background: 'transparent', border: '1px solid var(--rule)', color: 'var(--ink4)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor='var(--gold2)'; e.currentTarget.style.color='var(--gold)' }}
                onMouseOut={e  => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--ink4)' }}>
                <Plus size={10}/> Add point
              </button>
            </div>
            {draft.points.map((point, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                  color: 'var(--gold2)', fontWeight: 600, flexShrink: 0, width: '18px' }}>{i+1}.</span>
                <input type="text" value={point}
                  onChange={e => updatePoint(i, e.target.value)}
                  placeholder={`Point ${i+1}…`} style={{ ...fieldStyle, flex: 1 }}
                  onFocus={e => e.target.style.borderColor='var(--gold2)'}
                  onBlur={e  => e.target.style.borderColor='var(--rule)'}/>
                {draft.points.length > 1 && (
                  <button onClick={() => removePoint(i)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'rgba(122,42,42,0.3)', padding: '4px', transition: 'color 0.15s', flexShrink: 0 }}
                    onMouseOver={e => (e.currentTarget.style.color='var(--crimson)')}
                    onMouseOut={e  => (e.currentTarget.style.color='rgba(122,42,42,0.3)')}>✕</button>
                )}
              </div>
            ))}
          </div>

          {/* Insights */}
          <div>
            <label style={labelStyle}>Personal Insights — What struck you mid-sermon?</label>
            <textarea value={draft.insights}
              onChange={e => setDraft(d => ({ ...d, insights: e.target.value }))}
              placeholder="What is landing with you personally? What surprised you? What confirmed something you have been sitting with?"
              rows={4} style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.7 }}
              onFocus={e => e.target.style.borderColor='var(--gold2)'}
              onBlur={e  => e.target.style.borderColor='var(--rule)'}/>
          </div>

          {/* Application */}
          <div>
            <label style={labelStyle}>Application — What will you actually do with this?</label>
            <textarea value={draft.application}
              onChange={e => setDraft(d => ({ ...d, application: e.target.value }))}
              placeholder="One concrete thing this sermon is asking of you this week…"
              rows={3} style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.7 }}
              onFocus={e => e.target.style.borderColor='var(--gold2)'}
              onBlur={e  => e.target.style.borderColor='var(--rule)'}/>
          </div>

          {/* Questions + live corpus search */}
          <div>
            <label style={labelStyle}>Questions to Explore Further in the Corpus</label>
            <textarea value={draft.questions}
              onChange={e => { setDraft(d => ({ ...d, questions: e.target.value })); setCorpusHits('') }}
              placeholder="What questions did this raise that you want to bring back to Scripture?"
              rows={3} style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.7 }}
              onFocus={e => e.target.style.borderColor='var(--gold2)'}
              onBlur={e  => e.target.style.borderColor='var(--rule)'}/>

            {draft.questions.trim() && (
              <div style={{ marginTop: '10px' }}>
                <button onClick={() => searchCorpus(draft.questions)} disabled={searching}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px',
                    background: 'transparent', border: '1.5px solid var(--border2,rgba(154,123,58,0.3))',
                    color: 'var(--gold)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                    fontWeight: 500, cursor: searching ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
                  onMouseOver={e => { if (!searching) e.currentTarget.style.background='var(--gold-bg)' }}
                  onMouseOut={e  => { e.currentTarget.style.background='transparent' }}>
                  <BookOpen size={12}/>
                  {searching ? 'Searching corpus…' : 'Quick corpus search'}
                </button>

                {corpusHits && (
                  <div className="fade-in" style={{ marginTop: '12px', padding: '16px 18px',
                    background: 'var(--paper2)', borderLeft: '3px solid var(--gold2)' }}>
                    <div style={labelStyle}>Corpus Connection</div>
                    <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '14px',
                      color: 'var(--ink2)', lineHeight: 1.75, margin: '0 0 10px' }}>
                      {corpusHits}
                    </p>
                    <button onClick={() => setDraft(d => ({ ...d, refs: corpusHits.substring(0, 300) }))}
                      style={{ padding: '5px 12px', background: 'transparent', border: '1px solid var(--rule)',
                        color: 'var(--ink4)', fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                        cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseOver={e => { e.currentTarget.style.borderColor='var(--gold2)'; e.currentTarget.style.color='var(--gold)' }}
                      onMouseOut={e  => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--ink4)' }}>
                      Save to note
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom save */}
          <div style={{ paddingTop: '4px', paddingBottom: '32px' }}>
            <button onClick={saveNote}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '13px 32px',
                background: 'var(--gold)', color: 'white', border: 'none',
                fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', boxShadow: 'var(--s2)', transition: 'all 0.15s' }}
              onMouseOver={e => { e.currentTarget.style.background='var(--gold2)'; e.currentTarget.style.transform='translateY(-1px)' }}
              onMouseOut={e  => { e.currentTarget.style.background='var(--gold)';  e.currentTarget.style.transform='none' }}>
              Save Sermon Note
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// ROOT PAGE
// ─────────────────────────────────────────────
export default function JournalPage() {
  const [tab, setTab] = useState<'prayers'|'sermons'>('prayers')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '24px 32px 0', background: 'var(--paper)',
        borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px',
          fontWeight: 500, color: 'var(--ink)', marginBottom: '14px' }}>Journal</h1>
        <div style={{ display: 'flex' }}>
          {([['prayers','✍ Prayer Journal'],['sermons','📖 Sermon Notes']] as const).map(([t,label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 22px', background: 'transparent', border: 'none',
              borderBottom: tab === t ? '2px solid var(--gold2)' : '2px solid transparent',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--gold)' : 'var(--ink4)',
              cursor: 'pointer', transition: 'all 0.15s', marginBottom: '-1px',
            }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'prayers' ? <PrayerJournalTab /> : <SermonNotesTab />}
      </div>
    </div>
  )
}
