'use client'

import { useState, useRef } from 'react'
import { Copy, Check, Share2, BookMarked } from 'lucide-react'
import { toast } from 'sonner'
import type { Message } from '@/lib/use-corpus-chat'

// Extract the prayer section from a devotion response
function extractPrayer(text: string): string | null {
  // Match **PRAYER** or ## PRAYER or PRAYER section
  const patterns = [
    /\*\*PRAYER\*\*\s*\n([\s\S]+?)(?=\n\*\*[A-Z]|\n##|\n---|\Z|$(?![\s\S]))/im,
    /##\s*PRAYER\s*\n([\s\S]+?)(?=\n##|\n\*\*[A-Z]|\Z)/im,
    /\bPRAYER\b\s*\n([\s\S]+?)(?=\n[A-Z]{2,}|\Z)/m,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1] && match[1].trim().length > 40) {
      return match[1].trim()
    }
  }
  // Fallback: find text after "In Jesus' Name" signature
  const jesusIdx = text.toLowerCase().indexOf("in jesus")
  if (jesusIdx > 0) {
    // Go back ~800 chars to find start of prayer
    const start = Math.max(0, jesusIdx - 800)
    const prayerSection = text.slice(start, jesusIdx + 40)
    // Find the prayer heading
    const prayerHeading = prayerSection.search(/prayer|1\.\s*identity|identity in christ/i)
    if (prayerHeading > -1) {
      return prayerSection.slice(prayerHeading).trim()
    }
  }
  return null
}

function formatContent(text: string): string {
  if (!text) return ''
  let t = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Principle blocks
  t = t.replace(/\[PRINCIPLE\](.*?)\[\/PRINCIPLE\]/gs,
    '<div class="principle-block">$1</div>')
  // Warning blocks
  t = t.replace(/\[WARNING\](.*?)\[\/WARNING\]/gs,
    '<div class="warning-block">⚠ $1</div>')
  // Bold, italic
  t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/\*((?!\*)[^*]+)\*/g, '<em>$1</em>')
  // Headers
  t = t.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  t = t.replace(/^## (.+)$/gm,  '<h3>$1</h3>')
  // Blockquotes
  t = t.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
  // Paragraphs
  t = t.split(/\n\n+/).map(p => p.trim() ? `<p>${p.replace(/\n/g, '<br>')}</p>` : '').join('')
  return t
}

function ThinkingDots() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'7px', padding:'8px 0' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:'8px', height:'8px', borderRadius:'50%',
          background:'var(--gold3)',
          animation:`thinking 1.2s ease-in-out ${i*0.2}s infinite`,
        }}/>
      ))}
    </div>
  )
}

