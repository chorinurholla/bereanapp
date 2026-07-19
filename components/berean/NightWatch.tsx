'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { loadLocal, saveLocal, pushToCloud, keys } from '@/lib/sync'
import { retrieve, buildContextBlock } from '@/lib/corpus'
import type { CorpusChapter } from '@/lib/corpus'
import type { JournalEntry } from '@/lib/supabase'
import {
  MODES, POSTURES, NIGHTWATCH_ANCHORS,
  buildPrayerPrompt, getModeThemes, formatPrayer,
} from '@/lib/prayer'
import type { PrayerMode, NightPosture } from '@/lib/prayer'
import { BookMarked, Check, GripVertical, X } from 'lucide-react'
import { toast } from 'sonner'

// ── The Night Watch sequencer ───────────────────────────
//
// A watch is an ordered sequence of ordinary prayer modes. Each movement is
// generated with that mode's REAL prompt and its own retrieval profile — the
// watch does not summarise or paraphrase the modes, because a compressed mode
// is a broken mode (Lament in particular is explicitly instructed not to
// resolve quickly).
//
// What makes it a *watch* rather than seven unrelated prayers: one shared
// subject carried through every movement, and a night anchor seeded into each
// movement's retrieval so the night's own texts stay present throughout.

const WATCH_COLOR = '#2a3550'

// Only the seven content modes can be movements. Nightwatch is the container,
// so including it would let a watch contain itself.
const SELECTABLE = MODES.filter(m => m.id !== 'nightwatch')

type Phase = 'build' | 'running' | 'complete'

interface Movement {
  mode:   PrayerMode
  status: 'pending' | 'generating' | 'done' | 'error'
  prayer?: string
  refs?:   string[]
}

interface WatchState {
  phase:     Phase
  subject:   string
  posture:   NightPosture
  movements: Movement[]
  current:   number
  startedAt: string
}

// Kept local rather than added to sync.ts keys(): an in-progress watch is
// transient device state, not a synced data type. It exists so a screen lock at
// 3am does not destroy a watch halfway through.
const watchKey = (uid: string) => `brn_watch_${uid.slice(0, 8)}`

const emptyWatch = (): WatchState => ({
  phase: 'build', subject: '', posture: 'communion',
  movements: [], current: 0, startedAt: '',
})

