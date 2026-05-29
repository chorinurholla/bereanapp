'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { loadLocal, saveLocal, pushToCloud, keys, calcStreak } from '@/lib/sync'
import { KINGDOM_PATTERNS } from '@/lib/patterns'
import type { HistoryEntry, TrackerEntry } from '@/lib/supabase'
import { Download, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

// All 66 canonical books in order
const CANON = [
  // OT Pentateuch
  {book:'Genesis',section:'Pentateuch',testament:'OT'},
  {book:'Exodus',section:'Pentateuch',testament:'OT'},
  {book:'Leviticus',section:'Pentateuch',testament:'OT'},
  {book:'Numbers',section:'Pentateuch',testament:'OT'},
  {book:'Deuteronomy',section:'Pentateuch',testament:'OT'},
  // Historical
  {book:'Joshua',section:'Historical',testament:'OT'},
  {book:'Judges',section:'Historical',testament:'OT'},
  {book:'Ruth',section:'Historical',testament:'OT'},
  {book:'1 Samuel',section:'Historical',testament:'OT'},
  {book:'2 Samuel',section:'Historical',testament:'OT'},
  {book:'1 Kings',section:'Historical',testament:'OT'},
  {book:'2 Kings',section:'Historical',testament:'OT'},
  {book:'1 Chronicles',section:'Historical',testament:'OT'},
  {book:'2 Chronicles',section:'Historical',testament:'OT'},
  {book:'Ezra',section:'Historical',testament:'OT'},
  {book:'Nehemiah',section:'Historical',testament:'OT'},
  {book:'Esther',section:'Historical',testament:'OT'},
  // Wisdom
  {book:'Job',section:'Wisdom',testament:'OT'},
  {book:'Psalms',section:'Wisdom',testament:'OT'},
  {book:'Proverbs',section:'Wisdom',testament:'OT'},
  {book:'Ecclesiastes',section:'Wisdom',testament:'OT'},
  {book:'Song of Songs',section:'Wisdom',testament:'OT'},
  // Major Prophets
  {book:'Isaiah',section:'Major Prophets',testament:'OT'},
  {book:'Jeremiah',section:'Major Prophets',testament:'OT'},
  {book:'Lamentations',section:'Major Prophets',testament:'OT'},
  {book:'Ezekiel',section:'Major Prophets',testament:'OT'},
  {book:'Daniel',section:'Major Prophets',testament:'OT'},
  // Minor Prophets
  {book:'Hosea',section:'Minor Prophets',testament:'OT'},
  {book:'Joel',section:'Minor Prophets',testament:'OT'},
  {book:'Amos',section:'Minor Prophets',testament:'OT'},
  {book:'Obadiah',section:'Minor Prophets',testament:'OT'},
  {book:'Jonah',section:'Minor Prophets',testament:'OT'},
  {book:'Micah',section:'Minor Prophets',testament:'OT'},
  {book:'Nahum',section:'Minor Prophets',testament:'OT'},
  {book:'Habakkuk',section:'Minor Prophets',testament:'OT'},
  {book:'Zephaniah',section:'Minor Prophets',testament:'OT'},
  {book:'Haggai',section:'Minor Prophets',testament:'OT'},
  {book:'Zechariah',section:'Minor Prophets',testament:'OT'},
  {book:'Malachi',section:'Minor Prophets',testament:'OT'},
  // NT Gospels
  {book:'Matthew',section:'Gospels',testament:'NT'},
  {book:'Mark',section:'Gospels',testament:'NT'},
  {book:'Luke',section:'Gospels',testament:'NT'},
  {book:'John',section:'Gospels',testament:'NT'},
  {book:'Acts',section:'Acts',testament:'NT'},
  // Epistles
  {book:'Romans',section:'Epistles',testament:'NT'},
  {book:'1 Corinthians',section:'Epistles',testament:'NT'},
  {book:'2 Corinthians',section:'Epistles',testament:'NT'},
  {book:'Galatians',section:'Epistles',testament:'NT'},
  {book:'Ephesians',section:'Epistles',testament:'NT'},
  {book:'Philippians',section:'Epistles',testament:'NT'},
  {book:'Colossians',section:'Epistles',testament:'NT'},
  {book:'1 Thessalonians',section:'Epistles',testament:'NT'},
  {book:'2 Thessalonians',section:'Epistles',testament:'NT'},
  {book:'1 Timothy',section:'Epistles',testament:'NT'},
  {book:'2 Timothy',section:'Epistles',testament:'NT'},
  {book:'Titus',section:'Epistles',testament:'NT'},
  {book:'Philemon',section:'Epistles',testament:'NT'},
  {book:'Hebrews',section:'Epistles',testament:'NT'},
  {book:'James',section:'Epistles',testament:'NT'},
  {book:'1 Peter',section:'Epistles',testament:'NT'},
  {book:'2 Peter',section:'Epistles',testament:'NT'},
  {book:'1 John',section:'Epistles',testament:'NT'},
  {book:'2 John',section:'Epistles',testament:'NT'},
  {book:'3 John',section:'Epistles',testament:'NT'},
  {book:'Jude',section:'Epistles',testament:'NT'},
  {book:'Revelation',section:'Prophecy',testament:'NT'},
]

export default function FormationRecordPage() {
  const { user } = useAuth()
  const [history,  setHistory]  = useState<HistoryEntry[]>([])
  const [tracker,  setTracker]  = useState<Record<string, TrackerEntry>>({})
  const [devCount, setDevCount] = useState(0)
  const [tab,      setTab]      = useState<'arc'|'map'|'patterns'|'log'>('arc')
  const [expanded, setExpanded] = useState<number|null>(null)

  const load = useCallback(() => {
    if (!user) return
    const k = keys(user.id)
    setHistory(loadLocal<HistoryEntry[]>(k.history, []))
    setTracker(loadLocal<Record<string, TrackerEntry>>(k.tracker, {}))
    setDevCount(parseInt(localStorage.getItem(k.devcount) || '0'))
  }, [user])

  useEffect(() => { load() }, [load])

  const streak       = calcStreak(history)
  const chaptersUsed = Object.keys(tracker).length
  const totalChapters = 960

  // Which books have been touched
  const touchedBooks = useMemo(() => {
    const books = new Set<string>()
    Object.values(tracker).forEach(t => books.add(t.book))
    history.forEach(h => {
      if (h.books) h.books.split(',').forEach(b => books.add(b.trim()))
    })
    return books
  }, [tracker, history])

  // Theme frequency from history
  const themeFrequency = useMemo(() => {
    const freq: Record<string, number> = {}
    Object.values(tracker).forEach(t => {
      // Extract themes from tracker refs
      freq[t.book] = (freq[t.book] || 0) + 1
    })
    return freq
  }, [tracker])

  // Pattern frequency — inferred from books touched
  const patternFrequency = useMemo(() => {
    const freq: Record<string, number> = {}
    Object.values(KINGDOM_PATTERNS).forEach(p => {
      let count = 0
      p.anchors.forEach(anchor => {
        touchedBooks.forEach(book => {
          if (book.toLowerCase().includes(anchor.toLowerCase().split(' ')[0].toLowerCase()) ||
              anchor.toLowerCase().includes(book.toLowerCase().split(' ')[0].toLowerCase())) {
            count++
          }
        })
      })
      if (count > 0) freq[p.name] = count
    })
    return freq
  }, [touchedBooks])

  // Streak grid
  const streakDots = useMemo(() => {
    const activeDates = new Set(history.map(h => new Date(h.date).toDateString()))
    const today = new Date(); today.setHours(0,0,0,0)
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (29-i))
      return { date: d, active: activeDates.has(d.toDateString()), isToday: i===29 }
    })
  }, [history])

  const exportHistory = () => {
    if (!history.length) { toast.error('No history to export yet'); return }
    const lines = ['BEREAN — Formation Record', `Exported: ${new Date().toLocaleDateString()}`, '']
    lines.push(`Total Devotions: ${devCount}`, `Day Streak: ${streak}`, `Chapters Covered: ${chaptersUsed}/960`, '')
    history.forEach((h, i) => {
      lines.push(`${i+1}. ${h.dateLabel}`, `  ${h.query}`, `  Passages: ${h.refs}`, '')
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href=url; a.download='berean_formation_record.txt'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Formation record exported')
  }

  const resetTracker = () => {
    if (!user || !confirm('Reset all tracked chapters? This cannot be undone.')) return
    const k = keys(user.id)
    saveLocal(k.tracker, {}); pushToCloud(user.id, 'tracker', {})
    localStorage.setItem(k.devcount, '0'); pushToCloud(user.id, 'devotion_count', 0)
    setTracker({}); setDevCount(0)
    toast.success('Tracker reset')
  }

  // Group canon by section
  const sections = useMemo(() => {
    const map: Record<string, typeof CANON> = {}
    CANON.forEach(b => {
      if (!map[b.section]) map[b.section] = []
      map[b.section].push(b)
    })
    return map
  }, [])

  // Check if a book has been touched
  const isTouched = (book: string) => {
    return Array.from(touchedBooks).some(tb =>
      tb.toLowerCase().includes(book.toLowerCase().split(' ').pop()!.toLowerCase()) ||
      book.toLowerCase().includes(tb.toLowerCase().split(' ').pop()!.toLowerCase())
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Header */}
      <div style={{
        padding:'24px 32px 0', flexShrink:0,
        background:'var(--paper)', borderBottom:'1px solid var(--rule)',
      }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:'26px',
              fontWeight:500, color:'var(--ink)', marginBottom:'4px' }}>
              Formation Record
            </h1>
            <p style={{ fontFamily:'DM Sans, sans-serif', fontSize:'13px', color:'var(--ink4)' }}>
              Your journey through Scripture — visible, accumulative, and honest
            </p>
          </div>
          <button onClick={exportHistory}
            style={{ display:'flex', alignItems:'center', gap:'7px',
              background:'transparent', border:'1px solid var(--rule)',
              padding:'8px 16px', cursor:'pointer', color:'var(--ink4)',
              fontFamily:'DM Sans, sans-serif', fontSize:'12px', fontWeight:500,
              transition:'all 0.15s', flexShrink:0 }}
            onMouseOver={e=>{ e.currentTarget.style.borderColor='var(--gold2)'; e.currentTarget.style.color='var(--gold)' }}
            onMouseOut={e =>{ e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--ink4)' }}
          ><Download size={13}/> Export</button>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:'32px', marginBottom:'20px', flexWrap:'wrap' }}>
          {[
            { num: devCount,      label:'Devotions',         sub:'all time' },
            { num: streak,        label:'Day Streak',         sub: streak===1?'day':'days' },
            { num: chaptersUsed,  label:'Chapters Covered',   sub:`of ${totalChapters}` },
            { num: touchedBooks.size, label:'Books Touched',  sub:`of 66` },
          ].map(({ num, label, sub }) => (
            <div key={label}>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:'28px',
                fontWeight:500, color:'var(--gold2)', lineHeight:1 }}>{num}</div>
              <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px', fontWeight:600,
                letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink3)', marginTop:'3px' }}>{label}</div>
              <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'10px', color:'var(--ink5)' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'0', borderBottom:'none', marginBottom:'-1px' }}>
          {([
            ['arc',      'Formation Arc'],
            ['map',      'Canon Map'],
            ['patterns', 'Kingdom Patterns'],
            ['log',      'Devotion Log'],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:'10px 20px', background:'transparent', border:'none',
              borderBottom: tab===t ? '2px solid var(--gold2)' : '2px solid transparent',
              fontFamily:'DM Sans, sans-serif', fontSize:'13px', fontWeight: tab===t ? 600 : 400,
              color: tab===t ? 'var(--gold)' : 'var(--ink4)',
              cursor:'pointer', transition:'all 0.15s', marginBottom:'-1px',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto' }}>

        {/* ── FORMATION ARC ── */}
        {tab === 'arc' && (
          <div style={{ padding:'28px 32px' }}>

            {/* Streak grid */}
            <div style={{ marginBottom:'32px' }}>
              <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px', fontWeight:600,
                letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink5)',
                marginBottom:'10px' }}>Last 30 Days</div>
              <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                {streakDots.map(({ date, active, isToday }) => (
                  <div key={date.toISOString()} title={date.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
                    style={{ width:'16px', height:'16px', borderRadius:'4px',
                      background: active ? 'var(--gold2)' : 'var(--paper3,#f1eade)',
                      border: isToday ? '2px solid var(--gold2)' : '1px solid var(--rule)',
                      cursor:'default', transition:'all 0.15s',
                    }}/>
                ))}
              </div>
            </div>

            {/* Canon progress bar */}
            <div style={{ marginBottom:'32px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                <span style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px', fontWeight:600,
                  letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink5)' }}>
                  Canon Coverage
                </span>
                <span style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px', color:'var(--ink4)' }}>
                  {chaptersUsed} of {totalChapters} chapters ({Math.round(chaptersUsed/totalChapters*100)}%)
                </span>
              </div>
              <div style={{ height:'8px', background:'var(--rule)', borderRadius:'4px', overflow:'hidden' }}>
                <div style={{ height:'100%', background:'var(--gold2)', borderRadius:'4px',
                  width: `${Math.min(100, chaptersUsed/totalChapters*100)}%`,
                  transition:'width 1s ease' }}/>
              </div>
              <p style={{ fontFamily:"'Source Serif 4', serif", fontSize:'14px', fontStyle:'italic',
                color:'var(--ink4)', marginTop:'8px', lineHeight:1.6 }}>
                {chaptersUsed < 10
                  ? 'Your journey is beginning. Every chapter you encounter is a step further into the whole counsel of God.'
                  : chaptersUsed < 100
                  ? 'You are moving through the canon. The patterns you are discovering will deepen as the corpus opens up.'
                  : chaptersUsed < 400
                  ? 'Nearly halfway through the chapters. The formation that happens in the second half is built on what you have already received.'
                  : 'You have covered most of the canon. What is emerging in your formation now is the synthesis — how the whole story holds together.'}
              </p>
            </div>

            {/* Most recent devotions */}
            {history.length > 0 && (
              <div>
                <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px', fontWeight:600,
                  letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink5)',
                  marginBottom:'12px' }}>Recent Devotions</div>
                {history.slice(0, 5).map(h => (
                  <div key={h.id} style={{ padding:'14px 0', borderBottom:'1px solid var(--rule)',
                    cursor:'pointer' }} onClick={() => setTab('log')}>
                    <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px', fontWeight:600,
                      color:'var(--gold2)', marginBottom:'4px', letterSpacing:'0.06em' }}>{h.dateLabel}</div>
                    <p style={{ fontFamily:"'Source Serif 4', serif", fontSize:'15px',
                      color:'var(--ink)', marginBottom:'3px', lineHeight:1.4 }}>{h.query}</p>
                    <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px', color:'var(--ink5)' }}>{h.refs}</div>
                  </div>
                ))}
              </div>
            )}

            {history.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 0' }}>
                <p style={{ fontFamily:"'Source Serif 4', serif", fontSize:'18px',
                  fontStyle:'italic', color:'var(--ink4)', lineHeight:1.75 }}>
                  Your formation record begins with your first devotion.<br/>
                  Every day you engage the corpus, this record grows.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── CANON MAP ── */}
        {tab === 'map' && (
          <div style={{ padding:'28px 32px' }}>
            <p style={{ fontFamily:"'Source Serif 4', serif", fontSize:'15px', fontStyle:'italic',
              color:'var(--ink4)', marginBottom:'24px', lineHeight:1.7 }}>
              Every book you have engaged through a devotion is illuminated below.
              The gaps are as formative as the coverage — they show where the Spirit may lead you next.
            </p>

            {Object.entries(sections).map(([section, books]) => (
              <div key={section} style={{ marginBottom:'24px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                  <span style={{ fontFamily:"'Playfair Display', serif", fontSize:'16px',
                    fontWeight:500, color:'var(--ink)' }}>{section}</span>
                  <div style={{ flex:1, height:'1px', background:'var(--rule)' }}/>
                  <span style={{ fontFamily:'DM Sans, sans-serif', fontSize:'10px', color:'var(--ink5)' }}>
                    {books.filter(b => isTouched(b.book)).length}/{books.length}
                  </span>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                  {books.map(b => {
                    const touched = isTouched(b.book)
                    return (
                      <div key={b.book} style={{
                        padding:'6px 12px',
                        background: touched ? 'var(--gold-bg2,rgba(138,109,53,0.13))' : 'white',
                        border: `1.5px solid ${touched ? 'var(--gold2)' : 'var(--rule)'}`,
                        fontFamily: touched ? "'Source Serif 4', serif" : 'DM Sans, sans-serif',
                        fontSize:'13px',
                        color: touched ? 'var(--gold)' : 'var(--ink5)',
                        fontWeight: touched ? 500 : 400,
                        borderRadius:'2px',
                        transition:'all 0.15s',
                      }}>
                        {b.book}
                        {touched && <span style={{ marginLeft:'5px', fontSize:'10px' }}>✦</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {chaptersUsed === 0 && (
              <p style={{ textAlign:'center', fontFamily:"'Source Serif 4', serif", fontSize:'16px',
                fontStyle:'italic', color:'var(--ink5)', marginTop:'40px' }}>
                Run your first devotion to begin illuminating the canon map.
              </p>
            )}
          </div>
        )}

        {/* ── KINGDOM PATTERNS ── */}
        {tab === 'patterns' && (
          <div style={{ padding:'28px 32px' }}>
            <p style={{ fontFamily:"'Source Serif 4', serif", fontSize:'15px', fontStyle:'italic',
              color:'var(--ink4)', marginBottom:'24px', lineHeight:1.7, maxWidth:'600px' }}>
              Kingdom Patterns are the recurring narrative structures through which God works in human life.
              As you engage the corpus, the patterns present in your journey become visible.
            </p>

            <div style={{ display:'grid', gap:'12px',
              gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {Object.values(KINGDOM_PATTERNS).map(pattern => {
                const isPresent = (patternFrequency[pattern.name] || 0) > 0
                return (
                  <div key={pattern.name} style={{
                    padding:'18px 20px',
                    background: isPresent ? 'white' : 'var(--paper2)',
                    border: `1.5px solid ${isPresent ? pattern.color : 'var(--rule)'}`,
                    opacity: isPresent ? 1 : 0.55,
                    transition:'all 0.2s',
                    position:'relative',
                    overflow:'hidden',
                  }}>
                    {isPresent && (
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px',
                        background: pattern.color }}/>
                    )}
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                      <span style={{ fontSize:'20px', color: pattern.color }}>{pattern.icon}</span>
                      <span style={{ fontFamily:"'Playfair Display', serif", fontSize:'16px',
                        fontWeight:500, color: isPresent ? 'var(--ink)' : 'var(--ink4)' }}>
                        {pattern.name}
                      </span>
                      {isPresent && (
                        <span style={{ marginLeft:'auto', fontFamily:'DM Sans, sans-serif',
                          fontSize:'9px', fontWeight:600, letterSpacing:'0.1em',
                          textTransform:'uppercase', padding:'2px 8px', borderRadius:'100px',
                          background: pattern.color + '20', color: pattern.color,
                          border: `1px solid ${pattern.color}40` }}>
                          In your journey
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily:"'Source Serif 4', serif", fontSize:'14px',
                      fontStyle:'italic', color:'var(--ink3)', lineHeight:1.6,
                      marginBottom: isPresent ? '12px' : '0' }}>
                      {pattern.description}
                    </p>
                    {isPresent && (
                      <p style={{ fontFamily:'DM Sans, sans-serif', fontSize:'12px',
                        color:'var(--ink4)', lineHeight:1.6, marginBottom:'8px' }}>
                        <strong style={{ color:'var(--gold)', fontWeight:600 }}>Formation question: </strong>
                        {pattern.formation_question}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── DEVOTION LOG ── */}
        {tab === 'log' && (
          <div>
            {history.length === 0 ? (
              <div style={{ padding:'60px 32px', textAlign:'center' }}>
                <p style={{ fontFamily:"'Source Serif 4', serif", fontSize:'18px',
                  fontStyle:'italic', color:'var(--ink4)' }}>No devotions yet</p>
              </div>
            ) : (
              history.map(h => {
                const open = expanded === h.id
                return (
                  <div key={h.id} className={'entry-row' + (open ? ' open' : '')}
                    onClick={() => setExpanded(open ? null : h.id)}
                    style={{ borderLeft: open ? '3px solid var(--gold2)' : '3px solid transparent',
                      paddingLeft: open ? '21px' : '24px' }}>
                    <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px', fontWeight:600,
                      letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--gold2)',
                      marginBottom:'5px' }}>{h.dateLabel}</div>
                    <p style={{ fontFamily:"'Source Serif 4', serif", fontSize:'16px',
                      color:'var(--ink)', lineHeight:1.5, marginBottom:'5px' }}>{h.query}</p>
                    <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'11px',
                      color:'var(--ink4)' }}>{h.refs}</div>
                    {open && (
                      <div className="fade-in" style={{ marginTop:'14px', paddingTop:'14px',
                        borderTop:'1px solid var(--rule)' }}>
                        <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:'9px', fontWeight:600,
                          letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink5)',
                          marginBottom:'6px' }}>Excerpt</div>
                        <p style={{ fontFamily:"'Source Serif 4', serif", fontSize:'14px',
                          lineHeight:1.75, color:'var(--ink3)' }}>
                          {h.reply.substring(0,350)}…
                        </p>
                      </div>
                    )}
                  </div>
                )
              })
            )}
            {Object.keys(tracker).length > 0 && (
              <div style={{ padding:'28px', display:'flex', justifyContent:'center' }}>
                <button onClick={resetTracker}
                  style={{ display:'flex', alignItems:'center', gap:'7px',
                    background:'transparent', border:'1px solid rgba(122,42,42,0.2)',
                    padding:'8px 18px', cursor:'pointer', color:'rgba(122,42,42,0.5)',
                    fontFamily:'DM Sans, sans-serif', fontSize:'12px', transition:'all 0.15s' }}
                  onMouseOver={e=>{e.currentTarget.style.borderColor='var(--crimson)';e.currentTarget.style.color='var(--crimson)'}}
                  onMouseOut={e =>{e.currentTarget.style.borderColor='rgba(122,42,42,0.2)';e.currentTarget.style.color='rgba(122,42,42,0.5)'}}
                ><RotateCcw size={12}/> Reset Tracker</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