function ReadAloudButton({ text }: { text: string }) {
  const [state,    setState]    = useState<'idle'|'loading'|'playing'|'paused'>('idle')
  const audioRef  = useRef<HTMLAudioElement | null>(null)

  const cleanText = (raw: string) => raw
    .replace(/\[PRINCIPLE\]([\s\S]*?)\[\/PRINCIPLE\]/g, '$1')
    .replace(/\[WARNING\]([\s\S]*?)\[\/WARNING\]/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,3} /gm, '')
    .replace(/---+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .substring(0, 4000)

  const browserTTS = (clean: string) => {
    window.speechSynthesis?.cancel()
    const utter = new SpeechSynthesisUtterance(clean.substring(0, 3000))
    utter.rate  = 0.88
    utter.pitch = 0.95
    utter.onend = () => setState('idle')
    window.speechSynthesis.speak(utter)
    setState('playing')
  }

  const handlePlay = async () => {
    // Toggle play/pause on already-loaded audio
    if (audioRef.current) {
      if (state === 'playing') {
        audioRef.current.pause()
        setState('paused')
      } else {
        await audioRef.current.play().catch(() => {})
        setState('playing')
      }
      return
    }

    const clean = cleanText(text)

    // ── iOS Safari fix: create and unlock Audio element BEFORE any async work ──
    // iOS requires the Audio object to be created synchronously inside a user
    // gesture handler. Once we await fetch(), the gesture context is lost.
    // Solution: create Audio immediately, set src after fetch completes.
    const audio = new Audio()
    audio.setAttribute('playsinline', 'true')   // prevent fullscreen on iOS
    audio.setAttribute('webkit-playsinline', 'true')
    // Unlock audio context on iOS with a silent play call
    audio.play().catch(() => {})
    audio.pause()
    audioRef.current = audio
    setState('loading')

    try {
      const res = await fetch('/api/tts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: clean, voice: 'nova' }),
      })

      const contentType = res.headers.get('Content-Type') || ''

      if (contentType.includes('audio')) {
        // ✅ OpenAI TTS — set src on the pre-created audio element
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        audio.src  = url
        await audio.play()
        setState('playing')
        audio.onended = () => {
          setState('idle')
          audioRef.current = null
          URL.revokeObjectURL(url)
        }
        audio.onerror = () => {
          // Audio failed to play — fall back to browser TTS
          setState('idle')
          audioRef.current = null
          URL.revokeObjectURL(url)
          browserTTS(clean)
        }
      } else {
        // Server returned JSON fallback signal
        const data = await res.json()
        console.warn('[TTS] Fallback reason:', data?.reason || 'unknown')
        audioRef.current = null
        browserTTS(clean)
      }
    } catch (err) {
      console.error('[TTS] Client error:', err)
      audioRef.current = null
      browserTTS(clean)
    }
  }

  const handleStop = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; audioRef.current = null }
    window.speechSynthesis?.cancel()
    setState('idle')
  }

  const icons = {
    idle:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    loading: <span style={{ display:'flex', gap:'3px' }}>{[0,1,2].map(i=><span key={i} style={{ width:'4px', height:'4px', borderRadius:'50%', background:'currentColor', display:'block', animation:`thinking 1s ease-in-out ${i*0.2}s infinite` }}/>)}</span>,
    playing: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
    paused:  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  }
  const labels = { idle: 'Listen', loading: 'Preparing…', playing: 'Pause', paused: 'Resume' }

  return (
    <div style={{ display:'flex', gap:'4px' }}>
      <button onClick={handlePlay} disabled={state==='loading'}
        style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px',
          background: state!=='idle' ? 'var(--gold-bg2,rgba(138,109,53,0.13))' : 'transparent',
          border: `1px solid ${state!=='idle' ? 'var(--gold2)' : 'var(--rule)'}`,
          color: state!=='idle' ? 'var(--gold)' : 'var(--ink4)',
          fontFamily:'DM Sans, sans-serif', fontSize:'11px', fontWeight:500,
          cursor: state==='loading' ? 'not-allowed' : 'pointer', transition:'all 0.15s' }}
        onMouseOver={e => { if (state==='idle') { e.currentTarget.style.borderColor='var(--gold2)'; e.currentTarget.style.color='var(--gold)' }}}
        onMouseOut={e  => { if (state==='idle') { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--ink4)' }}}>
        {icons[state]}
        {labels[state]}
      </button>
      {state !== 'idle' && (
        <button onClick={handleStop}
          style={{ padding:'7px 10px', background:'transparent', border:'1px solid var(--rule)',
            color:'var(--ink5)', fontFamily:'DM Sans, sans-serif', fontSize:'11px',
            cursor:'pointer', transition:'all 0.15s' }}
          onMouseOver={e => { e.currentTarget.style.borderColor='var(--crimson)'; e.currentTarget.style.color='var(--crimson)' }}
          onMouseOut={e  => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--ink5)' }}>
          ■ Stop
        </button>
      )}
    </div>
  )
}

interface Props {
  message: Message
  onJournalSave?: (devotionId: number, text: string, refs: string) => void
}

