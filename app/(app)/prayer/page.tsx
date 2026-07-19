'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { loadLocal, saveLocal, pushToCloud, keys } from '@/lib/sync'
import { retrieve, buildContextBlock } from '@/lib/corpus'
import type { CorpusChapter } from '@/lib/corpus'
import type { JournalEntry } from '@/lib/supabase'
import {
  MODES, buildPrayerPrompt, getModeThemes, formatPrayer,
} from '@/lib/prayer'
import type { PrayerMode, PrayerResult } from '@/lib/prayer'
import NightWatch from '@/components/berean/NightWatch'
import { BookMarked, Copy, Check, Share2 } from 'lucide-react'
import { toast } from 'sonner'

export default function PrayerPage() {
  const { user, profile } = useAuth()
  const [corpus,    setCorpus]    = useState<CorpusChapter[]>([])
  // Night Watch is handled by <NightWatch/>, so this page only ever runs the
  // seven single-prayer modes. No posture state is needed here.
  const [mode,      setMode]      = useState<PrayerMode>('adoration')
  const [situation, setSituation] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState<PrayerResult | null>(null)
  const [copied,    setCopied]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/corpus.json').then(r => r.json()).then(setCorpus).catch(console.error)
  }, [])

  const currentMode = MODES.find(m => m.id === mode)!

  const handleModeChange = (newMode: PrayerMode) => {
    setMode(newMode)
    setResult(null)
    setSaved(false)
    setSituation('')
  }

  const generatePrayer = useCallback(async () => {
    if (!situation.trim() || loading || corpus.length === 0) return

    setLoading(true)
    setResult(null)
    setSaved(false)

    const chapters = retrieve(corpus, situation + ' ' + currentMode.queryBoost, {
      k: 4,
      selectedThemes: getModeThemes(mode),
    })

    // Rich mode: supplies verse-level citations, the principle text, and leap
    // flags. Prayer needs these to anchor on the Word; devotion and Ask keep
    // the standard block.
    const contextBlock = buildContextBlock(chapters, { rich: true })
    const name = profile?.name || 'the reader'
    const occ  = profile?.occupation || 'daily life'
    const { prompt, maxTokens } = buildPrayerPrompt(mode, situation, name, occ, contextBlock)

    try {
      const response = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-5',
          max_tokens: maxTokens,
          system:     prompt,
          messages:   [{ role: 'user', content: `Generate the ${mode} prayer for: ${situation}` }],
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to generate prayer')

      const prayerText = data.content?.[0]?.text || ''
      const refs = chapters.map(c => c.reference || c.ref || '').filter(Boolean)

      setResult({
        mode,
        situation: situation.trim(), prayer: prayerText,
        refs,
        date: new Date().toLocaleDateString('en-GB', {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        }),
      })
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'Failed to generate prayer')
    } finally {
      setLoading(false)
    }
  }, [situation, mode, corpus, profile, loading, currentMode])

  const savePrayer = useCallback(() => {
    if (!result || !user) return
    const k = keys(user.id)
    const journal = loadLocal<JournalEntry[]>(k.journal, [])
    const modeLabel = MODES.find(m => m.id === result.mode)?.label || result.mode
    const entry: JournalEntry = {
      id:         Date.now(),
      devotionId: 0,
      date:       new Date().toISOString(),
      dateLabel:  result.date,
      text:       `${modeLabel.toUpperCase()} — ${result.situation}\n\n${result.prayer}`,
      refs:       result.refs.join(', '),
    }
    const updated = [entry, ...journal]
    saveLocal(k.journal, updated)
    pushToCloud(user.id, 'journal', updated)
    setSaved(true)
    toast.success('Prayer saved to journal')
  }, [result, user])

  const copyPrayer = useCallback(async () => {
    if (!result) return
    const plain = result.prayer.replace(/\*\*(.*?)\*\*/g, '$1')
    await navigator.clipboard.writeText(plain).catch(() => {})
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  const sharePrayer = useCallback(async () => {
    if (!result) return
    const plain = result.prayer.replace(/\*\*(.*?)\*\*/g, '$1')
    const modeLabel = MODES.find(m => m.id === result.mode)?.label || ''
    const text = `${modeLabel} — ${result.date}\n\n${plain}\n\n— Berean Biblical Principles`
    if (navigator.share) {
      await navigator.share({ title: `Berean ${modeLabel}`, text }).catch(() => {})
    } else {
      window.open('https://wa.me/?text=' + encodeURIComponent(text.substring(0, 4000)), '_blank')
    }
  }, [result])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

      {/* Page header */}
      <div style={{
        padding: '20px 32px 0',
        background: 'var(--paper)',
        borderBottom: '1px solid var(--rule)',
        flexShrink: 0,
      }}>
        <div style={{ marginBottom: '14px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px',
            fontWeight: 500, color: 'var(--ink)', marginBottom: '4px' }}>
            Prayer Workshop
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--ink4)' }}>
            Eight modes of prayer — each one grounded in your corpus
          </p>
        </div>

        {/* Mode tabs — scrollable on mobile */}
        <div style={{ display: 'flex', overflowX: 'auto', gap: '0',
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {MODES.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {/* Night Watch answers "when do you pray", not "what kind of prayer" —
                a different axis from the other seven, so it is set apart. */}
            {m.id === 'nightwatch' && (
              <span aria-hidden style={{ width: '1px', height: '18px',
                background: 'var(--rule)', margin: '0 10px', flexShrink: 0 }} />
            )}
            <button onClick={() => handleModeChange(m.id)} style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: mode === m.id ? `2px solid ${m.color}` : '2px solid transparent',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: mode === m.id ? 600 : 400,
              color: mode === m.id ? m.color : 'var(--ink4)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: '6px',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '13px' }}>{m.icon}</span>
              {m.label}
            </button>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '28px 32px', maxWidth: '760px', width: '100%', margin: '0 auto' }}>

        {/* Mode description card */}
        <div style={{
          marginBottom: '28px', padding: '18px 22px',
          background: 'var(--paper2)',
          borderLeft: `3px solid ${currentMode.color}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
            <span style={{ fontSize: '16px' }}>{currentMode.icon}</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase', color: currentMode.color }}>
              {currentMode.label}
            </span>
          </div>
          <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '15px',
            fontStyle: 'italic', color: 'var(--ink3)', lineHeight: 1.7, margin: '0 0 8px' }}>
            {currentMode.tagline}
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            color: 'var(--ink4)', lineHeight: 1.7, margin: 0 }}>
            {currentMode.description}
          </p>
        </div>

        {/* ── Night Watch is a sequencer, not a single prayer ──
            It composes the other seven modes into an ordered watch, each
            movement generated with that mode's own prompt. So it replaces the
            single-prayer flow entirely rather than sitting alongside it. */}
        {mode === 'nightwatch' ? (
          <NightWatch corpus={corpus} />
        ) : (
        <>
        {/* Input area */}
        {!result && (
          <div>
            <label style={{ display: 'block', fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: '10px' }}>
              {currentMode.promptLabel}
            </label>

            <textarea
              ref={textareaRef}
              value={situation}
              onChange={e => setSituation(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) generatePrayer() }}
              placeholder={currentMode.placeholder}
              rows={4}
              style={{
                width: '100%', padding: '16px 18px', boxSizing: 'border-box',
                background: 'white', border: '1.5px solid var(--rule)',
                color: 'var(--ink)', fontFamily: "'Source Serif 4', serif",
                fontSize: '16px', lineHeight: 1.7, outline: 'none',
                resize: 'vertical', boxShadow: 'var(--s1)',
                transition: 'border-color 0.2s', marginBottom: '20px',
              }}
              onFocus={e => e.target.style.borderColor = currentMode.color}
              onBlur={e  => e.target.style.borderColor = 'var(--rule)'}
            />

            {/* Examples */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600,
                letterSpacing: '0.16em', textTransform: 'uppercase',
                color: 'var(--ink5)', marginBottom: '10px' }}>
                Examples
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {currentMode.examples.map(ex => (
                  <button key={ex} onClick={() => setSituation(ex)} style={{
                    padding: '7px 14px', background: 'white',
                    border: '1px solid var(--rule)', color: 'var(--ink4)',
                    cursor: 'pointer', fontFamily: "'Source Serif 4', serif",
                    fontSize: '13px', transition: 'all 0.15s', boxShadow: 'var(--s1)',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = currentMode.color
                    e.currentTarget.style.color = currentMode.color
                    e.currentTarget.style.background = 'var(--gold-bg)'
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = 'var(--rule)'
                    e.currentTarget.style.color = 'var(--ink4)'
                    e.currentTarget.style.background = 'white'
                  }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={generatePrayer}
              disabled={loading || !situation.trim() || corpus.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '14px 32px',
                background: situation.trim() && !loading ? currentMode.color : 'var(--paper2)',
                border: `1.5px solid ${situation.trim() && !loading ? currentMode.color : 'var(--rule)'}`,
                color: situation.trim() && !loading ? 'white' : 'var(--ink4)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                cursor: situation.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: situation.trim() && !loading ? 'var(--s2)' : 'none',
              }}
              onMouseOver={e => { if (situation.trim() && !loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseOut={e  => { e.currentTarget.style.transform = 'none' }}
            >
              {loading ? (
                <>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%',
                        background: situation.trim() ? 'white' : 'var(--ink4)', display: 'block',
                        animation: `thinking 1.2s ease-in-out ${i*0.2}s infinite` }}/>
                    ))}
                  </div>
                  Drawing from Scripture…
                </>
              ) : (
                <>
                  <span style={{ fontSize: '16px' }}>{currentMode.icon}</span>
                  Generate {currentMode.label}
                </>
              )}
            </button>
          </div>
        )}

        {/* Prayer result */}
        {result && (
          <div className="fade-in">
            {/* Result header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', gap: '16px',
              marginBottom: '24px', paddingBottom: '20px',
              borderBottom: '1px solid var(--rule)', flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                  fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: currentMode.color, marginBottom: '4px' }}>
                  {currentMode.icon} {currentMode.label} · {result.date}
                </div>
                <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '16px',
                  color: 'var(--ink3)', fontStyle: 'italic' }}>
                  {result.situation}
                </p>
                {result.refs.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {result.refs.map(r => (
                      <span key={r} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px',
                        fontWeight: 500, padding: '2px 10px', borderRadius: '100px',
                        background: 'var(--paper2)', border: '1px solid var(--rule2)',
                        color: 'var(--gold2)' }}>{r}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => { setResult(null); setSaved(false); setSituation('') }}
                style={{ padding: '8px 16px', background: 'transparent',
                  border: '1px solid var(--rule)', color: 'var(--ink4)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
                onMouseOver={e => { e.currentTarget.style.borderColor='var(--gold2)'; e.currentTarget.style.color='var(--gold)' }}
                onMouseOut={e  => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--ink4)' }}>
                ← New Prayer
              </button>
            </div>

            {/* Prayer text */}
            <div style={{
              padding: '32px 36px', background: 'white',
              border: '1px solid var(--rule)',
              borderTop: `3px solid ${currentMode.color}`,
              boxShadow: 'var(--s2)', marginBottom: '24px',
            }}>
              <div dangerouslySetInnerHTML={{ __html: formatPrayer(result.prayer, result.mode) }} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {!saved ? (
                <button onClick={savePrayer} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px',
                  background: 'var(--gold)', color: 'white', border: 'none',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', boxShadow: 'var(--s2)', transition: 'all 0.15s' }}
                  onMouseOver={e => { e.currentTarget.style.background='var(--gold2)'; e.currentTarget.style.transform='translateY(-1px)' }}
                  onMouseOut={e  => { e.currentTarget.style.background='var(--gold)'; e.currentTarget.style.transform='none' }}>
                  <BookMarked size={13} /> Save to Journal
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px',
                  background: 'var(--paper2)', border: '1px solid var(--rule)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--ink4)' }}>
                  <BookMarked size={13} style={{ color: 'var(--gold2)' }} /> Saved to journal
                </div>
              )}

              <button onClick={copyPrayer} style={{
                display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px',
                background: 'transparent', border: '1px solid var(--rule)', color: 'var(--ink4)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor='var(--gold2)'; e.currentTarget.style.color='var(--gold)' }}
                onMouseOut={e  => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--ink4)' }}>
                {copied ? <Check size={12}/> : <Copy size={12}/>}
                {copied ? 'Copied' : 'Copy'}
              </button>

              <button onClick={sharePrayer} style={{
                display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px',
                background: 'transparent', border: '1px solid var(--rule)', color: 'var(--ink4)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor='var(--gold2)'; e.currentTarget.style.color='var(--gold)' }}
                onMouseOut={e  => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--ink4)' }}>
                <Share2 size={12}/> Share
              </button>

              <button onClick={generatePrayer} style={{
                display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px',
                background: 'transparent',
                border: `1px solid ${currentMode.color}40`,
                color: currentMode.color,
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s', marginLeft: 'auto' }}
                onMouseOver={e => e.currentTarget.style.background='var(--gold-bg)'}
                onMouseOut={e  => e.currentTarget.style.background='transparent'}>
                ↺ Regenerate
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}
