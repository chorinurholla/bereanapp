'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useCorpusChat } from '@/lib/use-corpus-chat'
import { loadLocal, saveLocal, pushToCloud, keys } from '@/lib/sync'
import { THEME_CATS } from '@/lib/corpus'
import MessageBubble from '@/components/berean/MessageBubble'
import type { CorpusChapter } from '@/lib/corpus'
import type { JournalEntry } from '@/lib/supabase'

const EXAMPLES = [
  "How should I handle a business partner who betrayed me?",
  "What does Scripture say about seasons of waiting?",
  "I'm afraid of the next step God is calling me to take",
  "How do I lead well when I feel overwhelmed?",
  "What does Scripture say about money and prosperity?",
  "How do I know if a difficult season is formation or punishment?",
]

export default function DevotionPage() {
  const { user } = useAuth()
  const [corpus,     setCorpus]     = useState<CorpusChapter[]>([])
  const [input,      setInput]      = useState('')
  const [devoMode,   setDevoMode]   = useState(true)
  const [testament,  setTestament]  = useState<'OT'|'NT'|'both'>('both')
  const [themes,     setThemes]     = useState<Set<string>>(new Set())
  const [showThemes, setShowThemes] = useState(false)
  const [length,     setLength]     = useState<'brief'|'standard'|'deep'>('standard')
  const messagesEnd = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/corpus.json').then(r => r.json()).then(setCorpus).catch(console.error)
  }, [])

  const { messages, streaming, sendMessage } = useCorpusChat({
    corpus, devoMode, testament, selectedThemes: themes, devLength: length,
  })

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const saveJournal = useCallback((devId: number, text: string, refs: string) => {
    if (!user) return
    const k = keys(user.id)
    const journal = loadLocal<JournalEntry[]>(k.journal, [])
    const entry: JournalEntry = {
      id: Date.now(), devotionId: devId,
      date: new Date().toISOString(),
      dateLabel: new Date().toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' }),
      text: text.trim(), refs,
    }
    const updated = [entry, ...journal]
    saveLocal(k.journal, updated)
    pushToCloud(user.id, 'journal', updated)
  }, [user])

  const handleSend = () => {
    const q = input.trim() || (devoMode ? 'Give me a fresh daily devotion from the corpus' : '')
    if (!q || streaming) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    sendMessage(q)
  }

  const toggleTheme = (t: string) => {
    setThemes(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n })
  }

  const cycleTestament = () => {
    setTestament(t => t === 'both' ? 'OT' : t === 'OT' ? 'NT' : 'both')
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Theme panel */}
      {showThemes && (
        <div style={{
          borderBottom: '1px solid var(--rule)',
          background: 'var(--paper2)',
          padding: '16px 20px',
          maxHeight: '160px',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600,
            letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink4)',
            marginBottom: '12px' }}>Filter by Theme</div>
          {THEME_CATS.map(cat => (
            <div key={cat.label} style={{ marginBottom: '10px' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', fontWeight: 600,
                letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink5)',
                marginBottom: '6px' }}>{cat.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {cat.themes.map(t => (
                  <button key={t} onClick={() => toggleTheme(t)}
                    className={'theme-tag' + (themes.has(t) ? ' on' : '')}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isEmpty ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '60vh',
            padding: '48px 24px', textAlign: 'center',
          }}>
            {/* Ornament */}
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '32px',
              color: 'var(--gold3)', marginBottom: '20px', opacity: 0.6 }}>✦</div>

            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px',
              fontWeight: 500, color: 'var(--ink)', marginBottom: '12px',
              letterSpacing: '0.01em' }}>
              {devoMode ? 'Daily Devotion' : 'Ask Anything from Scripture'}
            </h2>

            <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '16px',
              color: 'var(--ink3)', maxWidth: '420px', lineHeight: 1.75,
              marginBottom: '36px' }}>
              {devoMode
                ? 'Enter a theme or life situation below, or tap ✦ Devotion for a fresh devotion drawn from passages you haven\'t read yet.'
                : 'Berean searches 4,065 principles across 66 books of Scripture and responds with wisdom traceable to its source.'}
            </p>

            <div style={{ display: 'grid', gap: '8px', width: '100%', maxWidth: '520px' }}>
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => sendMessage(ex)}
                  style={{
                    padding: '13px 20px', background: 'white',
                    border: '1px solid var(--rule)',
                    color: 'var(--ink3)', cursor: 'pointer', textAlign: 'left',
                    fontFamily: "'Source Serif 4', serif", fontSize: '15px',
                    lineHeight: 1.5, boxShadow: 'var(--s1)', transition: 'all 0.15s',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = 'var(--gold2)'
                    e.currentTarget.style.color = 'var(--gold)'
                    e.currentTarget.style.background = 'var(--gold-bg)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = 'var(--s2)'
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = 'var(--rule)'
                    e.currentTarget.style.color = 'var(--ink3)'
                    e.currentTarget.style.background = 'white'
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'var(--s1)'
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} onJournalSave={saveJournal} />
          ))
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Prompt bar */}
      <div className="prompt-bar" style={{ flexShrink: 0 }}>

        {/* Mode + filter row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '10px', flexWrap: 'wrap' }}>

          {/* Devotion mode pill */}
          <button
            onClick={() => setDevoMode(v => !v)}
            className={'btn btn-outline' + (devoMode ? ' on' : '')}
            style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '100px',
              display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ fontSize: '14px' }}>✦</span>
            Devotion Mode {devoMode ? 'On' : 'Off'}
          </button>

          {/* Testament toggle */}
          <button
            onClick={cycleTestament}
            className={'btn btn-outline' + (testament !== 'both' ? ' on' : '')}
            style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '100px' }}
          >
            {testament === 'both' ? 'OT + NT' : testament === 'OT' ? 'Old Testament' : 'New Testament'}
          </button>

          {/* Theme filter */}
          <button
            onClick={() => setShowThemes(v => !v)}
            className={'btn btn-outline' + (themes.size > 0 || showThemes ? ' on' : '')}
            style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '100px',
              display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            {themes.size > 0 ? `${themes.size} Theme${themes.size > 1 ? 's' : ''}` : 'Theme'}
          </button>

          {/* Length selector */}
          <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
            {([
              ['brief',    'Brief'],
              ['standard', 'Standard'],
              ['deep',     'Deep Study'],
            ] as const).map(([val, label]) => (
              <button key={val} onClick={() => setLength(val)}
                style={{
                  padding: '6px 13px',
                  background: length === val ? 'var(--gold)' : 'transparent',
                  border: `1.5px solid ${length === val ? 'var(--gold)' : 'var(--rule)'}`,
                  color: length === val ? 'white' : 'var(--ink4)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                  borderRadius: val === 'brief' ? '100px 0 0 100px' :
                                val === 'deep'  ? '0 100px 100px 0' : '0',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Input + send */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={devoMode
              ? 'Enter a theme or life situation, or leave blank for a fresh devotion…'
              : 'Ask any life question from Scripture…'}
            rows={1}
            className="input-field"
            style={{ flex: 1, padding: '12px 16px', resize: 'none', minHeight: '46px',
              maxHeight: '120px', fontSize: '15px', lineHeight: 1.6 }}
          />
          <button
            onClick={handleSend}
            disabled={streaming}
            className="btn btn-gold"
            style={{ padding: '12px 22px', flexShrink: 0, height: '46px', gap: '7px',
              opacity: streaming ? 0.55 : 1 }}
          >
            {streaming ? (
              <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ width: '5px', height: '5px', borderRadius: '50%',
                    background: 'var(--paper)', display: 'block',
                    animation: `thinking 1.2s ease-in-out ${i*0.2}s infinite` }} />
                ))}
              </span>
            ) : (
              <>
                Send
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
