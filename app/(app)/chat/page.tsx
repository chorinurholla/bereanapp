'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useCorpusChat } from '@/lib/use-corpus-chat'
import { loadLocal, saveLocal, pushToCloud, keys } from '@/lib/sync'
import MessageBubble from '@/components/berean/MessageBubble'
import type { CorpusChapter } from '@/lib/corpus'
import type { ConversationEntry } from '@/lib/supabase'
import { RotateCcw, Clock, ChevronRight } from 'lucide-react'

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
  const { user } = useAuth()
  const [corpus,       setCorpus]       = useState<CorpusChapter[]>([])
  const [input,        setInput]        = useState('')
  const [view,         setView]         = useState<'chat'|'history'>('chat')
  const [conversations,setConversations]= useState<ConversationEntry[]>([])
  const [activeConv,   setActiveConv]   = useState<ConversationEntry|null>(null)
  const messagesEnd  = useRef<HTMLDivElement>(null)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const currentConvId = useRef<number>(0)

  useEffect(() => {
    fetch('/corpus.json').then(r => r.json()).then(setCorpus).catch(console.error)
  }, [])

  const loadConversations = useCallback(() => {
    if (!user) return
    const k = keys(user.id)
    setConversations(loadLocal<ConversationEntry[]>(k.conversations, []))
  }, [user])

  useEffect(() => { loadConversations() }, [loadConversations])

  const { messages, streaming, sendMessage, clearMessages } = useCorpusChat({
    corpus, devoMode: false,
  })

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-save conversation after each exchange completes
  useEffect(() => {
    if (!user || messages.length < 2 || streaming) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role !== 'assistant' || lastMsg.error) return

    const k = keys(user.id)
    const existing = loadLocal<ConversationEntry[]>(k.conversations, [])

    // Build refs list from all sources in this conversation
    const allRefs = new Set<string>()
    messages.forEach(m => {
      if (m.sources) m.sources.forEach(s => allRefs.add(s.reference || s.ref || ''))
    })

    const firstQuestion = messages.find(m => m.role === 'user')?.content || 'Conversation'
    const convId = currentConvId.current || Date.now()
    if (!currentConvId.current) currentConvId.current = convId

    const entry: ConversationEntry = {
      id: convId,
      date: new Date().toISOString(),
      dateLabel: new Date().toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
      }),
      title: firstQuestion.length > 80 ? firstQuestion.substring(0, 77) + '…' : firstQuestion,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        sources: m.sources?.map(s => s.reference || s.ref || ''),
      })),
      refs: Array.from(allRefs).join(', '),
    }

    // Update or insert
    const idx = existing.findIndex(c => c.id === convId)
    let updated: ConversationEntry[]
    if (idx > -1) {
      updated = existing.map((c, i) => i === idx ? entry : c)
    } else {
      updated = [entry, ...existing]
    }
    updated = updated.slice(0, 200)
    saveLocal(k.conversations, updated)
    pushToCloud(user.id, 'conversations', updated)
    setConversations(updated)
  }, [messages, streaming, user])

  const handleSend = () => {
    if (!input.trim() || streaming) return
    if (!currentConvId.current) currentConvId.current = Date.now()
    sendMessage(input.trim())
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setView('chat')
  }

  const startNewConversation = () => {
    clearMessages()
    currentConvId.current = 0
    setInput('')
    setView('chat')
  }

  const openConversation = (conv: ConversationEntry) => {
    setActiveConv(conv)
  }

  const deleteConversation = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return
    const k = keys(user.id)
    const updated = conversations.filter(c => c.id !== id)
    saveLocal(k.conversations, updated)
    pushToCloud(user.id, 'conversations', updated)
    setConversations(updated)
    if (activeConv?.id === id) setActiveConv(null)
  }

  // ── REPLAY VIEW ──
  if (activeConv) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ padding:'14px 24px', borderBottom:'1px solid var(--rule)',
          background:'var(--paper2)', display:'flex', alignItems:'center',
          gap:'12px', flexShrink:0 }}>
          <button onClick={() => setActiveConv(null)}
            style={{ background:'transparent', border:'none', cursor:'pointer',
              color:'var(--gold)', fontFamily:'DM Sans, sans-serif', fontSize:'13px',
              fontWeight:500, display:'flex', alignItems:'center', gap:'5px',
              padding:'4px 0' }}>
            ← Back
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px', fontWeight:600,
              color:'var(--gold2)', letterSpacing:'0.06em' }}>{activeConv.dateLabel}</div>
            <div style={{ fontFamily:"'Source Serif 4', serif", fontSize:'15px',
              color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis',
              whiteSpace:'nowrap' }}>{activeConv.title}</div>
          </div>
          <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px', color:'var(--ink5)',
            flexShrink:0 }}>{activeConv.refs}</div>
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {activeConv.messages.map((m, i) => (
            <div key={i} style={{
              display:'flex', gap:'14px',
              padding: m.role === 'user' ? '16px 24px' : '20px 24px',
              background: m.role === 'user' ? 'var(--paper2)' : 'white',
              borderBottom:'1px solid var(--rule)',
            }}>
              <div style={{
                width:'30px', height:'30px', borderRadius:'50%', flexShrink:0,
                background: m.role === 'user' ? 'var(--sapphire)' : 'var(--gold-bg2,rgba(138,109,53,0.13))',
                border: m.role === 'assistant' ? '1.5px solid var(--border2,rgba(154,123,58,0.3))' : 'none',
                color: m.role === 'user' ? 'white' : 'var(--gold)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'DM Sans, sans-serif', fontSize:'11px', fontWeight:600,
                marginTop:'2px',
              }}>
                {m.role === 'user' ? 'U' : '✦'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'10px', fontWeight:600,
                  letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink5)',
                  marginBottom:'6px' }}>
                  {m.role === 'user' ? 'You' : 'Berean'}
                </div>
                {m.sources && m.sources.length > 0 && (
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'10px' }}>
                    {m.sources.map(s => s && (
                      <span key={s} style={{
                        fontFamily:'DM Sans, sans-serif', fontSize:'10px', fontWeight:500,
                        padding:'2px 10px', borderRadius:'100px',
                        background:'var(--paper2)', border:'1px solid var(--rule2)',
                        color:'var(--gold2)',
                      }}>{s}</span>
                    ))}
                  </div>
                )}
                <div className="berean-prose" style={{ fontSize:'15px' }}
                  dangerouslySetInnerHTML={{ __html:
                    m.content
                      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
                      .replace(/\[PRINCIPLE\](.*?)\[\/PRINCIPLE\]/gs,'<div class="principle-block">$1</div>')
                      .split(/\n\n+/).map(p => p.trim() ? `<p>${p.replace(/\n/g,'<br>')}</p>` : '').join('')
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {/* Tab bar */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--rule)',
        background:'var(--paper)', flexShrink:0 }}>
        {([['chat','Ask Scripture'],['history','Saved Conversations']] as const).map(([t,label]) => (
          <button key={t} onClick={() => setView(t)} style={{
            padding:'12px 20px', background:'transparent', border:'none',
            borderBottom: view===t ? '2px solid var(--gold2)' : '2px solid transparent',
            fontFamily:'DM Sans, sans-serif', fontSize:'13px',
            fontWeight: view===t ? 600 : 400,
            color: view===t ? 'var(--gold)' : 'var(--ink4)',
            cursor:'pointer', transition:'all 0.15s', marginBottom:'-1px',
            display:'flex', alignItems:'center', gap:'6px',
          }}>
            {t === 'history' && <Clock size={13}/>}
            {label}
            {t === 'history' && conversations.length > 0 && (
              <span style={{
                background:'var(--gold-bg2,rgba(138,109,53,0.13))',
                color:'var(--gold)', border:'1px solid rgba(138,109,53,0.3)',
                borderRadius:'100px', padding:'1px 7px',
                fontFamily:'DM Sans, sans-serif', fontSize:'10px', fontWeight:600,
              }}>{conversations.length}</span>
            )}
          </button>
        ))}
        {messages.length > 0 && view === 'chat' && (
          <button onClick={startNewConversation}
            style={{ marginLeft:'auto', marginRight:'12px',
              display:'flex', alignItems:'center', gap:'5px', padding:'8px 14px',
              background:'transparent', border:'1px solid var(--rule)',
              color:'var(--ink4)', fontFamily:'DM Sans, sans-serif', fontSize:'12px',
              fontWeight:500, cursor:'pointer', transition:'all 0.15s',
              alignSelf:'center' }}
            onMouseOver={e=>{e.currentTarget.style.borderColor='var(--gold2)';e.currentTarget.style.color='var(--gold)'}}
            onMouseOut={e =>{e.currentTarget.style.borderColor='var(--rule)';e.currentTarget.style.color='var(--ink4)'}}
          ><RotateCcw size={12}/> New</button>
        )}
      </div>

      {/* ── CHAT VIEW ── */}
      {view === 'chat' && (
        <>
          <div style={{ flex:1, overflowY:'auto' }}>
            {messages.length === 0 ? (
              <div style={{ maxWidth:'680px', margin:'0 auto', padding:'56px 32px 40px' }}>
                <div style={{ marginBottom:'48px' }}>
                  <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:'38px',
                    fontWeight:500, color:'var(--ink)', lineHeight:1.2, marginBottom:'14px',
                    letterSpacing:'-0.01em' }}>
                    Ask anything<br/>
                    <span style={{ color:'var(--gold2)', fontStyle:'italic' }}>from Scripture.</span>
                  </h1>
                  <p style={{ fontFamily:"'Source Serif 4', serif", fontSize:'17px',
                    lineHeight:1.75, color:'var(--ink3)', maxWidth:'500px' }}>
                    Berean searches 5,956 principles across all 66 books and responds
                    with wisdom traceable to its source. Every conversation is saved automatically.
                  </p>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'24px' }}>
                  <div style={{ flex:1, height:'1px', background:'var(--rule)' }}/>
                  <span style={{ fontFamily:'DM Sans, sans-serif', fontSize:'10px', fontWeight:600,
                    letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--ink5)' }}>
                    Start with a question
                  </span>
                  <div style={{ flex:1, height:'1px', background:'var(--rule)' }}/>
                </div>

                <div style={{ display:'grid',
                  gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'10px' }}>
                  {EXAMPLES.map(ex => (
                    <button key={ex} onClick={() => sendMessage(ex)} style={{
                      padding:'15px 18px', background:'white',
                      border:'1px solid var(--rule)', color:'var(--ink2)',
                      cursor:'pointer', textAlign:'left',
                      fontFamily:"'Source Serif 4', serif", fontSize:'15px', lineHeight:1.5,
                      boxShadow:'var(--s1)', transition:'all 0.15s',
                      display:'flex', alignItems:'flex-start', gap:'10px',
                    }}
                    onMouseOver={e=>{
                      e.currentTarget.style.borderColor='var(--gold2)'
                      e.currentTarget.style.boxShadow='var(--s2)'
                      e.currentTarget.style.transform='translateY(-2px)'
                      e.currentTarget.style.background='var(--gold-bg)'
                    }}
                    onMouseOut={e=>{
                      e.currentTarget.style.borderColor='var(--rule)'
                      e.currentTarget.style.boxShadow='var(--s1)'
                      e.currentTarget.style.transform='none'
                      e.currentTarget.style.background='white'
                    }}>
                      <span style={{ color:'var(--gold3)', fontSize:'16px', lineHeight:1,
                        flexShrink:0, marginTop:'2px' }}>›</span>
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'12px 24px', borderBottom:'1px solid var(--rule)',
                  position:'sticky', top:0, background:'rgba(254,252,248,0.95)',
                  backdropFilter:'blur(8px)', zIndex:5 }}>
                  <span style={{ fontFamily:'DM Sans, sans-serif', fontSize:'12px',
                    fontWeight:500, color:'var(--ink4)', display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ width:'7px', height:'7px', borderRadius:'50%',
                      background:'var(--gold2)', display:'inline-block',
                      animation:'pulseDot 2s ease-in-out infinite' }}/>
                    Saving automatically
                  </span>
                </div>
                {messages.map(msg => <MessageBubble key={msg.id} message={msg}/>)}
              </>
            )}
            <div ref={messagesEnd}/>
          </div>

          <div className="prompt-bar" style={{ flexShrink:0 }}>
            <div style={{ display:'flex', gap:'10px', alignItems:'flex-end',
              maxWidth:'680px', margin:'0 auto', width:'100%' }}>
              <textarea ref={textareaRef} value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height='auto'
                  e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'
                }}
                onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }}}
                placeholder="Ask any question from Scripture…"
                rows={1} className="input-field"
                style={{ flex:1, padding:'12px 16px', resize:'none',
                  minHeight:'46px', maxHeight:'120px', fontSize:'15px', lineHeight:1.6 }}
              />
              <button onClick={handleSend} disabled={streaming || !input.trim()}
                className="btn btn-gold"
                style={{ padding:'12px 22px', flexShrink:0, height:'46px',
                  opacity: streaming || !input.trim() ? 0.5 : 1 }}>
                {streaming ? '…' : 'Send →'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── HISTORY VIEW ── */}
      {view === 'history' && (
        <div style={{ flex:1, overflowY:'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding:'60px 32px', textAlign:'center' }}>
              <p style={{ fontFamily:"'Source Serif 4', serif", fontSize:'18px',
                fontStyle:'italic', color:'var(--ink4)', lineHeight:1.75 }}>
                Your Ask conversations are saved here automatically.<br/>
                Start a conversation to build your library.
              </p>
            </div>
          ) : (
            <>
              <div style={{ padding:'20px 24px 12px', borderBottom:'1px solid var(--rule)' }}>
                <p style={{ fontFamily:'DM Sans, sans-serif', fontSize:'12px', color:'var(--ink5)' }}>
                  {conversations.length} saved conversation{conversations.length !== 1 ? 's' : ''} — tap any to review
                </p>
              </div>
              {conversations.map(conv => (
                <div key={conv.id} onClick={() => openConversation(conv)}
                  style={{ padding:'18px 24px', borderBottom:'1px solid var(--rule)',
                    cursor:'pointer', transition:'background 0.12s',
                    display:'flex', alignItems:'flex-start', gap:'14px' }}
                  onMouseOver={e=>(e.currentTarget.style.background='var(--paper2)')}
                  onMouseOut={e =>(e.currentTarget.style.background='transparent')}
                >
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px', fontWeight:600,
                      color:'var(--gold2)', letterSpacing:'0.06em', marginBottom:'5px' }}>
                      {conv.dateLabel}
                    </div>
                    <p style={{ fontFamily:"'Source Serif 4', serif", fontSize:'16px',
                      color:'var(--ink)', lineHeight:1.45, marginBottom:'5px',
                      overflow:'hidden', display:'-webkit-box',
                      WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const }}>
                      {conv.title}
                    </p>
                    {conv.refs && (
                      <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px',
                        color:'var(--ink5)' }}>{conv.refs}</div>
                    )}
                    <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'10px',
                      color:'var(--ink5)', marginTop:'4px' }}>
                      {conv.messages.filter(m=>m.role==='user').length} question{conv.messages.filter(m=>m.role==='user').length!==1?'s':''}
                      {' · '}
                      {conv.messages.filter(m=>m.role==='assistant').length} response{conv.messages.filter(m=>m.role==='assistant').length!==1?'s':''}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                    <button onClick={e => deleteConversation(conv.id, e)}
                      style={{ background:'transparent', border:'none', cursor:'pointer',
                        color:'rgba(122,42,42,0.3)', padding:'4px', fontSize:'14px',
                        transition:'color 0.15s', lineHeight:1 }}
                      onMouseOver={e=>(e.currentTarget.style.color='var(--crimson)')}
                      onMouseOut={e =>(e.currentTarget.style.color='rgba(122,42,42,0.3)')}
                      title="Delete conversation"
                    >✕</button>
                    <ChevronRight size={16} style={{ color:'var(--ink5)' }}/>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
