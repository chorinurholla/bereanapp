'use client'

import { useState, useEffect, useMemo } from 'react'
import type { CorpusChapter } from '@/lib/corpus'
import { tokenize } from '@/lib/corpus'

interface Result {
  chapterId: string; book: string; testament: string; reference: string
  chapterTitle: string; idx: number; title: string
  application: string; verseRef: string; themes: string[]; godShot: string
}

// Canonical sections for browsing
const SECTIONS = [
  { label: 'Pentateuch',       testament: 'OT', books: ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy'] },
  { label: 'Historical Books', testament: 'OT', books: ['Joshua','Judges','Ruth','1 & 2 Samuel','1 & 2 Kings','1 & 2 Chronicles','Ezra','Nehemiah','Esther'] },
  { label: 'Wisdom & Poetry',  testament: 'OT', books: ['Job','Psalms','Proverbs','Ecclesiastes','Song of Songs'] },
  { label: 'Major Prophets',   testament: 'OT', books: ['Isaiah','Jeremiah','Ezekiel','Daniel'] },
  { label: 'Minor Prophets',   testament: 'OT', books: ['Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum / Habakkuk / Zephaniah','Haggai','Zechariah','Malachi'] },
  { label: 'Gospels',          testament: 'NT', books: ['Matthew','Mark','Luke','John'] },
  { label: 'Acts & Epistles',  testament: 'NT', books: ['Acts','Romans','1 & 2 Corinthians','Galatians / Ephesians / Philippians / Colossians','1 & 2 Thessalonians / 1 & 2 Timothy','Titus / Philemon / Hebrews / James','1 & 2 Peter / 1,2,3 John / Jude'] },
  { label: 'Prophecy',         testament: 'NT', books: ['Revelation'] },
]

const FEATURED_THEMES = [
  'calling','faith','leadership','suffering','wisdom','prayer',
  'covenant','grace','sovereignty','love','identity','restoration',
]

export default function SearchPage() {
  const [corpus,      setCorpus]      = useState<CorpusChapter[]>([])
  const [query,       setQuery]       = useState('')
  const [mode,        setMode]        = useState<'browse'|'search'>('browse')
  const [activeBook,  setActiveBook]  = useState<string|null>(null)
  const [activeTheme, setActiveTheme] = useState<string|null>(null)
  const [expanded,    setExpanded]    = useState<string|null>(null)

  useEffect(() => {
    fetch('/corpus.json').then(r => r.json()).then(setCorpus).catch(console.error)
  }, [])

  // Flatten all principles
  const all = useMemo<Result[]>(() => {
    const out: Result[] = []
    corpus.forEach(ch => {
      ch.principles.forEach((p, i) => {
        const t = typeof p === 'object' ? p.title : String(p)
        const a = typeof p === 'object' ? (p.application || '') : ''
        const v = typeof p === 'object' ? (p.verse_reference || '') : ''
        out.push({
          chapterId: ch.id, book: ch.book, testament: ch.testament,
          reference: ch.reference || ch.ref || '',
          chapterTitle: ch.chapter_title || ch.title || '',
          idx: i, title: t, application: a, verseRef: v,
          themes: ch.themes, godShot: ch.god_shot || ch.godShot || '',
        })
      })
    })
    return out
  }, [corpus])

  // Book stats
  const bookStats = useMemo(() => {
    const map: Record<string, number> = {}
    corpus.forEach(ch => {
      map[ch.book] = (map[ch.book] || 0) + ch.principles.length
    })
    return map
  }, [corpus])

  // Search results
  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const tokens = tokenize(query)
    if (!tokens.length) return []
    return all.map(p => {
      let s = 0
      tokens.forEach(t => {
        const re = new RegExp(t, 'gi')
        s += (p.title.toLowerCase().match(re) || []).length * 4
        s += (p.application.toLowerCase().match(re) || []).length * 1.5
        s += p.themes.some(th => th.includes(t)) ? 3 : 0
        s += p.book.toLowerCase().includes(t) ? 2 : 0
      })
      return { p, s }
    }).filter(x => x.s > 0).sort((a,b) => b.s - a.s).slice(0, 60).map(x => x.p)
  }, [all, query])

  // Browse results (by book or theme)
  const browseResults = useMemo(() => {
    if (activeTheme) return all.filter(p => p.themes.includes(activeTheme)).slice(0, 80)
    if (activeBook)  return all.filter(p => p.book === activeBook)
    return []
  }, [all, activeBook, activeTheme])

  const results = query.trim() ? searchResults : browseResults

  const ResultRow = ({ r, i }: { r: Result; i: number }) => {
    const key  = `${r.chapterId}-${r.idx}`
    const open = expanded === key
    return (
      <div className={'search-row' + (open ? ' open' : '')}
        onClick={() => setExpanded(open ? null : key)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold2)' }}>
            {r.reference}
          </span>
          <span style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '9px', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: '100px',
            background: r.testament === 'NT' ? 'rgba(42,61,106,0.08)' : 'var(--gold-bg)',
            color: r.testament === 'NT' ? 'var(--sapphire)' : 'var(--gold)',
            border: `1px solid ${r.testament === 'NT' ? 'rgba(42,61,106,0.2)' : 'rgba(138,109,53,0.2)'}`,
          }}>{r.testament}</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px', color: 'var(--ink5)' }}>#{(i+1).toLocaleString()}</span>
        </div>
        <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '16px',
          color: 'var(--ink)', lineHeight: 1.55, marginBottom: r.themes.length ? '8px' : 0 }}>
          {r.title}
        </p>
        {r.themes.length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {r.themes.slice(0,5).map(t => (
              <span key={t} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px',
                color: 'var(--ink5)', padding: '2px 8px', background: 'var(--paper2)',
                border: '1px solid var(--rule)', borderRadius: '100px' }}>{t}</span>
            ))}
          </div>
        )}
        {open && (
          <div className="fade-in" style={{ marginTop: '16px', paddingTop: '16px',
            borderTop: '1px solid var(--rule)' }}>
            {r.verseRef && (
              <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '14px',
                fontStyle: 'italic', color: 'var(--ink4)', marginBottom: '12px' }}>{r.verseRef}</p>
            )}
            {r.application && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', fontWeight: 600,
                  letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold)',
                  marginBottom: '6px' }}>Application</div>
                <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '15px',
                  lineHeight: 1.7, color: 'var(--ink3)' }}>{r.application}</p>
              </div>
            )}
            {r.godShot && (
              <div style={{ padding: '14px 18px', background: 'var(--gold-bg)',
                borderLeft: '3px solid var(--gold2)', marginBottom: '10px' }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', fontWeight: 600,
                  letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold)',
                  marginBottom: '6px' }}>God Shot</div>
                <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '14px',
                  fontStyle: 'italic', lineHeight: 1.7, color: 'var(--ink3)', margin: 0 }}>
                  {r.godShot.substring(0, 240)}{r.godShot.length > 240 ? '…' : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '24px 32px 20px', borderBottom: '1px solid var(--rule)',
        background: 'rgba(254,252,248,0.97)', backdropFilter: 'blur(8px)',
        position: 'sticky', top: 0, zIndex: 5, flexShrink: 0 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px',
          fontWeight: 500, color: 'var(--ink)', marginBottom: '14px' }}>
          Explore the Corpus
        </h1>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {[['browse','Browse by Book & Theme'],['search','Search Principles']].map(([m,l]) => (
            <button key={m} onClick={() => { setMode(m as 'browse'|'search'); setQuery('') }}
              className={'btn btn-outline' + (mode === m ? ' on' : '')}
              style={{ padding: '7px 18px', fontSize: '12px' }}>
              {l}
            </button>
          ))}
          {corpus.length > 0 && (
            <span style={{ marginLeft: 'auto', alignSelf: 'center',
              fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--ink5)' }}>
              {all.length.toLocaleString()} principles · {corpus.length} chapters
            </span>
          )}
        </div>

        {/* Search input (search mode) */}
        {mode === 'search' && (
          <div style={{ position: 'relative' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--ink5)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search across 5,956 principles…"
              className="input-field" autoFocus
              style={{ paddingLeft: '42px', paddingTop: '12px', paddingBottom: '12px',
                paddingRight: '16px', fontSize: '15px' }} />
          </div>
        )}

        {/* Browse controls */}
        {mode === 'browse' && (
          <div>
            {/* Theme quick-pick */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600,
                letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink5)',
                marginBottom: '7px' }}>Browse by Theme</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {FEATURED_THEMES.map(t => (
                  <button key={t} onClick={() => { setActiveTheme(activeTheme === t ? null : t); setActiveBook(null) }}
                    className={'theme-tag' + (activeTheme === t ? ' on' : '')}
                    style={{ textTransform: 'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Browse mode — show canonical structure */}
        {mode === 'browse' && !activeBook && !activeTheme && (
          <div style={{ padding: '24px 32px' }}>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600,
              letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink5)',
              marginBottom: '16px' }}>Browse by Book</div>
            {SECTIONS.map(sec => (
              <div key={sec.label} style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px',
                    fontWeight: 500, color: 'var(--ink)' }}>{sec.label}</span>
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif', fontSize: '9px', fontWeight: 600,
                    padding: '2px 8px', borderRadius: '100px',
                    background: sec.testament === 'NT' ? 'rgba(42,61,106,0.08)' : 'var(--gold-bg)',
                    color: sec.testament === 'NT' ? 'var(--sapphire)' : 'var(--gold)',
                    border: `1px solid ${sec.testament === 'NT' ? 'rgba(42,61,106,0.2)' : 'rgba(138,109,53,0.2)'}`,
                  }}>{sec.testament}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {sec.books.map(book => {
                    const count = bookStats[book] || 0
                    if (count === 0) return null
                    return (
                      <button key={book} onClick={() => { setActiveBook(book); setActiveTheme(null) }}
                        style={{
                          padding: '9px 16px', background: 'white',
                          border: '1px solid var(--rule)', cursor: 'pointer',
                          fontFamily: "'Source Serif 4', serif", fontSize: '14px',
                          color: 'var(--ink2)', boxShadow: 'var(--s1)', transition: 'all 0.15s',
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.borderColor = 'var(--gold2)'
                          e.currentTarget.style.color = 'var(--gold)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.borderColor = 'var(--rule)'
                          e.currentTarget.style.color = 'var(--ink2)'
                          e.currentTarget.style.transform = 'none'
                        }}
                      >
                        <span>{book}</span>
                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px',
                          color: 'var(--ink5)' }}>{count} principles</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results header when browsing a book or theme */}
        {(activeBook || activeTheme) && mode === 'browse' && (
          <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--rule)',
            background: 'var(--paper2)', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px',
                color: 'var(--ink)', fontWeight: 500 }}>
                {activeBook || (activeTheme && activeTheme.charAt(0).toUpperCase() + activeTheme.slice(1))}
              </span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                color: 'var(--ink4)', marginLeft: '12px' }}>
                {browseResults.length.toLocaleString()} principles
              </span>
            </div>
            <button onClick={() => { setActiveBook(null); setActiveTheme(null) }}
              className="btn btn-text" style={{ fontSize: '12px', color: 'var(--ink4)' }}>
              ← Back
            </button>
          </div>
        )}

        {/* Result rows */}
        {results.length > 0 && results.map((r, i) => (
          <ResultRow key={`${r.chapterId}-${r.idx}`} r={r} i={i} />
        ))}

        {/* Search mode — no query yet */}
        {mode === 'search' && !query && (
          <div style={{ padding: '60px 32px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '17px',
              fontStyle: 'italic', color: 'var(--ink4)', lineHeight: 1.7 }}>
              Type a word, theme, or phrase to search across<br />
              all 5,956 principles from Genesis to Revelation
            </p>
          </div>
        )}

        {/* Search — no results */}
        {mode === 'search' && query && results.length === 0 && (
          <div style={{ padding: '40px 32px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--ink5)' }}>
              No principles found for "{query}"
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
