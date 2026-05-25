'use client'

import { useState, useEffect, useMemo } from 'react'
import type { CorpusChapter } from '@/lib/corpus'
import { tokenize } from '@/lib/corpus'
import { Search, BookOpen } from 'lucide-react'

interface PrincipleResult {
  chapterId: string
  book: string
  testament: string
  reference: string
  chapterTitle: string
  principleIndex: number
  principleTitle: string
  application: string
  verseRef: string
  themes: string[]
  godShot: string
}

export default function SearchPage() {
  const [corpus,  setCorpus]  = useState<CorpusChapter[]>([])
  const [query,   setQuery]   = useState('')
  const [filter,  setFilter]  = useState<'all'|'OT'|'NT'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/corpus.json').then(r => r.json()).then(setCorpus).catch(console.error)
  }, [])

  // Flatten all principles into a searchable list
  const allPrinciples = useMemo<PrincipleResult[]>(() => {
    const results: PrincipleResult[] = []
    corpus.forEach(ch => {
      ch.principles.forEach((p, i) => {
        const title = typeof p === 'object' ? p.title : String(p)
        const app   = typeof p === 'object' ? (p.application || '') : ''
        const vref  = typeof p === 'object' ? (p.verse_reference || '') : ''
        results.push({
          chapterId:      ch.id,
          book:           ch.book,
          testament:      ch.testament,
          reference:      ch.reference || ch.ref || '',
          chapterTitle:   ch.chapter_title || ch.title || '',
          principleIndex: i,
          principleTitle: title,
          application:    app,
          verseRef:       vref,
          themes:         ch.themes,
          godShot:        ch.god_shot || ch.godShot || '',
        })
      })
    })
    return results
  }, [corpus])

  const results = useMemo(() => {
    let pool = filter === 'all' ? allPrinciples : allPrinciples.filter(p => p.testament === filter)
    if (!query.trim()) return pool.slice(0, 60)

    const tokens = tokenize(query)
    if (!tokens.length) return pool.slice(0, 60)

    return pool
      .map(p => {
        const haystack = (p.principleTitle + ' ' + p.application + ' ' + p.book + ' ' + p.themes.join(' ')).toLowerCase()
        let score = 0
        tokens.forEach(t => {
          const re = new RegExp(t, 'gi')
          score += (p.principleTitle.toLowerCase().match(re) || []).length * 4
          score += (p.application.toLowerCase().match(re)   || []).length * 1.5
          score += p.themes.some(th => th.includes(t)) ? 3 : 0
          score += p.book.toLowerCase().includes(t) ? 2 : 0
        })
        return { p, score }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 80)
      .map(x => x.p)
  }, [allPrinciples, query, filter])

  const stats = useMemo(() => ({
    total: allPrinciples.length,
    OT:    allPrinciples.filter(p => p.testament === 'OT').length,
    NT:    allPrinciples.filter(p => p.testament === 'NT').length,
  }), [allPrinciples])

  const toggleExpand = (key: string) =>
    setExpanded(prev => prev === key ? null : key)

  return (
    <div className="flex flex-col h-full">

      {/* Search header */}
      <div className="px-4 py-4 flex-shrink-0"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h2 className="font-mono text-[0.65rem] tracking-[0.2em] uppercase mb-3"
            style={{ color: 'var(--gold)' }}>
          Principle Search
        </h2>

        {/* Search input */}
        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-mute)' }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search across all 5,956 principles…"
            className="w-full pl-9 pr-4 py-2.5 text-sm outline-none"
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontFamily: 'Georgia, serif',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
            onBlur={e  => e.target.style.borderColor = 'var(--border)'}
            autoFocus
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 items-center">
          {(['all', 'OT', 'NT'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 font-mono text-[0.55rem] tracking-[0.1em] uppercase cursor-pointer transition-all"
              style={{
                border: `1px solid ${filter === f ? 'var(--gold)' : 'var(--border2)'}`,
                background: filter === f ? 'var(--gold-dim)' : 'transparent',
                color: filter === f ? 'var(--gold)' : 'var(--text-mute)',
              }}
            >
              {f === 'all' ? `All (${stats.total})` : f === 'OT' ? `OT (${stats.OT})` : `NT (${stats.NT})`}
            </button>
          ))}
          <span className="font-mono text-[0.5rem] ml-auto" style={{ color: 'var(--text-mute)' }}>
            {query ? `${results.length} results` : `Showing ${results.length}`}
          </span>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {corpus.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <span className="font-mono text-[0.6rem]" style={{ color: 'var(--text-mute)' }}>
              Loading corpus…
            </span>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <span className="font-mono text-[0.6rem]" style={{ color: 'var(--text-mute)' }}>
              No principles found for &ldquo;{query}&rdquo;
            </span>
          </div>
        ) : (
          results.map((r, idx) => {
            const key = `${r.chapterId}-${r.principleIndex}`
            const isOpen = expanded === key
            return (
              <div
                key={key}
                className="cursor-pointer transition-colors"
                style={{ borderBottom: '1px solid var(--border)' }}
                onClick={() => toggleExpand(key)}
              >
                <div className="px-4 py-3"
                     style={{ background: isOpen ? 'var(--surface2)' : 'transparent' }}>

                  {/* Ref + testament badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[0.55rem] tracking-[0.12em]"
                          style={{ color: 'var(--gold)', opacity: 0.8 }}>
                      {r.reference}
                    </span>
                    <span className="font-mono text-[0.45rem] px-1.5 py-0.5"
                          style={{
                            background: r.testament === 'NT' ? 'rgba(74,143,255,0.08)' : 'rgba(201,168,76,0.08)',
                            border: `1px solid ${r.testament === 'NT' ? 'rgba(74,143,255,0.2)' : 'rgba(201,168,76,0.2)'}`,
                            color: r.testament === 'NT' ? 'rgba(74,143,255,0.7)' : 'rgba(201,168,76,0.6)',
                          }}>
                      {r.testament}
                    </span>
                    <span className="font-mono text-[0.45rem]" style={{ color: 'var(--text-mute)' }}>
                      {r.book}
                    </span>
                    <span className="ml-auto font-mono text-[0.45rem]" style={{ color: 'var(--text-mute)' }}>
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Principle title */}
                  <p className="text-sm font-medium leading-snug"
                     style={{ color: 'var(--text)', fontFamily: 'Georgia, serif' }}>
                    {r.principleTitle}
                  </p>

                  {/* Themes */}
                  {r.themes.length > 0 && (
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {r.themes.slice(0, 4).map(t => (
                        <span key={t} className="font-mono text-[0.45rem] tracking-[0.08em]"
                              style={{ color: 'var(--text-mute)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded content */}
                  {isOpen && (
                    <div className="mt-3 space-y-2.5 animate-fade-up">
                      {r.verseRef && (
                        <p className="text-xs italic" style={{ color: 'var(--text-dim)' }}>
                          {r.verseRef}
                        </p>
                      )}
                      {r.application && (
                        <div>
                          <div className="font-mono text-[0.5rem] tracking-[0.15em] uppercase mb-1"
                               style={{ color: 'var(--gold)', opacity: 0.7 }}>
                            Application
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                            {r.application}
                          </p>
                        </div>
                      )}
                      {r.godShot && (
                        <div className="pl-3" style={{ borderLeft: '2px solid var(--gold)' }}>
                          <div className="font-mono text-[0.5rem] tracking-[0.15em] uppercase mb-1"
                               style={{ color: 'var(--gold)', opacity: 0.7 }}>
                            God Shot
                          </div>
                          <p className="text-xs italic leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                            {r.godShot.substring(0, 200)}{r.godShot.length > 200 ? '…' : ''}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 pt-1">
                        <BookOpen size={10} style={{ color: 'var(--text-mute)' }} />
                        <span className="font-mono text-[0.5rem]" style={{ color: 'var(--text-mute)' }}>
                          {r.chapterTitle}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
