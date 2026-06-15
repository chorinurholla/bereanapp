'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { loadLocal, saveLocal, pushToCloud, keys } from '@/lib/sync'
import { retrieve, buildContextBlock, tokenize, expandTokens } from '@/lib/corpus'
import type { CorpusChapter } from '@/lib/corpus'
import type { JournalEntry } from '@/lib/supabase'
import { BookMarked, Copy, Check, Share2 } from 'lucide-react'
import { toast } from 'sonner'

// ── Prayer mode definitions ──
const MODES = [
  {
    id:          'situational' as const,
    label:       'Situational Prayer',
    icon:        '🙏',
    tagline:     'Pray over a specific situation, decision, or challenge',
    placeholder: 'Describe the situation you need to pray over — a decision, a relationship, a challenge, a fear, a next step…',
    promptLabel: 'What situation do you need to pray over?',
    examples: [
      'A business decision I am unsure about',
      'A broken relationship I need to address',
      'A season of financial pressure',
      'A leadership challenge I am facing',
      'Fear about stepping into a new calling',
      'A conflict with someone I work closely with',
    ],
  },
  {
    id:          'intercessory' as const,
    label:       'Intercessory Prayer',
    icon:        '✋',
    tagline:     'Stand in the gap for a person, community, or nation',
    placeholder: 'Who or what are you interceding for? Name a person, a community, a church, a city, a nation…',
    promptLabel: 'Who or what are you standing in the gap for?',
    examples: [
      'My family and children',
      'A friend walking through grief',
      'My church community',
      'My city and its leaders',
      'A prodigal who has walked away from faith',
      'Nigeria and its leaders',
    ],
  },
  {
    id:          'declaration' as const,
    label:       'Covenant Declaration',
    icon:        '⚔️',
    tagline:     'Speak what God has said over what you see',
    placeholder: 'What covenant reality, promise, or calling do you want to declare over? Name the situation and what you are standing on…',
    promptLabel: 'What are you declaring over?',
    examples: [
      'My identity in Christ over shame and accusation',
      'God\'s provision over financial scarcity',
      'The calling on my life that still feels distant',
      'Healing and restoration over my family',
      'God\'s sovereignty over a situation that feels out of control',
      'The promises of God over a long-awaited breakthrough',
    ],
  },
]

type PrayerMode = 'situational' | 'intercessory' | 'declaration'

interface PrayerResult {
  mode: PrayerMode
  situation: string
  prayer: string
  refs: string[]
  date: string
}