export default function NightWatch({ corpus }: { corpus: CorpusChapter[] }) {
  const { user, profile } = useAuth()
  const [w,       setW]       = useState<WatchState>(emptyWatch)
  const [resume,  setResume]  = useState<WatchState | null>(null)
  const [saved,   setSaved]   = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const inFlight = useRef<Set<number>>(new Set())

  // ── Restore an interrupted watch ──
  // localStorage is client-only, so this cannot be done during render or in a
  // lazy useState initialiser without risking a hydration mismatch. A mount
  // effect is the correct place for it here; the lint rule targets derived
  // state, which this is not.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) return
    const stored = loadLocal<WatchState | null>(watchKey(user.id), null)
    if (stored && stored.phase === 'running' && stored.movements.length) {
      setResume(stored)
    }
    setHydrated(true)
  }, [user])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Persist every change while a watch is live ──
  useEffect(() => {
    if (!user || !hydrated) return
    if (w.phase === 'running') saveLocal(watchKey(user.id), w)
    else if (w.phase === 'build') saveLocal(watchKey(user.id), null)
  }, [w, user, hydrated])

  // ── Builder actions ──
  const addMovement = (mode: PrayerMode) =>
    setW(p => ({ ...p, movements: [...p.movements, { mode, status: 'pending' }] }))

  const removeMovement = (i: number) =>
    setW(p => ({ ...p, movements: p.movements.filter((_, x) => x !== i) }))

  const moveMovement = (i: number, dir: -1 | 1) =>
    setW(p => {
      const j = i + dir
      if (j < 0 || j >= p.movements.length) return p
      const m = [...p.movements]
      ;[m[i], m[j]] = [m[j], m[i]]
      return { ...p, movements: m }
    })

  // ── Generate one movement ──
  // Uses the mode's own prompt and retrieval profile, then seeds a night anchor
  // so the watch keeps its character. Anchors rotate by index so a long watch
  // does not lean on the same passage every movement.
  //
  // Takes everything it needs as arguments rather than reading component state,
  // so it can be called immediately after a setW without seeing stale values.
  // Generation is driven from the handlers (begin / advance / retry / resume)
  // rather than an effect: an effect keyed on movement state re-fires as soon
  // as that state changes, which risks issuing the same paid API call twice.
  const generateMovement = useCallback(async (
    index:   number,
    mode:    PrayerMode,
    subject: string,
    posture: NightPosture,
    total:   number,
  ) => {
    const modeCfg = MODES.find(m => m.id === mode)
    if (!modeCfg || corpus.length === 0) return

    // Belt-and-braces against a double invocation (double tap, fast resume).
    if (inFlight.current.has(index)) return
    inFlight.current.add(index)

    setW(p => {
      const m = [...p.movements]
      if (!m[index]) return p
      m[index] = { ...m[index], status: 'generating' }
      return { ...p, movements: m }
    })

    try {
      const retrieved = retrieve(corpus, `${subject} ${modeCfg.queryBoost}`, {
        k: 3,
        selectedThemes: getModeThemes(mode),
      })

      const pool   = NIGHTWATCH_ANCHORS[posture]
      const anchor = corpus.find(c => c.id === pool[index % pool.length])

      const chapters = anchor && !retrieved.some(c => c.id === anchor.id)
        ? [anchor, ...retrieved].slice(0, 4)
        : retrieved.slice(0, 4)

      const contextBlock = buildContextBlock(chapters, { rich: true })
      const name = profile?.name || 'the reader'
      const occ  = profile?.occupation || 'daily life'
      const { prompt, maxTokens } =
        buildPrayerPrompt(mode, subject, name, occ, contextBlock, posture)

      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-5',
          max_tokens: maxTokens,
          system:     prompt,
          messages: [{
            role: 'user',
            content: `This is movement ${index + 1} of ${total} in a night watch. Generate the ${mode} prayer for: ${subject}`,
          }],
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to generate')

      const text = data.content?.[0]?.text || ''
      const refs = chapters.map(c => c.reference || c.ref || '').filter(Boolean)

      setW(p => {
        const m = [...p.movements]
        if (!m[index]) return p
        m[index] = { ...m[index], status: 'done', prayer: text, refs }
        return { ...p, movements: m }
      })
    } catch (err: unknown) {
      setW(p => {
        const m = [...p.movements]
        if (!m[index]) return p
        m[index] = { ...m[index], status: 'error' }
        return { ...p, movements: m }
      })
      toast.error((err as { message?: string })?.message || 'Could not generate this movement')
    } finally {
      inFlight.current.delete(index)
    }
  }, [corpus, profile])

  const beginWatch = () => {
    if (!w.subject.trim()) { toast.error('Name what you are bringing into the watch'); return }
    if (w.movements.length === 0) { toast.error('Add at least one movement'); return }
    setW(p => ({ ...p, phase: 'running', current: 0, startedAt: new Date().toISOString() }))
    generateMovement(0, w.movements[0].mode, w.subject, w.posture, w.movements.length)
  }

  const advance = () => {
    if (w.current < w.movements.length - 1) {
      const next = w.current + 1
      setW(p => ({ ...p, current: next }))
      if (w.movements[next]?.status === 'pending') {
        generateMovement(next, w.movements[next].mode, w.subject, w.posture, w.movements.length)
      }
    } else {
      setW(p => ({ ...p, phase: 'complete' }))
    }
  }

  const resumeWatch = (r: WatchState) => {
    setW(r)
    setResume(null)
    const mv = r.movements[r.current]
    // 'generating' is never a real in-flight state after a reload — the request
    // died with the previous page, so treat it as pending and reissue.
    if (mv && (mv.status === 'pending' || mv.status === 'generating')) {
      generateMovement(r.current, mv.mode, r.subject, r.posture, r.movements.length)
    }
  }

  const endWatch = () => {
    if (user) saveLocal(watchKey(user.id), null)
    setW(emptyWatch())
    setSaved(false)
  }

  // ── Save the whole watch as one journal entry ──
  const saveWatch = useCallback(() => {
    if (!user) return
    const done = w.movements.filter(m => m.status === 'done')
    if (!done.length) return

    const k = keys(user.id)
    const journal = loadLocal<JournalEntry[]>(k.journal, [])
    const postureLabel = POSTURES.find(p => p.id === w.posture)?.label || ''
    const dateLabel = new Date().toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })

    const body = w.movements
      .filter(m => m.status === 'done')
      .map((m, i) => {
        const label = MODES.find(x => x.id === m.mode)?.label || m.mode
        return `── MOVEMENT ${i + 1}: ${label.toUpperCase()} ──\n\n${m.prayer}`
      })
      .join('\n\n')

    const entry: JournalEntry = {
      id:         Date.now(),
      devotionId: 0,
      date:       new Date().toISOString(),
      dateLabel,
      text:       `NIGHT WATCH — ${postureLabel} — ${w.subject}\n\n${body}`,
      refs:       [...new Set(w.movements.flatMap(m => m.refs || []))].join(', '),
    }

    const updated = [entry, ...journal]
    saveLocal(k.journal, updated)
    pushToCloud(user.id, 'journal', updated)
    setSaved(true)
    toast.success('Watch saved to journal')
  }, [w, user])

  // ── Resume prompt ──
  if (resume) {
    return (
      <div style={{ padding: '22px 24px', background: 'var(--paper2)',
        borderLeft: `3px solid ${WATCH_COLOR}`, marginBottom: '28px' }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: WATCH_COLOR, marginBottom: '8px' }}>
          Watch in progress
        </div>
        <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '15.5px',
          color: 'var(--ink3)', lineHeight: 1.7, marginBottom: '18px' }}>
          You left a watch unfinished — {resume.subject}. You were on movement{' '}
          {resume.current + 1} of {resume.movements.length}.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => resumeWatch(resume)} style={btn(WATCH_COLOR, true)}>
            Resume the watch
          </button>
          <button onClick={() => {
            if (user) saveLocal(watchKey(user.id), null)
            setResume(null)
          }} style={btn('var(--rule)', false)}>
            Start fresh
          </button>
        </div>
      </div>
    )
  }

  // ══ BUILD PHASE ══
  if (w.phase === 'build') {
    return (
      <div>
        {/* Posture */}
        <div style={{ marginBottom: '26px' }}>
          <div style={labelStyle}>Choose your posture</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {POSTURES.map(p => {
              const active = w.posture === p.id
              return (
                <button key={p.id} onClick={() => setW(s => ({ ...s, posture: p.id }))}
                  style={{
                    flex: '1 1 260px', textAlign: 'left', padding: '14px 16px',
                    background: active ? 'white' : 'var(--paper2)',
                    border: `1.5px solid ${active ? WATCH_COLOR : 'var(--rule)'}`,
                    borderLeft: `3px solid ${active ? WATCH_COLOR : 'var(--rule)'}`,
                    cursor: 'pointer', boxShadow: active ? 'var(--s2)' : 'none',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <span style={{ fontSize: '14px', color: active ? WATCH_COLOR : 'var(--ink5)' }}>{p.icon}</span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
                      letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: active ? WATCH_COLOR : 'var(--ink4)' }}>{p.label}</span>
                  </div>
                  <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '13px',
                    fontStyle: 'italic', color: 'var(--ink3)', lineHeight: 1.6, margin: 0 }}>
                    {p.tagline}
                  </p>
                </button>
              )
            })}
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11.5px',
            color: 'var(--ink5)', lineHeight: 1.7, marginTop: '10px', fontStyle: 'italic' }}>
            Posture shapes which night passages are woven into every movement — the
            still texts, or the wrestling ones.
          </p>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: '26px' }}>
          <div style={labelStyle}>What are you carrying into the watch?</div>
          <textarea
            value={w.subject}
            onChange={e => setW(s => ({ ...s, subject: e.target.value }))}
            placeholder="Name it as something to pray about, not just how you feel — &ldquo;my brother's return to faith&rdquo; rather than &ldquo;I can't sleep&rdquo;. Every movement will pray this same subject in its own mode."
            rows={3}
            style={{
              width: '100%', padding: '14px 16px', boxSizing: 'border-box',
              background: 'white', border: '1.5px solid var(--rule)',
              color: 'var(--ink)', fontFamily: "'Source Serif 4', serif",
              fontSize: '16px', lineHeight: 1.7, outline: 'none', resize: 'vertical',
              boxShadow: 'var(--s1)',
            }}
            onFocus={e => e.target.style.borderColor = WATCH_COLOR}
            onBlur={e  => e.target.style.borderColor = 'var(--rule)'}
          />
        </div>

        {/* Movement picker */}
        <div style={{ marginBottom: '26px' }}>
          <div style={labelStyle}>Build your watch</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
            {SELECTABLE.map(m => (
              <button key={m.id} onClick={() => addMovement(m.id)} style={{
                padding: '8px 14px', background: 'white',
                border: '1px solid var(--rule)', color: 'var(--ink4)', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                display: 'flex', alignItems: 'center', gap: '7px', boxShadow: 'var(--s1)',
              }}>
                <span style={{ color: m.color }}>{m.icon}</span> {m.label}
                <span style={{ color: 'var(--ink5)', fontSize: '14px' }}>+</span>
              </button>
            ))}
          </div>

          {w.movements.length === 0 ? (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12.5px',
              color: 'var(--ink5)', fontStyle: 'italic', lineHeight: 1.7 }}>
              Add movements above in the order you want to pray them. A watch can be
              two movements or seven — and the same mode can appear more than once.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {w.movements.map((mv, i) => {
                const cfg = MODES.find(m => m.id === mv.mode)!
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '11px 14px', background: 'white',
                    border: '1px solid var(--rule)', borderLeft: `3px solid ${cfg.color}`,
                  }}>
                    <GripVertical size={13} style={{ color: 'var(--ink5)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                      fontWeight: 600, color: 'var(--ink5)', minWidth: '54px' }}>
                      MVT {i + 1}
                    </span>
                    <span style={{ fontSize: '13px', color: cfg.color }}>{cfg.icon}</span>
                    <span style={{ flex: 1, fontFamily: "'Source Serif 4', serif",
                      fontSize: '15px', color: 'var(--ink2)' }}>{cfg.label}</span>
                    <button onClick={() => moveMovement(i, -1)} disabled={i === 0}
                      style={miniBtn(i === 0)}>↑</button>
                    <button onClick={() => moveMovement(i, 1)} disabled={i === w.movements.length - 1}
                      style={miniBtn(i === w.movements.length - 1)}>↓</button>
                    <button onClick={() => removeMovement(i)} style={miniBtn(false)}>
                      <X size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <button onClick={beginWatch}
          disabled={!w.subject.trim() || w.movements.length === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 32px',
            background: w.subject.trim() && w.movements.length ? WATCH_COLOR : 'var(--paper2)',
            border: `1.5px solid ${w.subject.trim() && w.movements.length ? WATCH_COLOR : 'var(--rule)'}`,
            color: w.subject.trim() && w.movements.length ? 'white' : 'var(--ink4)',
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
            cursor: w.subject.trim() && w.movements.length ? 'pointer' : 'not-allowed',
            boxShadow: w.subject.trim() && w.movements.length ? 'var(--s2)' : 'none',
          }}>
          ☾ Begin the watch
          {w.movements.length > 0 && ` · ${w.movements.length} movement${w.movements.length > 1 ? 's' : ''}`}
        </button>
      </div>
    )
  }

  // ══ RUNNING PHASE ══
  if (w.phase === 'running') {
    const mv  = w.movements[w.current]
    const cfg = MODES.find(m => m.id === mv.mode)!
    const last = w.current === w.movements.length - 1

    return (
      <div className="fade-in">
        {/* Progress */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
          {w.movements.map((m, i) => (
            <div key={i} style={{
              flex: 1, height: '3px',
              background: i < w.current ? WATCH_COLOR
                : i === w.current ? 'var(--gold2)' : 'var(--rule)',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: '14px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: cfg.color }}>
            Movement {w.current + 1} of {w.movements.length} · {cfg.icon} {cfg.label}
          </div>
          <button onClick={endWatch} style={{ background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '11.5px',
            color: 'var(--ink5)' }}>
            End watch
          </button>
        </div>

        <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '15.5px',
          fontStyle: 'italic', color: 'var(--ink3)', marginBottom: '22px' }}>
          {w.subject}
        </p>

        <div style={{ padding: '30px 34px', background: 'white',
          border: '1px solid var(--rule)', borderTop: `3px solid ${cfg.color}`,
          boxShadow: 'var(--s2)', marginBottom: '22px', minHeight: '160px' }}>
          {mv.status === 'generating' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--ink4)' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--ink4)', display: 'block',
                    animation: `thinking 1.2s ease-in-out ${i*0.2}s infinite` }} />
                ))}
              </div>
              Drawing from Scripture…
            </div>
          )}

          {mv.status === 'error' && (
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                color: 'var(--ink4)', marginBottom: '14px' }}>
                This movement could not be generated.
              </p>
              <button onClick={() =>
                generateMovement(w.current, mv.mode, w.subject, w.posture, w.movements.length)
              } style={btn(WATCH_COLOR, true)}>Try again</button>
            </div>
          )}

          {mv.status === 'done' && (
            <div dangerouslySetInnerHTML={{ __html: formatPrayer(mv.prayer || '', mv.mode) }} />
          )}
        </div>

        {mv.status === 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={advance} style={btn(WATCH_COLOR, true)}>
              {last ? 'Complete the watch' : 'Continue to next movement →'}
            </button>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11.5px',
              color: 'var(--ink5)', fontStyle: 'italic' }}>
              Stay here as long as you need. Nothing is timing you.
            </span>
          </div>
        )}
      </div>
    )
  }

  // ══ COMPLETE PHASE ══
  const done = w.movements.filter(m => m.status === 'done')
  return (
    <div className="fade-in">
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: WATCH_COLOR, marginBottom: '8px' }}>
        ☾ The watch is complete
      </div>
      <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '16.5px',
        color: 'var(--ink3)', lineHeight: 1.8, marginBottom: '26px' }}>
        {done.length} movement{done.length === 1 ? '' : 's'}, praying{' '}
        <em>{w.subject}</em>.
      </p>

      {w.movements.filter(m => m.status === 'done').map((m, i) => {
        const cfg = MODES.find(x => x.id === m.mode)!
        return (
          <div key={i} style={{ marginBottom: '20px', padding: '24px 28px',
            background: 'white', border: '1px solid var(--rule)',
            borderLeft: `3px solid ${cfg.color}` }}>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10.5px',
              fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
              color: cfg.color, marginBottom: '14px' }}>
              Movement {i + 1} · {cfg.label}
            </div>
            <div dangerouslySetInnerHTML={{ __html: formatPrayer(m.prayer || '', m.mode) }} />
          </div>
        )
      })}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '24px' }}>
        {!saved ? (
          <button onClick={saveWatch} style={btn('var(--gold)', true)}>
            <BookMarked size={13} /> Save watch to journal
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px',
            background: 'var(--paper2)', border: '1px solid var(--rule)',
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--ink4)' }}>
            <Check size={13} style={{ color: 'var(--gold2)' }} /> Saved to journal
          </div>
        )}
        <button onClick={endWatch} style={btn('var(--rule)', false)}>
          Begin another watch
        </button>
      </div>
    </div>
  )
}

// ── Small style helpers ──
const labelStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--ink4)', marginBottom: '12px',
}

function btn(color: string, filled: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 22px',
    background: filled ? color : 'transparent',
    border: `1px solid ${filled ? color : 'var(--rule)'}`,
    color: filled ? 'white' : 'var(--ink4)',
    fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
    cursor: 'pointer', boxShadow: filled ? 'var(--s2)' : 'none',
  }
}

function miniBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '4px 8px', background: 'transparent', border: '1px solid var(--rule)',
    color: disabled ? 'var(--rule)' : 'var(--ink5)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
    display: 'flex', alignItems: 'center',
  }
}
