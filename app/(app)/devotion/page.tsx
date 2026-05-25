'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useCorpusChat } from '@/lib/use-corpus-chat'
import { loadLocal, saveLocal, pushToCloud, keys } from '@/lib/sync'
import { THEME_CATS } from '@/lib/corpus'
import MessageBubble from '@/components/berean/MessageBubble'
import type { CorpusChapter } from '@/lib/corpus'
import type { JournalEntry } from '@/lib/supabase'
import { Sparkles, ChevronDown, BookOpen, Filter } from 'lucide-react'

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
  const [corpus,    setCorpus]    = useState<CorpusChapter[]>([])
  const [input,     setInput]     = useState('')
  const [devoMode,  setDevoMode]  = useState(true)
  const [testament, setTestament] = useState<'OT'|'NT'|'both'>('both')
  const [themes,    setThemes]    = useState<Set<string>>(new Set())
  const [showThemes,setShowThemes]= useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load corpus
  useEffect(() => {
    fetch('/corpus.json')
      .then(r => r.json())
      .then((data: CorpusChapter[]) => setCorpus(data))
      .catch(console.error)
  }, [])

  const { messages, streaming, sendMessage } = useCorpusChat({
    corpus, devoMode, testament, selectedThemes: themes,
  })

  // Auto-scroll
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
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
    sendMessage(q)
  }

  const toggleTheme = (t: string) => {
    setThemes(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
  }

  const cycleTestament = () => {
    setTestament(t => t === 'both' ? 'OT' : t === 'OT' ? 'NT' : 'both')
  }

  const testamentLabel = { both: '📜 OT + NT', OT: '📜 OT Only', NT: '✝ NT Only' }[testament]

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">

      {/* Mode banner */}
      {devoMode && (
        <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0 font-mono text-[0.6rem] tracking-[0.16em] uppercase"
             style={{
               borderBottom: '1px solid rgba(201,168,76,0.12)',
               background: 'linear-gradient(90deg, rgba(201,168,76,0.06), transparent)',
               color: 'var(--gold)',
             }}>
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
               style={{ background: 'var(--gold)', animation: 'pulse-gold 2s infinite' }} />
          Devotion Mode — fresh principles, tracked automatically
          {themes.size > 0 && (
            <span className="ml-2 opacity-60">· {themes.size} theme{themes.size > 1 ? 's' : ''} selected</span>
          )}
        </div>
      )}

      {/* Theme selector */}
      {showThemes && (
        <div className="flex flex-wrap gap-1.5 px-4 py-3 flex-shrink-0 overflow-y-auto max-h-36"
             style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
          {THEME_CATS.map(cat => (
            <div key={cat.label} className="contents">
              <div className="w-full font-mono text-[0.5rem] tracking-[0.18em] uppercase mt-1"
                   style={{ color: 'var(--text-mute)', flexBasis: '100%' }}>
                {cat.label}
              </div>
              {cat.themes.map(t => (
                <button
                  key={t}
                  onClick={() => toggleTheme(t)}
                  className="px-2 py-1 font-mono text-[0.55rem] tracking-[0.1em] uppercase transition-all cursor-pointer"
                  style={{
                    border: `1px solid ${themes.has(t) ? 'var(--gold)' : 'var(--border2)'}`,
                    background: themes.has(t) ? 'var(--gold-dim)' : 'transparent',
                    color: themes.has(t) ? 'var(--gold)' : 'var(--text-mute)',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <div className="text-3xl mb-5 opacity-50">✦</div>
            <h2 className="text-lg mb-2 tracking-wide" style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif" }}>
              {devoMode ? 'Daily Devotion' : 'Ask Anything from Scripture'}
            </h2>
            <p className="text-sm leading-relaxed max-w-sm mb-8" style={{ color: 'var(--text-dim)' }}>
              {devoMode
                ? 'Enter a theme or life situation, or tap the button for a fresh devotion drawn from unused corpus passages.'
                : 'Berean searches 5,956 principles across 66 books to answer any life question from Scripture\'s own narrative.'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => sendMessage(ex)}
                  className="px-3 py-2 text-xs text-left transition-all cursor-pointer"
                  style={{
                    border: '1px solid var(--border2)',
                    background: 'transparent',
                    color: 'var(--text-dim)',
                    fontFamily: 'Georgia, serif',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = 'var(--gold)'
                    e.currentTarget.style.color = 'var(--gold)'
                    e.currentTarget.style.background = 'var(--gold-dim)'
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = 'var(--border2)'
                    e.currentTarget.style.color = 'var(--text-dim)'
                    e.currentTarget.style.background = 'transparent'
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

      {/* Input area */}
      <div className="flex-shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-end gap-2 px-3 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={devoMode
              ? "Enter a theme or situation — or leave blank for fresh devotion…"
              : "Ask a life question, leadership challenge, or theological question…"}
            rows={1}
            className="flex-1 resize-none outline-none text-sm leading-relaxed py-2.5 px-3"
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontFamily: 'Georgia, serif',
              minHeight: '44px', maxHeight: '120px',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--border2)'}
            onBlur={e  => e.target.style.borderColor = 'var(--border)'}
          />

          {/* Controls */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <div className="flex gap-1.5">
              {/* Theme filter */}
              <button
                onClick={() => setShowThemes(v => !v)}
                className="flex items-center gap-1 px-2.5 py-2 font-mono text-[0.55rem] tracking-[0.1em] uppercase transition-all cursor-pointer"
                style={{
                  border: `1px solid ${showThemes || themes.size > 0 ? 'var(--gold)' : 'var(--border2)'}`,
                  background: showThemes || themes.size > 0 ? 'var(--gold-dim)' : 'transparent',
                  color: showThemes || themes.size > 0 ? 'var(--gold)' : 'var(--text-mute)',
                }}
                title="Filter by theme"
              >
                <Filter size={10} />
                {themes.size > 0 ? themes.size : ''}
              </button>

              {/* Testament toggle */}
              <button
                onClick={cycleTestament}
                className="px-2.5 py-2 font-mono text-[0.5rem] tracking-[0.08em] uppercase transition-all cursor-pointer whitespace-nowrap"
                style={{
                  border: `1px solid ${testament !== 'both' ? 'var(--gold)' : 'var(--border2)'}`,
                  background: testament !== 'both' ? 'var(--gold-dim)' : 'transparent',
                  color: testament !== 'both' ? 'var(--gold)' : 'var(--text-mute)',
                }}
                title="Filter by testament"
              >
                {testament === 'both' ? 'OT+NT' : testament}
              </button>

              {/* Devotion toggle */}
              <button
                onClick={() => setDevoMode(v => !v)}
                className="flex items-center gap-1 px-2.5 py-2 font-mono text-[0.55rem] tracking-[0.1em] uppercase transition-all cursor-pointer"
                style={{
                  border: `1px solid ${devoMode ? 'var(--gold)' : 'var(--border2)'}`,
                  background: devoMode ? 'var(--gold-dim)' : 'transparent',
                  color: devoMode ? 'var(--gold)' : 'var(--text-mute)',
                }}
                title="Toggle devotion mode"
              >
                <BookOpen size={10} />
                <span className="hidden sm:inline">{devoMode ? 'Devo On' : 'Devo'}</span>
              </button>
            </div>

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={streaming}
              className="flex items-center justify-center px-3 py-2 transition-all cursor-pointer"
              style={{
                background: 'var(--gold-dim)', border: '1px solid var(--gold)',
                color: 'var(--gold)', opacity: streaming ? 0.5 : 1,
                fontSize: '18px', lineHeight: 1,
              }}
              title="Send (Enter)"
            >
              ›
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 pb-2 flex gap-4 font-mono text-[0.5rem] tracking-[0.1em] uppercase"
             style={{ color: 'var(--text-mute)' }}>
          <span>{corpus.length > 0 ? `${corpus.length} chapters` : 'Loading corpus…'}</span>
          <span>·</span>
          <span>5,956 principles</span>
          <span>·</span>
          <span>66 books</span>
        </div>
      </div>
    </div>
  )
}
