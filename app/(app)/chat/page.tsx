'use client'

import { useState, useEffect, useRef } from 'react'
import { useCorpusChat } from '@/lib/use-corpus-chat'
import MessageBubble from '@/components/berean/MessageBubble'
import type { CorpusChapter } from '@/lib/corpus'
import { RotateCcw } from 'lucide-react'

const EXAMPLES = [
  "What does the Bible say about pride?",
  "How does Scripture address financial stewardship?",
  "What is the biblical pattern of leadership?",
  "What does God's sovereignty mean for my circumstances?",
  "How do I reconcile God's goodness with suffering?",
  "What does the Bible say about calling and vocation?",
  "How should I approach forgiveness when deeply hurt?",
  "What is the role of the Holy Spirit in formation?",
]

export default function ChatPage() {
  const [corpus, setCorpus] = useState<CorpusChapter[]>([])
  const [input,  setInput]  = useState('')
  const messagesEnd = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/corpus.json').then(r => r.json()).then(setCorpus).catch(console.error)
  }, [])

  const { messages, streaming, sendMessage, clearMessages } = useCorpusChat({
    corpus, devoMode: false,
  })

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || streaming) return
    sendMessage(input.trim())
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {messages.length === 0 ? (
          <div style={{
            maxWidth: '680px', margin: '0 auto',
            padding: '60px 32px 40px',
          }}>
            {/* Hero */}
            <div style={{ marginBottom: '52px' }}>
              <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '38px', fontWeight: 500,
                color: 'var(--ink)', lineHeight: 1.2,
                marginBottom: '16px',
                letterSpacing: '-0.01em',
              }}>
                Ask anything<br />
                <span style={{ color: 'var(--gold2)', fontStyle: 'italic' }}>from Scripture.</span>
              </h1>
              <p style={{
                fontFamily: "'Source Serif 4', serif",
                fontSize: '18px', lineHeight: 1.75,
                color: 'var(--ink3)', maxWidth: '520px',
              }}>
                Berean searches 5,956 principles across all 66 books and responds
                with wisdom traceable to its narrative source in Scripture.
              </p>
            </div>

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              marginBottom: '28px',
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--rule)' }} />
              <span style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink5)',
              }}>Start with a question</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--rule)' }} />
            </div>

            {/* Example questions — two columns on desktop */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '10px',
            }}>
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => sendMessage(ex)}
                  style={{
                    padding: '16px 20px',
                    background: 'white',
                    border: '1px solid var(--rule)',
                    color: 'var(--ink2)',
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: "'Source Serif 4', serif",
                    fontSize: '16px', lineHeight: 1.5,
                    boxShadow: 'var(--s1)',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = 'var(--gold2)'
                    e.currentTarget.style.boxShadow = 'var(--s2)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.background = 'var(--gold-bg)'
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = 'var(--rule)'
                    e.currentTarget.style.boxShadow = 'var(--s1)'
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.background = 'white'
                  }}
                >
                  <span style={{ color: 'var(--gold3)', fontSize: '18px', lineHeight: 1, flexShrink: 0, marginTop: '2px' }}>›</span>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Header with clear button */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 24px', borderBottom: '1px solid var(--rule)',
              position: 'sticky', top: 0, background: 'rgba(254,252,248,0.95)',
              backdropFilter: 'blur(8px)', zIndex: 5,
            }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                fontWeight: 500, color: 'var(--ink4)' }}>
                {messages.filter(m => m.role === 'user').length} question{messages.filter(m => m.role === 'user').length !== 1 ? 's' : ''} asked
              </span>
              <button onClick={clearMessages}
                style={{ display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'transparent', border: '1px solid var(--rule)',
                  padding: '6px 14px', cursor: 'pointer', color: 'var(--ink4)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
                  transition: 'all 0.15s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--gold2)'; e.currentTarget.style.color = 'var(--gold)' }}
                onMouseOut={e  => { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.color = 'var(--ink4)' }}
              >
                <RotateCcw size={12} /> New conversation
              </button>
            </div>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
          </>
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <div className="prompt-bar" style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end',
          maxWidth: '680px', margin: '0 auto', width: '100%' }}>
          <textarea
            ref={textareaRef} value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Ask any question from Scripture…"
            rows={1} className="input-field"
            style={{ flex: 1, padding: '12px 16px', resize: 'none',
              minHeight: '46px', maxHeight: '120px', fontSize: '15px', lineHeight: 1.6 }}
          />
          <button onClick={handleSend} disabled={streaming || !input.trim()}
            className="btn btn-gold"
            style={{ padding: '12px 22px', flexShrink: 0, height: '46px',
              opacity: streaming || !input.trim() ? 0.5 : 1 }}>
            {streaming ? '…' : 'Send →'}
          </button>
        </div>
      </div>
    </div>
  )
}
