'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { loadLocal, saveLocal, pushToCloud, keys, dateLabel } from '@/lib/sync'
import { retrieve, buildContextBlock } from '@/lib/corpus'
import { detectPattern, KINGDOM_PATTERNS } from '@/lib/patterns'
import type { CorpusChapter } from '@/lib/corpus'
import type { TrackerEntry, HistoryEntry } from '@/lib/supabase'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: CorpusChapter[]
  pattern?: { name: string; description: string; formation_question: string; carrying_question: string; icon: string; color: string }
  error?: boolean
}

interface UseCorpusChatOpts {
  corpus: CorpusChapter[]
  devoMode?: boolean
  testament?: 'OT' | 'NT' | 'both'
  selectedThemes?: Set<string>
}

export function useCorpusChat({
  corpus,
  devoMode = false,
  testament = 'both',
  selectedThemes = new Set(),
}: UseCorpusChatOpts) {
  const { user, profile } = useAuth()
  const [messages,  setMessages]  = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])

  const getUsedIds = useCallback((): Set<string> => {
    if (!user) return new Set()
    const k = keys(user.id)
    const tracker = loadLocal<Record<string, TrackerEntry>>(k.tracker, {})
    return new Set(Object.keys(tracker))
  }, [user])

  const markUsed = useCallback((chapters: CorpusChapter[]) => {
    if (!user) return
    const k       = keys(user.id)
    const tracker = loadLocal<Record<string, TrackerEntry>>(k.tracker, {})
    const now     = dateLabel()
    chapters.forEach(c => {
      if (!tracker[c.id]) {
        tracker[c.id] = {
          id: c.id,
          ref: c.reference || c.ref || '',
          title: c.chapter_title || c.title || '',
          book: c.book,
          date: now,
        }
      }
    })
    saveLocal(k.tracker, tracker)
    pushToCloud(user.id, 'tracker', tracker)
  }, [user])

  const saveToHistory = useCallback((query: string, reply: string, chapters: CorpusChapter[]) => {
    if (!user) return
    const k       = keys(user.id)
    const history = loadLocal<HistoryEntry[]>(k.history, [])
    const entry: HistoryEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      dateLabel: dateLabel(),
      query,
      reply,
      refs: chapters.map(c => c.reference || c.ref || '').join(', '),
      books: [...new Set(chapters.map(c => c.book))].join(', '),
    }
    const updated = [entry, ...history].slice(0, 365)
    saveLocal(k.history, updated)
    pushToCloud(user.id, 'history', updated)

    // Increment devotion count
    const prevCount = parseInt(localStorage.getItem(k.devcount) || '0')
    const newCount  = prevCount + 1
    localStorage.setItem(k.devcount, String(newCount))
    pushToCloud(user.id, 'devotion_count', newCount)
  }, [user])

  const buildSystemPrompt = useCallback((chapters: CorpusChapter[], query: string, detectedPattern: ReturnType<typeof detectPattern>['pattern']) => {
    const name = profile?.name || 'the reader'
    const occ  = profile?.occupation || 'daily life'
    const ctx  = buildContextBlock(chapters)

    if (devoMode) {
      const patternBlock = detectedPattern
        ? [
            '',
            'KINGDOM PATTERN IDENTIFIED: ' + detectedPattern.name,
            'Pattern Description: ' + detectedPattern.description,
            'Formation Question: ' + detectedPattern.formation_question,
            'Carrying Question: ' + detectedPattern.carrying_question,
            '',
            'Weave this pattern explicitly into the devotion. Name the pattern early, explain what it means for someone in this season, and close with the carrying question as the final line before the prayer.',
            '',
          ].join('\n')
        : ''

      return [
        'You are Berean, generating a structured daily devotion for ' + name + ' (' + occ + '). Draw exclusively from the provided corpus passages.',
        '',
        'DEVOTION FORMAT — follow precisely:',
        '',
        '**OBSERVATION**',
        'What the text says — narrative context, key details, covenant setting. 2-3 sentences.',
        '',
        '**INTERPRETATION**',
        'What it means — the move from text to principle. Flag any interpretive leap.',
        '',
        '**TIMELESS PRINCIPLE**',
        '[PRINCIPLE]One sentence — memorable, transferable, rooted in the text.[/PRINCIPLE]',
        '',
        '**CRITICAL ASSESSMENT**',
        '- Support strength: Strong / Moderate / Weak',
        '- Interpretive leap: flag if needed',
        '- Alternative interpretation',
        '',
        '**MODERN APPLICATION**',
        '3-4 sentences of specific concrete application to ' + occ + '. Be practical not abstract.',
        '',
        '**CROSS-REFERENCES**',
        '2-3 cross-references (same book, OT parallel, NT echo). Similarity AND difference for each.',
        '',
        '**GENRE & COVENANT CONTEXT**',
        'One sentence on genre. One sentence warning against misapplication.',
        '',
        '**PRAYER**',
        '1. IDENTITY IN CHRIST',
        '2. COVENANT PROMISES',
        '3. ALIGNMENT WITH GOD\'S WILL',
        '4. SPOKEN DECLARATIONS — 2-3 bold present-tense declarations',
        '',
        'Close: "In Jesus\' Name, Amen."',
        '',
        'Total: 1200-1600 words. Theologically rigorous AND devotionally warm.',
        patternBlock,
        'CORPUS PASSAGES:',
        ctx,
      ].join('\n')
    }

    return [
      'You are Berean, a rigorous biblical wisdom companion grounded in a complete corpus of narrative-sequence biblical principles spanning all 66 books of Scripture. You are speaking with ' + name + '.',
      '',
      'IMPORTANT CONTEXT: The corpus passages below are the 4 most relevant passages retrieved for this specific query. The full corpus covers all 66 books — Genesis through Revelation — with 5,956 principles total. Your answers draw primarily from the provided passages but you may reference other biblical books and principles when directly relevant, always clearly distinguishing what is in the provided passages versus your broader knowledge.',
      '',
      'RULES:',
      '1. Base your primary answer on the provided corpus passages.',
      '2. If the question clearly requires perspectives from books NOT in the provided passages, acknowledge this and indicate which books address it.',
      '3. Always cite which book/passage a principle comes from.',
      '4. Use [PRINCIPLE]...[/PRINCIPLE] tags when stating a timeless principle.',
      '5. Use [WARNING]...[/WARNING] when flagging misapplication risk.',
      '6. Be pastoral and warm, not academic.',
      '7. Distinguish original narrative context from modern application.',
      '8. Offer a follow-up question the reader should sit with.',
      '',
      'CORPUS PASSAGES:',
      ctx,
      '',
      'User question: ' + query,
    ].join('\n')
  }, [profile, devoMode])

  const sendMessage = useCallback(async (query: string) => {
    if (!query.trim() || streaming) return

    const usedIds = getUsedIds()
    const chapters = retrieve(corpus, query, {
      k: devoMode ? 3 : 4,
      usedIds,
      selectedThemes,
      testament,
      unusedOnly: devoMode,
    })

    // Detect the dominant Kingdom Pattern from retrieved chapters
    const patternScores: Record<string, number> = {}
    for (const ch of chapters) {
      const { pattern, score } = detectPattern(ch)
      if (pattern && score > 0) {
        patternScores[pattern.name] = (patternScores[pattern.name] || 0) + score
      }
    }
    const topPatternName = Object.keys(patternScores).sort((a,b) => patternScores[b]-patternScores[a])[0]
    const topPattern = topPatternName ? KINGDOM_PATTERNS[topPatternName] : null

    // Add user message
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: query }
    setMessages(prev => [...prev, userMsg])

    // Add thinking placeholder
    const thinkingId = `thinking-${Date.now()}`
    setMessages(prev => [...prev, {
      id: thinkingId, role: 'assistant', content: '', sources: chapters,
    }])

    setStreaming(true)
    historyRef.current.push({ role: 'user', content: query })

    try {
      const system = buildSystemPrompt(chapters, query, topPattern)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: devoMode ? 2500 : 1200,
          system,
          messages: historyRef.current.slice(-20),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`)
      }

      const reply = data.content?.[0]?.text || ''
      historyRef.current.push({ role: 'assistant', content: reply })

      // Replace thinking with real response — include pattern if detected
      const patternData = topPattern ? {
        name: topPattern.name,
        description: topPattern.description,
        formation_question: topPattern.formation_question,
        carrying_question: topPattern.carrying_question,
        icon: topPattern.icon,
        color: topPattern.color,
      } : undefined

      setMessages(prev => prev.map(m =>
        m.id === thinkingId
          ? { id: 'a-' + Date.now(), role: 'assistant' as const, content: reply, sources: chapters, pattern: patternData }
          : m
      ))

      // Track and save
      if (devoMode) {
        markUsed(chapters)
        saveToHistory(query, reply, chapters)
      }


    } catch (err: unknown) {
      const e = err as { message?: string }
      setMessages(prev => prev.map(m =>
        m.id === thinkingId
          ? { id: `err-${Date.now()}`, role: 'assistant', content: e?.message || 'Unknown error', error: true }
          : m
      ))
    } finally {
      setStreaming(false)
    }
  }, [corpus, devoMode, testament, selectedThemes, streaming, getUsedIds, buildSystemPrompt, markUsed, saveToHistory])

  const clearMessages = useCallback(() => {
    setMessages([])
    historyRef.current = []
  }, [])

  return { messages, streaming, sendMessage, clearMessages }
}
