// ── Types ──
export interface Principle {
  title: string
  verse_reference?: string
  principle?: string
  application?: string
  leap_flag?: string
  cross_ref?: string
}

export interface CorpusChapter {
  id: string
  sequence: number
  book: string
  testament: 'OT' | 'NT'
  category: string
  reference: string
  chapter_title: string
  observation: string
  principles: Principle[]
  god_shot: string
  themes: string[]
  principle_count: number
  // Legacy fields (from old extraction)
  ref?: string
  title?: string
  content?: string
  godShot?: string
}

// ── Theme categories ──
export const THEME_CATS = [
  { label: 'Identity & Calling',    themes: ['calling','identity','formation','anointing','election'] },
  { label: 'Character & Integrity', themes: ['character','pride','humility','wisdom','contentment','integrity'] },
  { label: 'Faith & Courage',       themes: ['faith','trust','obedience','conviction','endurance','overcoming'] },
  { label: 'Leadership',            themes: ['leadership','authority','discernment','servanthood','legacy'] },
  { label: 'Prayer & Worship',      themes: ['prayer','worship','intercession','presence','holiness'] },
  { label: 'Suffering & Trials',    themes: ['suffering','waiting','grief','restoration','healing'] },
  { label: 'Gospel & Salvation',    themes: ['grace','redemption','cross','resurrection','gospel','forgiveness'] },
  { label: 'Covenant & Sovereignty',themes: ['covenant','sovereignty','providence','kingdom','judgment'] },
  { label: 'Daily Life',            themes: ['family','community','generosity','stewardship','love','justice'] },
  { label: 'Spiritual Dangers',     themes: ['sin','pride','drift','compromise','fear','repentance'] },
  { label: 'Word & Spirit',         themes: ['word','Spirit','wisdom','holiness','meditation'] },
  { label: 'Hope & Eternity',       themes: ['hope','glory','heaven','endurance','witness'] },
] as const

// ── Stop words ──
const STOP = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'is','are','was','were','be','been','have','has','had','do','does','did',
  'will','would','could','should','may','might','can','that','this','it','its',
  'what','how','when','where','who','why','which','about','your','my','our',
  'they','he','she','we','you','i','am','if','so','than','then','very','just',
  'from','not','but','all','any','are','was','were','been','into','more','most',
])

const EXPAND: Record<string, string[]> = {
  leader:  ['leadership','authority','calling'],
  money:   ['wealth','stewardship','generosity','prosperity'],
  fear:    ['anxiety','worry','courage','trust'],
  prayer:  ['intercession','worship','seeking','fasting'],
  love:    ['relationships','covenant','community','family'],
  purpose: ['calling','vocation','mission','formation'],
  pride:   ['humility','arrogance','self'],
  wait:    ['patience','timing','seasons','endurance'],
  suffer:  ['suffering','trials','grief','exile'],
  sin:     ['repentance','compromise','drift'],
  holy:    ['holiness','consecration','set apart'],
  church:  ['community','body','unity','gifts'],
  forgiv:  ['forgiveness','mercy','grace','redemption'],
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w))
}

export function expandTokens(tokens: string[]): string[] {
  const expanded = [...tokens]
  tokens.forEach(t => {
    for (const [key, vals] of Object.entries(EXPAND)) {
      if (t.includes(key)) vals.forEach(v => expanded.push(v))
    }
  })
  return [...new Set(expanded)]
}

export function scoreChapter(
  chapter: CorpusChapter,
  tokens: string[],
  selectedThemes: Set<string>,
  usedIds: Set<string>
): number {
  if (usedIds.has(chapter.id)) return -1

  // Build searchable text from structured fields
  const principleText = chapter.principles
    .map(p => `${p.title} ${p.application || ''}`)
    .join(' ')
    .toLowerCase()

  const titleText   = (chapter.chapter_title || chapter.title || '').toLowerCase()
  const themeText   = chapter.themes.join(' ').toLowerCase()
  const godShotText = (chapter.god_shot || chapter.godShot || '').toLowerCase()
  const obsText     = (chapter.observation || chapter.content || '').toLowerCase()
  const bookText    = chapter.book.toLowerCase()

  let score = 0
  tokens.forEach(t => {
    const re = new RegExp(t, 'gi')
    const ptHits    = (principleText.match(re) || []).length
    const titleHit  = titleText.includes(t)   ? 5 : 0
    const themeHit  = themeText.includes(t)   ? 4 : 0
    const gsHits    = (godShotText.match(re) || []).length
    const obsHits   = (obsText.match(re)     || []).length
    const bookHit   = bookText.includes(t)    ? 2 : 0

    score += ptHits * 3 + titleHit + themeHit + gsHits * 1.5 + obsHits + bookHit
  })

  // Theme filter bonus
  if (selectedThemes.size > 0) {
    const themeBonus = chapter.themes.filter(t => selectedThemes.has(t)).length
    score += themeBonus * 6
  }

  return score
}