export default function MessageBubble({ message, onJournalSave }: Props) {
  const [copied,          setCopied]          = useState(false)
  const [journalText,     setJournalText]     = useState('')
  const [journalSaved,    setJournalSaved]    = useState(false)
  const [showJournal,     setShowJournal]     = useState(true)
  const [prayerSaved,     setPrayerSaved]     = useState(false)
  const [showPrayerFull,  setShowPrayerFull]  = useState(false)

  const isThinking = message.role === 'assistant' && !message.content && !message.error
  const isUser     = message.role === 'user'
  const isDevotion = !isUser && !message.error && onJournalSave !== undefined

  // Extract prayer from devotion responses
  const prayer = isDevotion ? extractPrayer(message.content) : null

  const handleCopy = async () => {
    const plain = message.content
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[PRINCIPLE\](.*?)\[\/PRINCIPLE\]/gs, '[ $1 ]')
      .replace(/\[WARNING\](.*?)\[\/WARNING\]/gs, 'Note: $1')
    await navigator.clipboard.writeText(plain).catch(() => {})
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const plain = message.content
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[PRINCIPLE\](.*?)\[\/PRINCIPLE\]/gs, '[ $1 ]')
    const date  = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
    const text  = `BEREAN DEVOTION | ${date}\n\n${plain}\n\n— Berean Biblical Principles`
    if (navigator.share) {
      await navigator.share({ title:'Berean Devotion', text }).catch(() => {})
    } else {
      window.open('https://wa.me/?text=' + encodeURIComponent(text.substring(0,4000)), '_blank')
    }
  }

  const handleSavePrayer = () => {
    if (!prayer || !onJournalSave) return
    const refs = (message.sources || []).map(c => c.reference || c.ref || '').join(', ')
    const date = new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})
    const prayerEntry = `PRAYER — ${date}\n\n${prayer}`
    onJournalSave(message.id as unknown as number, prayerEntry, refs)
    setPrayerSaved(true)
    toast.success('Prayer saved to journal')
  }

  const handleJournalSave = () => {
    if (!journalText.trim()) { toast.error('Write something first'); return }
    const refs = (message.sources || []).map(c => c.reference || c.ref || '').join(', ')
    onJournalSave?.(message.id as unknown as number, journalText, refs)
    setJournalSaved(true)
    toast.success('Saved to journal')
  }

  // ── USER MESSAGE ──
  if (isUser) {
    return (
      <div style={{
        display:'flex', gap:'14px', padding:'18px 24px',
        background:'var(--paper2)', borderBottom:'1px solid var(--rule)',
      }} className="fade-in">
        <div style={{
          width:'32px', height:'32px', borderRadius:'50%', flexShrink:0,
          background:'var(--sapphire)', color:'white',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'DM Sans, sans-serif', fontSize:'12px', fontWeight:600, marginTop:'2px',
        }}>U</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'10px', fontWeight:600,
            letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink5)',
            marginBottom:'5px' }}>You</div>
          <p style={{ fontFamily:"'Source Serif 4', serif", fontSize:'16px',
            lineHeight:1.7, color:'var(--ink)' }}>{message.content}</p>
        </div>
      </div>
    )
  }

  // ── ASSISTANT MESSAGE ──
  return (
    <div style={{
      display:'flex', gap:'14px', padding:'24px 24px 20px',
      background:'white', borderBottom:'1px solid var(--rule)',
    }} className="fade-in">

      {/* Avatar */}
      <div style={{
        width:'32px', height:'32px', borderRadius:'50%', flexShrink:0,
        background:'var(--gold-bg2,rgba(138,109,53,0.13))',
        border:'1.5px solid var(--border2,rgba(154,123,58,0.3))',
        color:'var(--gold)', display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:'14px', marginTop:'2px',
      }}>✦</div>

      <div style={{ flex:1, minWidth:0 }}>
        {/* Role + sources */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px',
          marginBottom:'12px', flexWrap:'wrap' }}>
          <span style={{ fontFamily:'DM Sans, sans-serif', fontSize:'10px', fontWeight:600,
            letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink5)' }}>
            Berean
          </span>
          {message.sources && message.sources.map(s => (
            <span key={s.id} style={{
              fontFamily:'DM Sans, sans-serif', fontSize:'10px', fontWeight:500,
              padding:'2px 10px', borderRadius:'100px',
              background:'var(--paper2)', border:'1px solid var(--rule2)',
              color:'var(--gold2)', letterSpacing:'0.06em',
            }}>
              {s.reference || s.ref}
            </span>
          ))}
        </div>

        {/* Content */}
        {isThinking ? (
          <ThinkingDots />
        ) : message.error ? (
          <p style={{ color:'var(--crimson)', fontFamily:'DM Sans, sans-serif', fontSize:'14px' }}>
            ⚠ {message.content}
          </p>
        ) : (
          <>
            <div className="berean-prose"
              dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
            />

            {/* ── PRAYER SAVE SECTION ── */}
            {prayer && !prayerSaved && (
              <div style={{
                marginTop:'24px',
                padding:'18px 20px',
                background:'linear-gradient(to bottom right, var(--gold-bg,rgba(138,109,53,0.07)), var(--paper2))',
                border:'1.5px solid var(--border2,rgba(154,123,58,0.3))',
                borderTop:'3px solid var(--gold2)',
              }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  marginBottom:'10px', gap:'12px', flexWrap:'wrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ color:'var(--gold2)', fontSize:'16px' }}>🙏</span>
                    <span style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px', fontWeight:600,
                      letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gold)' }}>
                      Today's Prayer
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <button onClick={() => setShowPrayerFull(v => !v)}
                      style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px',
                        color:'var(--ink4)', background:'transparent', border:'none',
                        cursor:'pointer', padding:'4px 8px', textDecoration:'underline' }}>
                      {showPrayerFull ? 'Hide' : 'Preview prayer'}
                    </button>
                    <button onClick={handleSavePrayer}
                      style={{
                        display:'flex', alignItems:'center', gap:'7px',
                        padding:'8px 16px',
                        background:'var(--gold)', color:'white', border:'none',
                        fontFamily:'DM Sans, sans-serif', fontSize:'12px', fontWeight:600,
                        letterSpacing:'0.04em', cursor:'pointer',
                        boxShadow:'var(--s2)', transition:'all 0.15s',
                      }}
                      onMouseOver={e => { e.currentTarget.style.background='var(--gold2)'; e.currentTarget.style.transform='translateY(-1px)' }}
                      onMouseOut={e  => { e.currentTarget.style.background='var(--gold)'; e.currentTarget.style.transform='none' }}
                    >
                      <BookMarked size={13}/>
                      Save Prayer to Journal
                    </button>
                  </div>
                </div>

                {showPrayerFull && (
                  <div className="fade-in" style={{
                    marginTop:'12px', padding:'14px 16px',
                    background:'white', borderLeft:'3px solid var(--gold2)',
                    fontFamily:"'Source Serif 4', serif", fontSize:'14px',
                    lineHeight:1.8, color:'var(--ink3)', fontStyle:'italic',
                    maxHeight:'200px', overflowY:'auto',
                  }}>
                    {prayer.substring(0, 600)}{prayer.length > 600 ? '…' : ''}
                  </div>
                )}
              </div>
            )}

            {prayerSaved && (
              <div style={{ marginTop:'16px', padding:'10px 16px',
                background:'var(--paper2)', border:'1px solid var(--rule)',
                display:'flex', alignItems:'center', gap:'8px' }}>
                <BookMarked size={13} style={{ color:'var(--gold2)' }}/>
                <span style={{ fontFamily:'DM Sans, sans-serif', fontSize:'12px',
                  color:'var(--ink4)' }}>Prayer saved to journal</span>
              </div>
            )}

            {/* ── ACTION BAR ── */}
            {message.content && (
              <div style={{ display:'flex', alignItems:'center', gap:'8px',
                marginTop:'16px', paddingTop:'14px',
                borderTop:'1px solid var(--rule)', flexWrap:'wrap' }}>

                {/* Read Aloud */}
                <ReadAloudButton text={message.content} />

                <button onClick={handleCopy}
                  style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px',
                    background:'transparent', border:'1px solid var(--rule)',
                    color:'var(--ink4)', fontFamily:'DM Sans, sans-serif', fontSize:'11px',
                    fontWeight:500, cursor:'pointer', transition:'all 0.15s' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor='var(--gold2)'; e.currentTarget.style.color='var(--gold)' }}
                  onMouseOut={e  => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--ink4)' }}
                >
                  {copied ? <Check size={12}/> : <Copy size={12}/>}
                  {copied ? 'Copied' : 'Copy'}
                </button>

                <button onClick={handleShare}
                  style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px',
                    background:'transparent', border:'1px solid var(--rule)',
                    color:'var(--ink4)', fontFamily:'DM Sans, sans-serif', fontSize:'11px',
                    fontWeight:500, cursor:'pointer', transition:'all 0.15s' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor='var(--gold2)'; e.currentTarget.style.color='var(--gold)' }}
                  onMouseOut={e  => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--ink4)' }}
                >
                  <Share2 size={12}/>
                  Share
                </button>
              </div>
            )}

            {/* ── PERSONAL JOURNAL PROMPT ── */}
            {message.content && showJournal && !journalSaved && onJournalSave && (
              <div style={{
                marginTop:'20px', padding:'16px 18px',
                border:'1px solid rgba(42,61,106,0.2)',
                background:'rgba(42,61,106,0.03)',
                borderLeft:'3px solid rgba(42,61,106,0.3)',
              }}>
                <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'10px', fontWeight:600,
                  letterSpacing:'0.16em', textTransform:'uppercase',
                  color:'rgba(42,61,106,0.7)', marginBottom:'10px' }}>
                  ✍ Your Personal Response
                </div>
                <textarea value={journalText} onChange={e => setJournalText(e.target.value)}
                  placeholder="Lord, as I reflect on today's principle — what are you asking of me specifically..."
                  rows={3} style={{
                    width:'100%', resize:'none', outline:'none',
                    background:'transparent', border:'none',
                    borderBottom:'1px solid rgba(42,61,106,0.15)',
                    fontFamily:"'Source Serif 4', serif", fontSize:'15px',
                    lineHeight:1.7, color:'var(--ink)', paddingBottom:'8px',
                    boxSizing:'border-box',
                  }}/>
                <div style={{ display:'flex', gap:'8px', marginTop:'10px', justifyContent:'flex-end' }}>
                  <button onClick={() => setShowJournal(false)} style={{
                    padding:'7px 14px', background:'transparent',
                    border:'1px solid var(--rule)', color:'var(--ink4)',
                    fontFamily:'DM Sans, sans-serif', fontSize:'11px',
                    fontWeight:500, cursor:'pointer' }}>Skip</button>
                  <button onClick={handleJournalSave} style={{
                    padding:'7px 16px',
                    background:'rgba(42,61,106,0.08)', border:'1px solid rgba(42,61,106,0.25)',
                    color:'rgba(42,61,106,0.85)', fontFamily:'DM Sans, sans-serif',
                    fontSize:'11px', fontWeight:600, cursor:'pointer', transition:'all 0.15s',
                  }}>Save to Journal</button>
                </div>
              </div>
            )}

            {journalSaved && (
              <div style={{ marginTop:'12px', fontFamily:'DM Sans, sans-serif', fontSize:'12px',
                color:'var(--ink5)', display:'flex', alignItems:'center', gap:'6px' }}>
                <BookMarked size={12} style={{ color:'var(--ink5)' }}/>
                Personal response saved to journal
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
