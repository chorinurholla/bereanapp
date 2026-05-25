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
  const messagesEnd  = useRef<HTMLDivElement>(null)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)

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
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
           style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="font-mono text-[0.65rem] tracking-[0.2em] uppercase" style={{ color: 'var(--gold)' }}>
            Ask Scripture
          </h2>
          <p className="font-mono text-[0.5rem] tracking-[0.1em]" style={{ color: 'var(--text-mute)' }}>
            Corpus-grounded answers — always traceable to source
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[0.55rem] tracking-[0.1em] uppercase transition-colors cursor-pointer"
            style={{ border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text-mute)' }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseOut={e  => (e.currentTarget.style.color = 'var(--text-mute)')}
          >
            <RotateCcw size={10} /> New
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[55vh] px-4 text-center">
            <div className="text-2xl mb-4 opacity-40">?</div>
            <p className="text-sm max-w-xs mb-6 leading-relaxed" style={{ color: 'var(--text-dim)', fontStyle:'italic' }}>
              Ask any life question, theological challenge, or leadership dilemma. Berean searches the complete corpus and responds with principles traceable to their source in Scripture.
            </p>
            <div className="grid gap-2 w-full max-w-md">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => sendMessage(ex)}
                  className="px-3 py-2.5 text-left text-xs transition-all cursor-pointer"
                  style={{
                    border: '1px solid var(--border2)', background: 'transparent',
                    color: 'var(--text-dim)', fontFamily: 'Georgia, serif',
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
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Input */}
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
            placeholder="Ask a life question from Scripture…"
            rows={1}
            className="flex-1 resize-none outline-none text-sm leading-relaxed py-2.5 px-3"
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontFamily: 'Georgia, serif',
              minHeight: '44px', maxHeight: '120px',
            }}
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="flex items-center justify-center px-4 py-2.5 transition-all cursor-pointer"
            style={{
              background: 'var(--gold-dim)', border: '1px solid var(--gold)',
              color: 'var(--gold)', opacity: streaming || !input.trim() ? 0.4 : 1,
              fontSize: '18px', lineHeight: 1, minHeight: '44px',
            }}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}
