// ── Types ──
export interface Principle {
  title: string
  verse_reference?: string
  application?: string
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
    // Apply theme filter
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
    // Fallback: any unused with slight randomisation
    return pool
      .sort(() => Math.random() - 0.5)
      .slice(0, k)
  }

  return scored.slice(0, k).map(x => x.c)
}

export function buildContextBlock(chapters: CorpusChapter[]): string {
  return chapters.map((c, i) => {
    const ref     = c.reference || c.ref || ''
    const title   = c.chapter_title || c.title || ''
    const obs     = c.observation || c.content || ''
    const godShot = c.god_shot || c.godShot || ''
    const themes  = c.themes.join(', ')
    const pLines  = c.principles.map((p, pi) => {
      if (typeof p === 'object') {
        return `${pi+1}. ${p.title}${p.application ? ' — ' + p.application : ''}`
      }
      return `• ${p}`
    }).join('\n')

    return [
      `SOURCE ${i+1}: ${ref} — "${title}"`,
      `Themes: ${themes}`,
      obs     ? `Observation: ${obs}` : '',
      `Principles:\n${pLines}`,
      godShot ? `God Shot: ${godShot}` : '',
    ].filter(Boolean).join('\n')
  }).join('\n---\n')
}
