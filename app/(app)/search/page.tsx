'use client'

import { useState, useEffect, useMemo } from 'react'
import type { CorpusChapter } from '@/lib/corpus'
import { tokenize } from '@/lib/corpus'

interface Result {
  chapterId: string; book: string; testament: string; reference: string
  chapterTitle: string; idx: number; title: string
  application: string; verseRef: string; themes: string[]; godShot: string
}

export default function SearchPage() {
  const [corpus,   setCorpus]   = useState<CorpusChapter[]>([])
  const [query,    setQuery]    = useState('')
  const [filter,   setFilter]   = useState<'all'|'OT'|'NT'>('all')
  const [expanded, setExpanded] = useState<string|null>(null)

  useEffect(() => {
    fetch('/corpus.json').then(r => r.json()).then(setCorpus).catch(console.error)
  }, [])

  const all = useMemo<Result[]>(() => {
    const out: Result[] = []
    corpus.forEach(ch => {
      ch.principles.forEach((p, i) => {
        const t = typeof p === 'object' ? p.title : String(p)
        const a = typeof p === 'object' ? (p.application || '') : ''
        const v = typeof p === 'object' ? (p.verse_reference || '') : ''
        out.push({ chapterId: ch.id, book: ch.book, testament: ch.testament,
          reference: ch.reference || ch.ref || '', chapterTitle: ch.chapter_title || ch.title || '',
          idx: i, title: t, application: a, verseRef: v, themes: ch.themes,
          godShot: ch.god_shot || ch.godShot || '' })
      })
    })
    return out
  }, [corpus])

  const results = useMemo(() => {
    let pool = filter === 'all' ? all : all.filter(p => p.testament === filter)
    if (!query.trim()) return pool.slice(0, 50)
    const tokens = tokenize(query)
    if (!tokens.length) return pool.slice(0, 50)
    return pool.map(p => {
      const h = (p.title + ' ' + p.application + ' ' + p.book + ' ' + p.themes.join(' ')).toLowerCase()
      let s = 0
      tokens.forEach(t => {
        const re = new RegExp(t, 'gi')
        s += (p.title.toLowerCase().match(re) || []).length * 4
        s += (p.application.toLowerCase().match(re) || []).length * 1.5
        s += p.themes.some(th => th.includes(t)) ? 3 : 0
        s += p.book.toLowerCase().includes(t) ? 2 : 0
      })
      return { p, s }
    }).filter(x => x.s > 0).sort((a,b) => b.s - a.s).slice(0, 80).map(x => x.p)
  }, [all, query, filter])

  const stats = useMemo(() => ({
    total: all.length,
    OT: all.filter(p => p.testament === 'OT').length,
    NT: all.filter(p => p.testament === 'NT').length,
  }), [all])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Search header */}
      <div style={{
        padding: '24px 32px 20px',
        background: 'var(--paper)',
        borderBottom: '1px solid var(--rule)',
        flexShrink: 0,
      }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px',
          fontWeight: 500, color: 'var(--ink)', marginBottom: '16px' }}>
          Principle Search
        </h1>

        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--ink5)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search 5,956 principles across 66 books…"
            className="input-field"
            style={{ paddingLeft: '42px', paddingRight: '16px', paddingTop: '13px',
              paddingBottom: '13px', fontSize: '15px' }}
            autoFocus
          />
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {([['all', `All  ${stats.total.toLocaleString()}`],
             ['OT',  `Old Testament  ${stats.OT.toLocaleString()}`],
             ['NT',  `New Testament  ${stats.NT.toLocaleString()}`]] as const)
          .map(([f, label]) => (
            <button key={f} onClick={() => setFilter(f as typeof filter)}
              className={'btn btn-outline' + (filter === f ? ' on' : '')}
              style={{ padding: '6px 16px', fontSize: '12px', borderRadius: '100px' }}>
              {label}
            </button>
          ))}
          {query && (
            <span style={{ marginLeft: 'auto', fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px', color: 'var(--ink5)' }}>
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {corpus.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--ink5)',
            fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>
            Loading corpus…
          </div>
        ) : results.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--ink5)',
            fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>
            No principles found for &ldquo;{query}&rdquo;
          </div>
        ) : (
          results.map((r, i) => {
            const key = `${r.chapterId}-${r.idx}`
            const open = expanded === key
            return (
              <div key={key} className={'search-row' + (open ? ' open' : '')}
                onClick={() => setExpanded(open ? null : key)}>

                {/* Reference + testament */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
                  marginBottom: '6px' }}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                    fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--gold2)' }}>
                    {r.reference}
                  </span>
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif', fontSize: '9px', fontWeight: 600,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: '100px',
                    background: r.testament === 'NT' ? 'rgba(42,61,106,0.08)' : 'var(--gold-bg)',
                    color: r.testament === 'NT' ? 'var(--sapphire)' : 'var(--gold)',
                    border: `1px solid ${r.testament === 'NT' ? 'rgba(42,61,106,0.2)' : 'rgba(138,109,53,0.2)'}`,
                  }}>
                    {r.testament === 'NT' ? 'NT' : 'OT'}
                  </span>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                    color: 'var(--ink5)' }}>{r.book}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px', color: 'var(--ink5)', flexShrink: 0 }}>
                    #{(i+1).toLocaleString()}
                  </span>
                </div>

                {/* Principle title */}
                <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '16px',
                  fontWeight: 400, color: 'var(--ink)', lineHeight: 1.55,
                  marginBottom: r.themes.length ? '8px' : 0 }}>
                  {r.title}
                </p>

                {/* Themes */}
                {r.themes.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {r.themes.slice(0, 5).map(t => (
                      <span key={t} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px',
                        color: 'var(--ink5)', padding: '2px 8px', background: 'var(--paper2)',
                        border: '1px solid var(--rule)', borderRadius: '100px' }}>{t}</span>
                    ))}
                  </div>
                )}

                {/* Expanded content */}
                {open && (
                  <div className="fade-in" style={{ marginTop: '16px', paddingTop: '16px',
                    borderTop: '1px solid var(--rule)' }}>
                    {r.verseRef && (
                      <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '14px',
                        fontStyle: 'italic', color: 'var(--ink4)', marginBottom: '12px' }}>
                        {r.verseRef}
                      </p>
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
                          {r.godShot.substring(0, 220)}{r.godShot.length > 220 ? '…' : ''}
                        </p>
                      </div>
                    )}
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                      color: 'var(--ink5)', fontStyle: 'italic' }}>
                      {r.chapterTitle}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