export function retrieve(
  corpus: CorpusChapter[],
  query: string,
  opts: {
    k?: number
    usedIds?: Set<string>
    selectedThemes?: Set<string>
    testament?: 'OT' | 'NT' | 'both'
    unusedOnly?: boolean
  } = {}
): CorpusChapter[] {
  const {
    k = 4,
    usedIds = new Set(),
    selectedThemes = new Set(),
    testament = 'both',
    unusedOnly = false,
  } = opts

  const tokens = expandTokens(tokenize(query))

  let pool = testament === 'both'
    ? corpus
    : corpus.filter(c => c.testament === testament)

  if (unusedOnly) {
    pool = pool.filter(c => !usedIds.has(c.id))
    if (selectedThemes.size > 0) {
      const themed = pool.filter(c => c.themes.some(t => selectedThemes.has(t)))
      if (themed.length >= 2) pool = themed
    }
  }

  const scored = pool
    .map(c => ({ c, s: scoreChapter(c, tokens, selectedThemes, unusedOnly ? new Set() : usedIds) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)

  if (unusedOnly && scored.length < 2) {
    return pool.sort(() => Math.random() - 0.5).slice(0, k)
  }

  // ── Book diversity enforcement ──
  // Never return more than 2 chunks from the same book
  // This prevents Isaiah (72 chunks) dominating every response
  const results: CorpusChapter[] = []
  const bookCount: Record<string, number> = {}

  for (const { c } of scored) {
    const book = c.book
    if (!bookCount[book]) bookCount[book] = 0
    if (bookCount[book] >= 2) continue   // max 2 per book
    results.push(c)
    bookCount[book]++
    if (results.length >= k) break
  }

  // If diversity filtering left us short, fill from top scores regardless
  if (results.length < k) {
    for (const { c } of scored) {
      if (!results.find(r => r.id === c.id)) {
        results.push(c)
        if (results.length >= k) break
      }
    }
  }

  return results
}

// Corpus verse_reference values are chapter-relative ("v. 15", "vv. 27–28").
// Combining them with the properly-cased `book` field and the chapter number
// yields a citable reference ("Genesis 32:27–28"). Without this the model only
// ever sees chapter-level references and invents verse numbers when asked to
// cite — so this function is what makes accurate citation possible at all.
// Every one of the 4,065 `principle` values ends with the modern application
// appended after a "- **Modern application:**" marker — the same text that is
// also stored in `application`. Emitting both duplicates it verbatim and
// undercuts the instruction to pray the principle rather than the application,
// so the tail is split off here. Marker is 100% consistent across the corpus.
const MODERN_APP_MARKER = /[-*\s]*\*\*Modern application[:*\s]*/i

function principleCore(raw?: string): string {
  if (!raw) return ''
  return raw.split(MODERN_APP_MARKER)[0].trim()
}

function fullCitation(c: CorpusChapter, verseRef?: string): string {
  const chapNum  = (c.reference || c.ref || '').match(/(\d+)\s*$/)?.[1] || ''
  const bookChap = [c.book, chapNum].filter(Boolean).join(' ')
  if (!verseRef) return bookChap
  const verses = verseRef.replace(/^vv?\.\s*/i, '').trim()
  return verses ? `${bookChap}:${verses}` : bookChap
}

/**
 * Build the retrieved-corpus context passed to the model.
 *
 * `rich` mode additionally emits verse-level citations, the `principle` field
 * (the substantive theological content, which frequently carries quoted
 * scriptural language) and any interpretive leap flags. Default mode is
 * unchanged so devotion and Ask keep their existing context size and behaviour.
 *
 * Standard mode sends only principle title + application — and `application` is
 * the modern-application prose. Asking for scripturally anchored prayer while
 * supplying only application prose is what produces narrative output.
 */
export function buildContextBlock(
  chapters: CorpusChapter[],
  opts: { rich?: boolean } = {},
): string {
  const { rich = false } = opts

  return chapters.map((c, i) => {
    const ref     = c.reference || c.ref || ''
    const title   = c.chapter_title || c.title || ''
    const obs     = c.observation || c.content || ''
    const godShot = c.god_shot || c.godShot || ''
    const themes  = c.themes.join(', ')

    const pLines = c.principles.map((p, pi) => {
      if (typeof p !== 'object') return `• ${p}`

      if (!rich) {
        return `${pi+1}. ${p.title}${p.application ? ' — ' + p.application : ''}`
      }

      const cite = fullCitation(c, p.verse_reference)
      const core = principleCore(p.principle)
      return [
        `${pi+1}. [${cite}] ${p.title}`,
        core        ? `   Principle: ${core}`          : '',
        p.cross_ref ? `   Cross-ref: ${p.cross_ref}`   : '',
        p.leap_flag ? `   LEAP FLAG: ${p.leap_flag}`   : '',
      ].filter(Boolean).join('\n')
    }).join('\n')

    return [
      `SOURCE ${i+1}: ${rich ? fullCitation(c) : ref} — "${title}"`,
      `Themes: ${themes}`,
      obs     ? `Observation: ${obs}` : '',
      `Principles:\n${pLines}`,
      godShot ? `God Shot: ${godShot}` : '',
    ].filter(Boolean).join('\n')
  }).join('\n---\n')
}
