'use client'

import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Message } from '@/lib/use-corpus-chat'

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
    <div className="flex items-center gap-1.5 py-2">
      {[0,1,2].map(i => (
        <div key={i} className="w-1.5 h-1.5 rounded-full"
             style={{
               background: 'var(--gold)',
               animation: `thinking 1.2s ease-in-out ${i * 0.2}s infinite`,
             }} />
      ))}
    </div>
  )
}

interface Props {
  message: Message
  onJournalSave?: (devotionId: number, text: string, refs: string) => void
}

export default function MessageBubble({ message, onJournalSave }: Props) {
  const [copied,         setCopied]       = useState(false)
  const [journalText,    setJournalText]  = useState('')
  const [journalSaved,   setJournalSaved] = useState(false)
  const [showJournal,    setShowJournal]  = useState(true)

  const isThinking = message.role === 'assistant' && !message.content && !message.error
  const isUser     = message.role === 'user'

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
      .replace(/\[WARNING\](.*?)\[\/WARNING\]/gs, 'Note: $1')
    const date  = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
    const text  = `BEREAN DEVOTION | ${date}\n\n${plain}\n\n— Berean Biblical Principles`

    if (navigator.share) {
      await navigator.share({ title: 'Berean Devotion', text }).catch(() => {})
    } else {
      const url = 'https://wa.me/?text=' + encodeURIComponent(text.substring(0, 4000))
      window.open(url, '_blank')
    }
  }

  const handleJournalSave = () => {
    if (!journalText.trim()) { toast.error('Write something first'); return }
    const refs = (message.sources || []).map(c => c.reference || c.ref || '').join(', ')
    onJournalSave?.(message.id as unknown as number, journalText, refs)
    setJournalSaved(true)
    toast.success('Saved to journal')
  }

  if (isUser) {
    return (
      <div className="flex gap-3 px-4 py-3 animate-fade-up"
           style={{ background: 'rgba(74,143,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs"
             style={{ background: 'rgba(74,143,255,0.15)', border: '1px solid rgba(74,143,255,0.25)', color: 'var(--blue)' }}>
          U
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[0.55rem] tracking-[0.15em] uppercase mb-1"
               style={{ color: 'var(--text-mute)' }}>
            You
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 px-4 py-4 animate-fade-up"
         style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs"
           style={{ background: 'var(--gold-dim)', border: '1px solid var(--border2)', color: 'var(--gold)' }}>
        ✦
      </div>

      <div className="flex-1 min-w-0">
        {/* Role label + sources */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-mono text-[0.55rem] tracking-[0.15em] uppercase"
                style={{ color: 'var(--text-mute)' }}>
            Berean
          </span>
          {message.sources && message.sources.map(s => (
            <span key={s.id}
                  className="font-mono text-[0.5rem] px-1.5 py-0.5"
                  style={{
                    background: 'rgba(74,143,255,0.08)',
                    border: '1px solid rgba(74,143,255,0.2)',
                    color: 'rgba(74,143,255,0.7)',
                  }}>
              {s.reference || s.ref}
            </span>
          ))}
        </div>

        {/* Content */}
        {isThinking ? (
          <ThinkingDots />
        ) : message.error ? (
          <p className="text-sm" style={{ color: 'var(--red)' }}>
            ⚠ {message.content}
          </p>
        ) : (
          <>
            <div
              className="berean-prose text-sm"
              dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
            />

            {/* Actions */}
            {message.content && (
              <div className="flex items-center gap-2 mt-3 pt-3 flex-wrap"
                   style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[0.55rem] tracking-[0.1em] uppercase transition-colors cursor-pointer"
                  style={{ border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text-mute)' }}
                  onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
                  onMouseOut={e  => (e.currentTarget.style.color = 'var(--text-mute)')}
                >
                  {copied ? <Check size={10} /> : <Copy size={10} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[0.55rem] tracking-[0.1em] uppercase transition-colors cursor-pointer"
                  style={{ border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text-mute)' }}
                  onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
                  onMouseOut={e  => (e.currentTarget.style.color = 'var(--text-mute)')}
                >
                  <Share2 size={10} />
                  Share
                </button>
              </div>
            )}

            {/* Prayer journal prompt */}
            {message.content && showJournal && !journalSaved && onJournalSave && (
              <div className="mt-4"
                   style={{ border: '1px solid rgba(74,143,255,0.2)', background: 'rgba(74,143,255,0.03)', padding: '14px 16px' }}>
                <div className="font-mono text-[0.55rem] tracking-[0.18em] uppercase mb-2"
                     style={{ color: 'rgba(74,143,255,0.6)' }}>
                  ✍ Prayer Journal — Your Personal Response
                </div>
                <textarea
                  value={journalText}
                  onChange={e => setJournalText(e.target.value)}
                  placeholder="Lord, as I reflect on today's principle..."
                  rows={3}
                  className="w-full resize-none outline-none text-sm leading-relaxed"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(74,143,255,0.15)',
                    color: 'var(--text)',
                    fontFamily: 'Georgia, serif',
                    paddingBottom: '6px',
                  }}
                />
                <div className="flex gap-2 mt-2.5 justify-end">
                  <button
                    onClick={() => setShowJournal(false)}
                    className="px-3 py-1.5 font-mono text-[0.55rem] tracking-[0.1em] uppercase cursor-pointer"
                    style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mute)' }}
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleJournalSave}
                    className="px-3 py-1.5 font-mono text-[0.55rem] tracking-[0.1em] uppercase cursor-pointer"
                    style={{ border: '1px solid rgba(74,143,255,0.3)', background: 'rgba(74,143,255,0.1)', color: 'rgba(74,143,255,0.8)' }}
                  >
                    Save to Journal
                  </button>
                </div>
              </div>
            )}

            {journalSaved && (
              <div className="mt-3 font-mono text-[0.55rem] tracking-[0.1em]"
                   style={{ color: 'rgba(74,143,255,0.6)' }}>
                ✓ Saved to journal
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