// ── System prompts for each mode ──
function buildPrayerPrompt(
  mode: PrayerMode,
  situation: string,
  name: string,
  occ: string,
  contextBlock: string
): string {
  const base = `You are Berean, generating a deeply biblical, Spirit-led prayer for ${name} (${occ}). Draw exclusively from the provided corpus passages. Every section of the prayer must be traceable to a specific biblical principle from the corpus.`

  const formats: Record<PrayerMode, string> = {
    situational: `
SITUATION: ${situation}

Generate a SITUATIONAL PRAYER structured in four movements. This prayer is meant to be prayed aloud, not just read. Write it in first person as if ${name} is speaking directly to God.

STRUCTURE:

**IDENTITY IN CHRIST**
Begin by declaring who the person is before God — not based on the situation, but based on covenant reality. 2-4 sentences. Draw from corpus principles about identity, sonship, or standing before God.

**BRINGING THE SITUATION HONESTLY**
Name the situation honestly before God — the fear, the uncertainty, the weight of it. This is lament and petition combined. Do not spiritualise the difficulty away. 3-5 sentences.

**COVENANT PROMISES OVER THE SITUATION**
Speak specific promises from Scripture directly over the named situation. These must come from the retrieved corpus passages. 3-5 declarative sentences beginning with "You have said…" or "Your word declares…"

**ALIGNMENT AND SURRENDER**
Yield the situation to God's purposes. Not passive resignation — active trust. 2-3 sentences.

**SPOKEN DECLARATIONS**
3-5 bold present-tense declarations beginning with "I declare…" or "By the authority of Your word…" — speaking what God has said into the specific situation.

Close: "In Jesus' Name, Amen."

Total: 400-600 words. The prayer should feel like it was written specifically for this person and this situation — not generic.

CORPUS PASSAGES:
${contextBlock}`,

    intercessory: `
INTERCESSION SUBJECT: ${situation}

Generate an INTERCESSORY PRAYER following the biblical pattern of intercession — standing in the gap between God and the one being prayed for. Write it in first person as if ${name} is speaking directly to God on behalf of another.

STRUCTURE:

**APPROACHING THE THRONE**
Acknowledge who God is in relation to the subject of intercession — His character, His commitment, His covenant. 2-3 sentences. Draw from corpus principles about God's nature and His responsiveness to intercession.

**NAMING THE NEED**
Name the specific need of the person, community, or nation being interceded for. Be specific, not vague. 3-4 sentences. Include what is seen (the presenting situation) and what is unseen (the deeper need beneath it).

**BIBLICAL GROUNDS FOR THE REQUEST**
Cite the biblical basis for this prayer — not formulas, but genuine covenant grounds. Phrases like "On the basis of Your promise in…" or "Because You are the God who…" 3-5 sentences drawn directly from the corpus passages.

**SPEAKING OVER THEM**
Speak specific blessings, protections, and covenant realities over the subject of intercession. 4-6 sentences beginning with "May they…" or "Let them know…" or "Bring them to…"

**THE INTERCESSOR'S POSTURE**
Close with the intercessor's own commitment — to keep standing in the gap, to not be moved by what is seen. 2-3 sentences.

Close: "In Jesus' Name, Amen."

Total: 450-650 words. The prayer should feel like genuine intercession, not a wish list.

CORPUS PASSAGES:
${contextBlock}`,

    declaration: `
DECLARATION SUBJECT: ${situation}

Generate a COVENANT DECLARATION — a structured spoken declaration of what God has said, spoken directly into the named situation. This is not petition — it is declaration. Write it as bold, present-tense covenant speech in first person.

STRUCTURE:

**WHO I AM — Identity Declarations**
4-6 bold declarations of covenant identity. Each begins with "I am…" or "I stand as…" — drawn from corpus principles about identity, calling, sonship, and covenant standing. These are not affirmations — they are covenant realities.

**WHAT GOD HAS SAID — Covenant Declarations**
5-7 declarations of what God has specifically spoken over the named situation. Each begins with "God has declared…" or "His word says over this…" — drawn directly from corpus principles. These must be traceable to specific passages.

**WHAT I DECLARE OVER THIS SITUATION**
5-8 bold present-tense declarations spoken directly into the named situation. Each begins with "I declare…" or "By the covenant of God…" — naming the specific situation and speaking the opposing covenant reality over it.

**WHAT I REFUSE**
3-4 declarative refusals — naming what is being rejected. Each begins with "I refuse…" or "I will not accept…" — naming the lie, the fear, or the accusation, then declaring what covenant truth displaces it.

**THE DECLARATION STAND**
Close with a statement of covenant standing — not aggressive, but settled. 2-3 sentences of quiet, grounded confidence in what has been declared.

Close: "This is my declaration. In Jesus' Name, Amen."

Total: 500-700 words. The declaration should feel weighty, specific, and spoken — not abstract or generic.

CORPUS PASSAGES:
${contextBlock}`,
  }

  return base + formats[mode]
}

export default function PrayerPage() {
  const { user, profile } = useAuth()
  const [corpus,    setCorpus]    = useState<CorpusChapter[]>([])
  const [mode,      setMode]      = useState<PrayerMode>('situational')
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

    // Retrieve relevant corpus chapters
    const tokens = expandTokens(tokenize(situation + ' prayer ' + mode))
    const chapters = retrieve(corpus, situation + ' prayer covenant', {
      k: 4,
      selectedThemes: new Set(['prayer', 'covenant', 'faith', 'sovereignty']),
    })

    const contextBlock = buildContextBlock(chapters)
    const name = profile?.name || 'the reader'
    const occ  = profile?.occupation || 'daily life'
    const systemPrompt = buildPrayerPrompt(mode, situation, name, occ, contextBlock)

    try {
      const response = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-5',
          max_tokens: 1500,
          system:     systemPrompt,
          messages:   [{ role: 'user', content: `Generate the ${mode} prayer for: ${situation}` }],
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to generate prayer')

      const prayerText = data.content?.[0]?.text || ''
      const refs = chapters.map(c => c.reference || c.ref || '').filter(Boolean)

      setResult({
        mode,
        situation: situation.trim(),
        prayer:    prayerText,
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
  }, [situation, mode, corpus, profile, loading])

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
    const plain = result.prayer
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\[PRINCIPLE\](.*?)\[\/PRINCIPLE\]/gs, '$1')
    await navigator.clipboard.writeText(plain).catch(() => {})
    setCopied(true)
    toast.success('Prayer copied to clipboard')
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

  // Format prayer text for display
  function formatPrayer(text: string): string {
    if (!text) return ''
    const headingStyle = [
      'font-family:DM Sans,sans-serif',
      'font-size:9.5px',
      'font-weight:700',
      'letter-spacing:0.22em',
      'text-transform:uppercase',
      'color:var(--gold)',
      'margin:28px 0 10px',
      'padding-bottom:8px',
      'border-bottom:1px solid var(--rule)',
      'display:block',
    ].join(';')
    let t = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    t = t.replace(/\*\*(.*?)\*\*/g, `<strong style="${headingStyle}">$1</strong>`)
    t = t.replace(/^#{1,3} (.+)$/gm, `<strong style="${headingStyle}">$1</strong>`)
    t = t.split(/\n\n+/).map(p => {
      const trimmed = p.trim()
      if (!trimmed) return ''
      // Lines starting with "I declare", "I am", "God has" get declaration styling
      if (/^(I declare|I am|I stand|I refuse|I will not|God has|By the|His word|May they|Let them|Bring them)/m.test(trimmed)) {
        return '<p style="margin-bottom:10px;padding-left:16px;border-left:3px solid var(--gold2);font-family:Source Serif 4,serif;font-size:16px;line-height:1.8;color:var(--ink);font-style:italic">' +
          trimmed.replace(/\n/g, '<br>') + '</p>'
      }
      return '<p style="margin-bottom:14px;font-family:Source Serif 4,serif;font-size:16.5px;line-height:1.85;color:var(--ink2)">' +
        trimmed.replace(/\n/g, '<br>') + '</p>'
    }).join('')
    return t
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

      {/* Page header */}
      <div style={{
        padding: '24px 32px 0',
        background: 'var(--paper)',
        borderBottom: '1px solid var(--rule)',
        flexShrink: 0,
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '26px', fontWeight: 500,
            color: 'var(--ink)', marginBottom: '4px',
          }}>
            Prayer Workshop
          </h1>
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--ink4)',
          }}>
            Scripture-grounded prayer drawn from the corpus — specific, structured, speakable
          </p>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: '0' }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => handleModeChange(m.id)} style={{
              padding: '11px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: mode === m.id ? '2px solid var(--gold2)' : '2px solid transparent',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: mode === m.id ? 600 : 400,
              color: mode === m.id ? 'var(--gold)' : 'var(--ink4)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: '-1px',
              display: 'flex', alignItems: 'center', gap: '7px',
              whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: '14px' }}>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '32px', maxWidth: '760px', width: '100%', margin: '0 auto' }}>

        {/* Mode description */}
        <div style={{
          marginBottom: '28px',
          padding: '16px 20px',
          background: 'var(--paper2)',
          borderLeft: '3px solid var(--gold2)',
        }}>
          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--gold)', marginBottom: '5px',
          }}>
            {currentMode.icon} {currentMode.label}
          </div>
          <p style={{
            fontFamily: "'Source Serif 4', serif", fontSize: '15px',
            fontStyle: 'italic', color: 'var(--ink3)', lineHeight: 1.6, margin: 0,
          }}>
            {currentMode.tagline}
          </p>
        </div>

        {/* Input area */}
        {!result && (
          <div>
            <label style={{
              display: 'block',
              fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--ink4)', marginBottom: '10px',
            }}>
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
                width: '100%', padding: '16px 18px',
                background: 'white', border: '1.5px solid var(--rule)',
                color: 'var(--ink)', fontFamily: "'Source Serif 4', serif",
                fontSize: '16px', lineHeight: 1.7,
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                boxShadow: 'var(--s1)', transition: 'border-color 0.2s',
                marginBottom: '20px',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--gold2)' }}
              onBlur={e  => { e.target.style.borderColor = 'var(--rule)'  }}
            />

            {/* Example prompts */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600,
                letterSpacing: '0.16em', textTransform: 'uppercase',
                color: 'var(--ink5)', marginBottom: '10px',
              }}>
                Examples
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {currentMode.examples.map(ex => (
                  <button key={ex} onClick={() => setSituation(ex)} style={{
                    padding: '7px 14px',
                    background: 'white', border: '1px solid var(--rule)',
                    color: 'var(--ink4)', cursor: 'pointer',
                    fontFamily: "'Source Serif 4', serif", fontSize: '13px',
                    transition: 'all 0.15s', boxShadow: 'var(--s1)',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = 'var(--gold2)'
                    e.currentTarget.style.color = 'var(--gold)'
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
                background: situation.trim() && !loading ? 'var(--gold)' : 'var(--paper2)',
                border: `1.5px solid ${situation.trim() && !loading ? 'var(--gold)' : 'var(--rule)'}`,
                color: situation.trim() && !loading ? 'white' : 'var(--ink4)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                cursor: situation.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: situation.trim() && !loading ? 'var(--s2)' : 'none',
              }}
              onMouseOver={e => {
                if (situation.trim() && !loading) {
                  e.currentTarget.style.background = 'var(--gold2)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'none'
                if (situation.trim() && !loading) e.currentTarget.style.background = 'var(--gold)'
              }}
            >
              {loading ? (
                <>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: 'var(--ink4)', display: 'block',
                        animation: `thinking 1.2s ease-in-out ${i*0.2}s infinite`,
                      }}/>
                    ))}
                  </div>
                  <span>Drawing from Scripture…</span>
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
              borderBottom: '1px solid var(--rule)',
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--gold)', marginBottom: '4px',
                }}>
                  {currentMode.icon} {currentMode.label} · {result.date}
                </div>
                <p style={{
                  fontFamily: "'Source Serif 4', serif", fontSize: '16px',
                  color: 'var(--ink3)', fontStyle: 'italic',
                }}>
                  {result.situation}
                </p>
                {result.refs.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {result.refs.map(r => (
                      <span key={r} style={{
                        fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 500,
                        padding: '2px 10px', borderRadius: '100px',
                        background: 'var(--paper2)', border: '1px solid var(--rule2)',
                        color: 'var(--gold2)',
                      }}>{r}</span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => { setResult(null); setSaved(false); setSituation('') }}
                style={{
                  padding: '8px 16px', background: 'transparent',
                  border: '1px solid var(--rule)', color: 'var(--ink4)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--gold2)'; e.currentTarget.style.color = 'var(--gold)' }}
                onMouseOut={e  => { e.currentTarget.style.borderColor = 'var(--rule)';  e.currentTarget.style.color = 'var(--ink4)' }}
              >
                ← New Prayer
              </button>
            </div>

            {/* Prayer text */}
            <div style={{
              padding: '32px 36px',
              background: 'white',
              border: '1px solid var(--rule)',
              borderTop: '3px solid var(--gold2)',
              boxShadow: 'var(--s2)',
              marginBottom: '24px',
            }}>
              <div
                dangerouslySetInnerHTML={{ __html: formatPrayer(result.prayer) }}
              />
            </div>

            {/* Action bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              flexWrap: 'wrap',
            }}>
              {/* Save to journal */}
              {!saved ? (
                <button onClick={savePrayer} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 22px',
                  background: 'var(--gold)', color: 'white',
                  border: 'none', fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  boxShadow: 'var(--s2)', transition: 'all 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--gold2)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseOut={e  => { e.currentTarget.style.background = 'var(--gold)';  e.currentTarget.style.transform = 'none' }}>
                  <BookMarked size={13} />
                  Save to Journal
                </button>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '10px 18px',
                  background: 'var(--paper2)', border: '1px solid var(--rule)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--ink4)',
                }}>
                  <BookMarked size={13} style={{ color: 'var(--gold2)' }} />
                  Saved to journal
                </div>
              )}

              <button onClick={copyPrayer} style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 18px', background: 'transparent',
                border: '1px solid var(--rule)', color: 'var(--ink4)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--gold2)'; e.currentTarget.style.color = 'var(--gold)' }}
              onMouseOut={e  => { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.color = 'var(--ink4)' }}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>

              <button onClick={sharePrayer} style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 18px', background: 'transparent',
                border: '1px solid var(--rule)', color: 'var(--ink4)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--gold2)'; e.currentTarget.style.color = 'var(--gold)' }}
              onMouseOut={e  => { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.color = 'var(--ink4)' }}>
                <Share2 size={12} />
                Share
              </button>

              <button onClick={generatePrayer} style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 18px', background: 'transparent',
                border: '1px solid var(--border2,rgba(154,123,58,0.3))',
                color: 'var(--gold)', fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s', marginLeft: 'auto',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--gold-bg)' }}
              onMouseOut={e  => { e.currentTarget.style.background = 'transparent' }}>
                ↺ Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
