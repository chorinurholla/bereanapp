'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { loadLocal, saveLocal, pushToCloud, keys } from '@/lib/sync'
import { retrieve, buildContextBlock, tokenize, expandTokens } from '@/lib/corpus'
import type { CorpusChapter } from '@/lib/corpus'
import type { JournalEntry } from '@/lib/supabase'
import { BookMarked, Copy, Check, Share2 } from 'lucide-react'
import { toast } from 'sonner'

// ── 7 Prayer Modes ──────────────────────────────────────
type PrayerMode =
  | 'adoration'
  | 'confession'
  | 'thanksgiving'
  | 'intercession'
  | 'lament'
  | 'declaration'
  | 'warfare'

const MODES = [
  {
    id:          'adoration' as const,
    label:       'Adoration',
    icon:        '✦',
    color:       '#8a6d35',
    tagline:     'Pray who God is — no requests, no agenda, pure encounter',
    description: 'Adoration is prayer with no agenda. You are not asking for anything. You are simply engaging with who God is — His character, His names, His nature. This is the prayer David prayed in 2 Samuel 7:18 when he sat before the Lord in wonder. It is the foundation all other prayer rests on.',
    promptLabel: 'What aspect of who God is do you want to dwell on?',
    placeholder: 'What has God revealed about Himself recently? What name or attribute of His has been weighing on you? Or simply: what do you want to marvel at today?',
    examples: [
      'His faithfulness in a season where I expected Him to fail me',
      'The fact that He is sovereign over everything I cannot control',
      'His patience with me when I keep returning to the same failures',
      'That He chose to be known rather than remain hidden',
      'His justice — that wrong things will not go unreckoned with',
    ],
    queryBoost: 'God character holiness sovereignty faithful',
  },
  {
    id:          'confession' as const,
    label:       'Confession',
    icon:        '○',
    color:       '#5a4535',
    tagline:     'Honest acknowledgment — with Job\'s freedom to question and protest',
    description: 'Biblical confession is not only admitting sin — it is bringing your full honest self before God. Job argued with God and God vindicated him (Job 42:7). The Psalms contain raw protest. Confession includes honest acknowledgment of sin, yes — but also the freedom to say: I do not understand this. I am angry. I am confused. God does not need dishonest defenders.',
    promptLabel: 'What do you need to bring honestly before God?',
    placeholder: 'What sin, failure, or confusion do you need to acknowledge honestly? What are you pretending is fine when it is not? Or: what about God\'s ways do you genuinely not understand right now?',
    examples: [
      'A pattern of sin I keep returning to despite knowing better',
      'Pretending to trust God while actually operating in fear',
      'Anger at God about something I have never said out loud',
      'Confession for a specific failure in a relationship or decision',
      'Honest confusion about why God has allowed something I prayed against',
    ],
    queryBoost: 'confession repentance sin honest prayer lament',
  },
  {
    id:          'thanksgiving' as const,
    label:       'Thanksgiving',
    icon:        '→',
    color:       '#4a5a3a',
    tagline:     'Rehearse specific past faithfulness — not general gratitude',
    description: 'Biblical thanksgiving is not a mood — it is a practice of specific memory. Paul in Philippians 4:6 connects thanksgiving to the peace that passes understanding. The Psalms rehearse specific acts of God, not vague appreciation. Gratitude that names what happened is formation. Gratitude that stays abstract is decoration.',
    promptLabel: 'What specific act of God do you want to rehearse and give thanks for?',
    placeholder: 'What has God specifically done — recently or in your history — that you want to name and acknowledge? The more specific the better: a provision, a rescue, a word, a person He placed in your path.',
    examples: [
      'A specific door He opened that I did not deserve',
      'How He brought me through a season I did not think I would survive',
      'A specific person He placed in my life at exactly the right moment',
      'The way He kept a promise I had almost stopped believing He would keep',
      'Something small this week that revealed His attention to detail in my life',
    ],
    queryBoost: 'thanksgiving praise remember faithfulness gratitude',
  },
  {
    id:          'intercession' as const,
    label:       'Intercession',
    icon:        '✋',
    color:       '#3a4a6a',
    tagline:     'Stand in the gap for a named person, community, or nation',
    description: 'Intercession is standing between God and someone who cannot stand there themselves. Nehemiah 1, Daniel 9, Ezra 9 — the great intercessors include themselves in the confession. They pray "we" not "they." Identificational intercession requires solidarity, not superiority.',
    promptLabel: 'Who or what are you standing in the gap for?',
    placeholder: 'Name the person, community, church, city, or nation you are interceding for. The more specifically you name them, the more specifically the prayer can be formed.',
    examples: [
      'A family member who has walked away from faith',
      'A friend walking through grief or crisis',
      'My church and its leaders',
      'Nigeria and its government',
      'A colleague going through a marriage breakdown',
      'A community experiencing violence or poverty',
    ],
    queryBoost: 'intercession stand in gap prayer community nation',
  },
  {
    id:          'lament' as const,
    label:       'Lament',
    icon:        '☽',
    color:       '#3a3a5a',
    tagline:     'Raw grief and protest directed toward God — not away from Him',
    description: 'Lament is the most neglected and most necessary prayer mode. It is grief that runs toward God rather than away from Him. Job demanded a hearing and God vindicated him. Psalm 88 ends with "darkness is my only companion" — no resolution, no tidy conclusion. Lament that produces premature resolution is not lament. The structure: Address God → Name the grief honestly → Ask "how long?" → Express trust — however fragile.',
    promptLabel: 'What grief, loss, or unanswered cry do you need to bring before God?',
    placeholder: 'What pain, loss, or darkness have you been carrying? What have you been praying for without visible answer? What are you grieving? Name it honestly — God is not offended by your grief.',
    examples: [
      'A loss I have not fully acknowledged before God',
      'A prayer I have prayed for years with no visible answer',
      'Grief about something I cannot change or undo',
      'The silence of God in a season where I desperately needed to hear Him',
      'Anger and confusion about suffering I have witnessed or experienced',
    ],
    queryBoost: 'lament grief suffering darkness honest cry Psalms Job',
  },
  {
    id:          'declaration' as const,
    label:       'Covenant Declaration',
    icon:        '⚔',
    color:       '#6a3a3a',
    tagline:     'Speak what God has said over what you see',
    description: 'Covenant Declaration is speaking the Word of God into a specific situation — not as a formula, but as faith speaking. It is closest to what Nehemiah did when he quoted Deuteronomy 30 back to God. It is what David did when he declared God\'s character before any circumstances changed. Not positive thinking — covenant speech grounded in what God has actually said.',
    promptLabel: 'What covenant reality do you want to declare over your situation?',
    placeholder: 'What situation needs the Word of God spoken over it? What promise have you received that feels distant from your present reality? What are you declaring despite what you see?',
    examples: [
      'God\'s provision over financial scarcity',
      'My identity in Christ over shame and accusation',
      'God\'s sovereignty over a situation that feels chaotic',
      'The promises over my calling that still feel far off',
      'Healing and restoration over my family',
    ],
    queryBoost: 'declaration covenant promise word faith speak',
  },
  {
    id:          'warfare' as const,
    label:       'Warfare & Enforcement',
    icon:        '◈',
    color:       '#4a2a4a',
    tagline:     'Enforce what Christ has already accomplished — from a position of victory',
    description: 'Warfare prayer is not asking God to win — Christ has already won (Colossians 2:15). It is enforcing an accomplished victory from the position of being seated with Christ in heavenly places (Ephesians 1:20-23, 2:6). The authority is delegated (Luke 10:19), the ground is Christ\'s blood and resurrection, and the posture is standing firm (Ephesians 6:13) — not striving. Grounded in 2 Corinthians 10:3-5, Daniel 10, and the full armor of Ephesians 6.',
    promptLabel: 'What spiritual opposition or stronghold are you enforcing Christ\'s victory over?',
    placeholder: 'What opposition — in your own mind, in a relationship, in a territory or situation — do you need to address from your position in Christ? Name the specific resistance, not the enemy\'s territory.',
    examples: [
      'Patterns of fear and anxiety that operate like a stronghold in my thinking',
      'Spiritual opposition over a ministry or assignment I have been given',
      'Generational patterns in my family I want to see broken',
      'Opposition to a breakthrough I have been contending for',
      'The spiritual climate over my city or community',
    ],
    queryBoost: 'warfare authority spiritual victory stronghold Ephesians Daniel',
  },
]

// ── System prompts for all 7 modes ──────────────────────
function buildPrayerPrompt(
  mode: PrayerMode,
  situation: string,
  name: string,
  occ: string,
  contextBlock: string
): { prompt: string; maxTokens: number } {

  const base = `You are Berean, generating a deeply biblical prayer for ${name} (${occ}). Every section must be grounded in the provided corpus passages. Every claim must be traceable to Scripture.`

  const formats: Record<PrayerMode, { instructions: string; maxTokens: number }> = {

    adoration: {
      maxTokens: 1000,
      instructions: `
PRAYER MODE: ADORATION — Dwelling on who God is, no requests attached.

FOCUS: ${situation}

Generate a prayer of pure adoration drawn from the provided corpus passages. This prayer has no petition. The person is not asking for anything. They are simply engaging with who God is.

STRUCTURE:

**THE NAME**
Open by addressing God by a name or attribute that the corpus passages reveal — not generically but specifically connected to what the person wants to dwell on. 2-3 sentences.

**THE WONDER**
Express genuine marvel at the specific aspect of God's character named. Draw from corpus principles about God's nature. 4-5 sentences. Let this be unhurried — this is not a prayer that rushes. "Who am I, O Lord, that you have brought me thus far?" (2 Sam 7:18) — the posture of sitting before God in wonder.

**THE KNOWING**
3-4 sentences that move from marvel to knowing — what this attribute of God means for how you see everything else. Not application in the pragmatic sense — transformation of perspective.

**THE RESPONSE**
Close with the person's own response to who God is — not what they want from Him, but what knowing Him like this calls out of them. 2-3 sentences.

Close: "In Jesus' Name, Amen."

Total: 350-500 words. Unhurried, contemplative, non-instrumental.

CORPUS PASSAGES:
${contextBlock}`,
    },

    confession: {
      maxTokens: 1100,
      instructions: `
PRAYER MODE: CONFESSION — Honest acknowledgment including protest and honest questioning.

WHAT NEEDS TO BE BROUGHT HONESTLY: ${situation}

Generate a prayer of honest confession that does NOT sanitize, does NOT rush to resolution, and does NOT produce false comfort. God does not need dishonest defenders (Job 13). He vindicates honest wrestling over polished theology.

STRUCTURE:

**COMING WITHOUT PRETENSE**
Open honestly — not with pious language but with the actual posture. "I have been pretending this is fine." "I have been performing prayer rather than praying." 2-3 sentences.

**THE HONEST NAMING**
Name the sin, failure, confusion, or anger directly and specifically. Do not soften it. Do not rush past it. 4-5 sentences. If this is a protest or honest question about God's ways, give it full expression — the way Job gave his case a full hearing. God is not threatened by this.

**THE DEEPER THING**
Underneath the presenting sin or question, there is usually something more fundamental — a false belief about God, a place where trust has broken. Name that deeper thing. 3-4 sentences. Draw from corpus principles.

**THE TURNING**
Not a resolution — a turning. Not "I will never do this again" but "I turn my face toward you from this place." 2-3 sentences grounded in God's covenant mercy, not the person's performance.

**THE RECEIVING**
Receive what God offers in response to honest confession — not based on the person's worthiness but based on covenant. Draw from corpus passages about grace and mercy. 2-3 sentences.

Close: "In Jesus' Name, Amen."

Total: 400-550 words. Do NOT rush to resolution. Sit in honest acknowledgment before moving toward grace.

CORPUS PASSAGES:
${contextBlock}`,
    },

    thanksgiving: {
      maxTokens: 900,
      instructions: `
PRAYER MODE: THANKSGIVING — Specific rehearsal of God's faithfulness, not generic gratitude.

WHAT TO GIVE THANKS FOR: ${situation}

Generate a prayer of specific thanksgiving. Biblical thanksgiving is not a mood — it is a practice of naming what happened. Vague gratitude is decoration. Specific gratitude is formation.

STRUCTURE:

**THE REHEARSAL**
Name what God did — specifically, not generally. "You provided" is not enough. "You opened that door at the exact moment when I had stopped believing one would open" — that is thanksgiving. 4-5 sentences drawn from the specific situation and corpus principles about God's faithfulness.

**THE WEIGHT OF IT**
What would it have meant if this had not happened? Name the alternative. This is not anxious retrospection — it is letting the weight of God's provision actually land. 2-3 sentences.

**THE PATTERN**
Connect this specific act of God to a larger pattern of His faithfulness — in the person's life, in Scripture's narrative. Draw from corpus principles. 2-3 sentences.

**THE OFFERING**
Thanksgiving is not just acknowledgment — it is an offering. What does this thankfulness call out of the person in response? Not a list of promises — one genuine response. 2-3 sentences.

Close: "In Jesus' Name, Amen."

Total: 350-450 words. Specific, weighted, unhurried.

CORPUS PASSAGES:
${contextBlock}`,
    },

    intercession: {
      maxTokens: 1200,
      instructions: `
PRAYER MODE: INTERCESSION — Standing in the gap for a named person, community, or nation.

SUBJECT OF INTERCESSION: ${situation}

Generate a prayer of intercession following the biblical pattern: the intercessor identifies with those they carry, does not stand above them, prays "we" not "they." (Nehemiah 1:6, Daniel 9, Ezra 9 — all righteous intercessors include themselves in the confession.)

STRUCTURE:

**APPROACHING THE THRONE**
Acknowledge who God is in relation to the subject of intercession — His commitment to them, His covenant, His character. 2-3 sentences grounded in corpus passages.

**THE IDENTIFICATION**
The intercessor does not stand outside those they carry. Stand with them, not above them. Use "we" or at minimum "they who are also part of me." 2-3 sentences.

**NAMING THE NEED**
Name both the presenting need (what can be seen) and the deeper need beneath it (what only God can see and address). 4-5 sentences. Be specific — not "bless them" but "they are carrying this specific weight and beneath it is this specific wound or need."

**THE BIBLICAL GROUNDS**
On what basis is this prayer made? Not the subject's merit, not the intercessor's — but what God has said, what covenant He has made, what He has done before. 3-4 sentences drawn from corpus passages.

**SPEAKING OVER THEM**
Pray specific blessings, specific realities, specific futures over the subject of intercession. "May they know…" "Bring them to…" "Let them experience…" 4-5 sentences.

**THE INTERCESSOR'S POSTURE**
Close with the intercessor's commitment — to keep standing in the gap, to not be moved by delay, to hold the ground in prayer. 2-3 sentences.

Close: "In Jesus' Name, Amen."

Total: 500-650 words. Genuine intercession — specific, grounded, not a wish list.

CORPUS PASSAGES:
${contextBlock}`,
    },

    lament: {
      maxTokens: 1100,
      instructions: `
PRAYER MODE: LAMENT — Raw grief directed toward God, not away from Him.

WHAT IS BEING BROUGHT: ${situation}

Generate a prayer of lament. THIS IS NOT A PROBLEM-SOLVING PRAYER. It must NOT resolve too quickly. Psalm 88 ends with "darkness is my only companion" — no resolution. Job demanded a hearing and God vindicated him over the friends who gave tidy answers.

The structure of biblical lament: Address → Complaint (honest) → "How long?" → Memory of past faithfulness → Appeal → Fragile trust. Not all laments reach full resolution. That is honest and biblical.

STRUCTURE:

**THE ADDRESS**
Turn toward God — not away. Even in darkness, toward. Name who He is while naming that He feels absent or silent. This is the paradox of lament: speaking to the One whose silence is what you are lamenting. 2-3 sentences.

**THE HONEST COMPLAINT**
Name the grief, the loss, the confusion, the unanswered prayer — specifically, without softening it. Let the weight be felt. "How long, O Lord?" is a legitimate prayer. "Why have you forsaken me?" is a legitimate prayer — Jesus prayed it. 5-6 sentences. Do NOT rush past this.

**THE MEMORY**
In the middle of lament, memory is not cheap comfort — it is evidence. What has God done before? What has He proven in the past? Not to minimize the present darkness but to hold both things at once: this is dark AND He has been faithful. 3-4 sentences from corpus principles.

**THE FRAGILE APPEAL**
Not a confident declaration — a fragile turning. "Even now…" "Do not let this be the end of the story…" "I cannot see the way forward but I know you can." 2-3 sentences. Allow the fragility.

**THE POSTURE**
Hold the ambiguity. Trust that may not feel like trust. The lament does not have to be resolved to be complete. Close with a single line of minimal, honest trust. Not triumphant. Just honest.

Close: "In Jesus' Name, Amen."

Total: 450-600 words. Do NOT force resolution. Sit in honest grief. This is a holy act.

CORPUS PASSAGES:
${contextBlock}`,
    },

    declaration: {
      maxTokens: 1200,
      instructions: `
PRAYER MODE: COVENANT DECLARATION — Speaking what God has said over what you see.

WHAT IS BEING DECLARED OVER: ${situation}

Generate a structured covenant declaration. This is not positive thinking — it is faith speaking what God has said into a specific situation. The ground is always God's Word and covenant, not the person's faith or feeling. Nehemiah quoted Deuteronomy 30 back to God. David declared God's character before anything changed (Psalm 3:3-4).

STRUCTURE:

**WHO I AM — Identity Declarations**
4-5 bold declarations of covenant identity. Begin with "I am…" or "I stand as…" — drawn from corpus principles about identity, calling, and covenant standing. These are not affirmations based on how the person feels. They are covenant realities regardless of feeling.

**WHAT GOD HAS SAID — Covenant Declarations**
5-6 declarations of what God has specifically spoken. Begin with "God has declared…" or "His word says…" — each one traceable to a specific corpus passage. Over the specific situation named.

**WHAT I DECLARE OVER THIS**
5-7 present-tense declarations spoken directly into the named situation. Begin with "I declare…" — naming the situation specifically and speaking the opposing covenant reality over it.

**WHAT I REFUSE**
3-4 refusals — naming what is being rejected. "I refuse to believe that…" "I will not accept as final…" — not aggressive, but settled. Naming the lie and displacing it with truth.

**THE STAND**
Close with quiet settled confidence — not aggressive spiritual performance but grounded covenant rest. 2-3 sentences.

Close: "This is my declaration. In Jesus' Name, Amen."

Total: 500-650 words. Weighty, specific, grounded in corpus principles throughout.

CORPUS PASSAGES:
${contextBlock}`,
    },

    warfare: {
      maxTokens: 1300,
      instructions: `
PRAYER MODE: WARFARE & ENFORCEMENT — Enforcing what Christ has already accomplished.

IMPORTANT THEOLOGICAL GROUNDING FOR THIS PRAYER:
- This is NOT asking God to win. Christ has already won (Colossians 2:15 — He "disarmed the rulers and authorities and put them to open shame, by triumphing over them in him").
- This IS enforcement of an accomplished victory from the position described in Ephesians 1:20-23 and 2:6 — seated with Christ, far above all rule and authority.
- The authority is delegated (Luke 10:19), not self-generated.
- The ground is Christ's blood, resurrection, and ascension — not the person's spiritual performance or volume.
- The posture is STANDING FIRM (Ephesians 6:13) — not striving, not performing, not multiplying words.
- Every claim must be traceable to corpus principles. Do NOT generate speculative demonology, name specific demons not named in Scripture, or create formulas.

WHAT IS BEING ADDRESSED: ${situation}

STRUCTURE:

**THE POSITION**
Establish the ground before engaging the opposition. Not "I am powerful" but "I am in Christ who is powerful." Draw from Ephesians 1:20-23, Colossians 2:15, Luke 10:19 — the person's position in the accomplished victory. 3-4 sentences.

**THE ARMOR — Taking the Stand**
Ephesians 6:14-18 — not as magic formula but as intentional posture. Name what is being put on and why: truth, righteousness, peace, faith, salvation, the Word. Each piece corresponds to a specific vulnerability that Christ's victory covers. 4-5 sentences. Draw from corpus principles.

**THE ENFORCEMENT**
From the position established, address the specific spiritual opposition named. Speak to it from the accomplished victory — not in aggression but in settled authority. "On the basis of Christ's victory at the cross and resurrection, I enforce…" 4-5 sentences. Stay grounded in what Christ has done, not in cataloguing enemy activity.

**THE STRONGHOLD ADDRESSED**
2 Corinthians 10:3-5 — "arguments and every lofty opinion raised against the knowledge of God." Most spiritual warfare is ultimately about what is believed. Address the specific false belief, fear, or pattern that has established itself. 3-4 sentences. Draw from corpus principles.

**THE DECLARATION OF ACCOMPLISHED REALITY**
State what Christ has already accomplished over this specific situation. Not what you hope will happen — what has already been done. Past tense. "Christ has…" "The victory is…" "It is finished in that…" 3-4 sentences.

**THE POSTURE OF REST**
Close not with triumphalism but with the rest that comes from standing in accomplished victory. Hebrews 4:10-11 — entering the rest of completed work. 2-3 sentences.

Close: "In Jesus' Name, Amen."

Total: 550-700 words. Grounded, settled, not performative. Authority without aggression.

IMPORTANT: Do NOT name specific demons beyond what Scripture names. Do NOT create binding formulas as automatic mechanisms. Ground every enforcement in specific corpus principles. Flag any leap with honest acknowledgment.

CORPUS PASSAGES:
${contextBlock}`,
    },
  }

  const fmt = formats[mode]
  return {
    prompt: base + fmt.instructions,
    maxTokens: fmt.maxTokens,
  }
}

interface PrayerResult {
  mode: PrayerMode
  situation: string
  prayer: string
  refs: string[]
  date: string
}

// ── Helper: get theme boost for corpus retrieval by mode ──
function getModeThemes(mode: PrayerMode): Set<string> {
  const themeMap: Record<PrayerMode, string[]> = {
    adoration:    ['worship', 'holiness', 'sovereignty', 'love'],
    confession:   ['repentance', 'grace', 'sin', 'covenant'],
    thanksgiving: ['faith', 'hope', 'covenant', 'love'],
    intercession: ['prayer', 'community', 'covenant', 'love'],
    lament:       ['suffering', 'prayer', 'hope', 'faith'],
    declaration:  ['faith', 'covenant', 'obedience', 'sovereignty'],
    warfare:      ['faith', 'obedience', 'covenant', 'sovereignty'],
  }
  return new Set(themeMap[mode] || [])
}

// ── Format prayer text for display ──────────────────────
function formatPrayer(text: string): string {
  if (!text) return ''

  const headingStyle = [
    'font-family:DM Sans,sans-serif',
    'font-size:9.5px',
    'font-weight:700',
    'letter-spacing:0.22em',
    'text-transform:uppercase',
    'color:var(--gold)',
    'margin:28px 0 10px',
    'padding-bottom:8px',
    'border-bottom:1px solid var(--rule)',
    'display:block',
  ].join(';')

  let t = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, `<strong style="${headingStyle}">$1</strong>`)
    .replace(/^#{1,3} (.+)$/gm, `<strong style="${headingStyle}">$1</strong>`)

  t = t.split(/\n\n+/).map(p => {
    const trimmed = p.trim()
    if (!trimmed) return ''

    // Declaration / enforcement lines
    if (/^(I declare|I am|I stand|I refuse|I will not|God has|By the|His word|I enforce|On the basis|Christ has|The victory|In Christ|I arrest|I command)/m.test(trimmed)) {
      return '<p style="margin-bottom:10px;padding-left:16px;border-left:3px solid var(--gold2);font-family:Source Serif 4,serif;font-size:16px;line-height:1.85;color:var(--ink);font-style:italic">' +
        trimmed.replace(/\n/g, '<br>') + '</p>'
    }

    // Lament / honest protest lines
    if (/^(How long|Where are you|Why have|I do not understand|I am angry|I cannot see|I have been pretending)/m.test(trimmed)) {
      return '<p style="margin-bottom:12px;font-family:Source Serif 4,serif;font-size:16.5px;line-height:1.9;color:var(--ink2);opacity:0.85">' +
        trimmed.replace(/\n/g, '<br>') + '</p>'
    }

    return '<p style="margin-bottom:14px;font-family:Source Serif 4,serif;font-size:16.5px;line-height:1.88;color:var(--ink2)">' +
      trimmed.replace(/\n/g, '<br>') + '</p>'
  }).join('')

  return t
}

// ── Main component ───────────────────────────────────────
export default function PrayerPage() {
  const { user, profile } = useAuth()
  const [corpus,    setCorpus]    = useState<CorpusChapter[]>([])
  const [mode,      setMode]      = useState<PrayerMode>('adoration')
  const [situation, setSituation] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState<PrayerResult | null>(null)
  const [copied,    setCopied]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/corpus.json').then(r => r.json()).then(setCorpus).catch(console.error)
  }, [])

  const currentMode = MODES.find(m => m.id === mode)!

  const handleModeChange = (newMode: PrayerMode) => {
    setMode(newMode)
    setResult(null)
    setSaved(false)
    setSituation('')
  }

  const generatePrayer = useCallback(async () => {
    if (!situation.trim() || loading || corpus.length === 0) return

    setLoading(true)
    setResult(null)
    setSaved(false)

    const modeThemes = getModeThemes(mode)
    const chapters = retrieve(corpus, situation + ' ' + currentMode.queryBoost, {
      k: 4,
      selectedThemes: modeThemes,
    })

    const contextBlock = buildContextBlock(chapters)
    const name = profile?.name || 'the reader'
    const occ  = profile?.occupation || 'daily life'
    const { prompt, maxTokens } = buildPrayerPrompt(mode, situation, name, occ, contextBlock)

    try {
      const response = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-5',
          max_tokens: maxTokens,
          system:     prompt,
          messages:   [{ role: 'user', content: `Generate the ${mode} prayer for: ${situation}` }],
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to generate prayer')

      const prayerText = data.content?.[0]?.text || ''
      const refs = chapters.map(c => c.reference || c.ref || '').filter(Boolean)

      setResult({
        mode, situation: situation.trim(), prayer: prayerText,
        refs,
        date: new Date().toLocaleDateString('en-GB', {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        }),
      })
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'Failed to generate prayer')
    } finally {
      setLoading(false)
    }
  }, [situation, mode, corpus, profile, loading, currentMode])

  const savePrayer = useCallback(() => {
    if (!result || !user) return
    const k = keys(user.id)
    const journal = loadLocal<JournalEntry[]>(k.journal, [])
    const modeLabel = MODES.find(m => m.id === result.mode)?.label || result.mode
    const entry: JournalEntry = {
      id:         Date.now(),
      devotionId: 0,
      date:       new Date().toISOString(),
      dateLabel:  result.date,
      text:       `${modeLabel.toUpperCase()} — ${result.situation}\n\n${result.prayer}`,
      refs:       result.refs.join(', '),
    }
    const updated = [entry, ...journal]
    saveLocal(k.journal, updated)
    pushToCloud(user.id, 'journal', updated)
    setSaved(true)
    toast.success('Prayer saved to journal')
  }, [result, user])

  const copyPrayer = useCallback(async () => {
    if (!result) return
    const plain = result.prayer.replace(/\*\*(.*?)\*\*/g, '$1')
    await navigator.clipboard.writeText(plain).catch(() => {})
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  const sharePrayer = useCallback(async () => {
    if (!result) return
    const plain = result.prayer.replace(/\*\*(.*?)\*\*/g, '$1')
    const modeLabel = MODES.find(m => m.id === result.mode)?.label || ''
    const text = `${modeLabel} — ${result.date}\n\n${plain}\n\n— Berean Biblical Principles`
    if (navigator.share) {
      await navigator.share({ title: `Berean ${modeLabel}`, text }).catch(() => {})
    } else {
      window.open('https://wa.me/?text=' + encodeURIComponent(text.substring(0, 4000)), '_blank')
    }
  }, [result])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

      {/* Page header */}
      <div style={{
        padding: '20px 32px 0',
        background: 'var(--paper)',
        borderBottom: '1px solid var(--rule)',
        flexShrink: 0,
      }}>
        <div style={{ marginBottom: '14px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px',
            fontWeight: 500, color: 'var(--ink)', marginBottom: '4px' }}>
            Prayer Workshop
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--ink4)' }}>
            Seven modes of prayer — each one grounded in your corpus
          </p>
        </div>

        {/* Mode tabs — scrollable on mobile */}
        <div style={{ display: 'flex', overflowX: 'auto', gap: '0',
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => handleModeChange(m.id)} style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: mode === m.id ? `2px solid ${m.color}` : '2px solid transparent',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: mode === m.id ? 600 : 400,
              color: mode === m.id ? m.color : 'var(--ink4)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: '6px',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '13px' }}>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '28px 32px', maxWidth: '760px', width: '100%', margin: '0 auto' }}>

        {/* Mode description card */}
        <div style={{
          marginBottom: '28px', padding: '18px 22px',
          background: 'var(--paper2)',
          borderLeft: `3px solid ${currentMode.color}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
            <span style={{ fontSize: '16px' }}>{currentMode.icon}</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase', color: currentMode.color }}>
              {currentMode.label}
            </span>
          </div>
          <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '15px',
            fontStyle: 'italic', color: 'var(--ink3)', lineHeight: 1.7, margin: '0 0 8px' }}>
            {currentMode.tagline}
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            color: 'var(--ink4)', lineHeight: 1.7, margin: 0 }}>
            {currentMode.description}
          </p>
        </div>

        {/* Input area */}
        {!result && (
          <div>
            <label style={{ display: 'block', fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: '10px' }}>
              {currentMode.promptLabel}
            </label>

            <textarea
              ref={textareaRef}
              value={situation}
              onChange={e => setSituation(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) generatePrayer() }}
              placeholder={currentMode.placeholder}
              rows={4}
              style={{
                width: '100%', padding: '16px 18px', boxSizing: 'border-box',
                background: 'white', border: '1.5px solid var(--rule)',
                color: 'var(--ink)', fontFamily: "'Source Serif 4', serif",
                fontSize: '16px', lineHeight: 1.7, outline: 'none',
                resize: 'vertical', boxShadow: 'var(--s1)',
                transition: 'border-color 0.2s', marginBottom: '20px',
              }}
              onFocus={e => e.target.style.borderColor = currentMode.color}
              onBlur={e  => e.target.style.borderColor = 'var(--rule)'}
            />

            {/* Examples */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600,
                letterSpacing: '0.16em', textTransform: 'uppercase',
                color: 'var(--ink5)', marginBottom: '10px' }}>
                Examples
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {currentMode.examples.map(ex => (
                  <button key={ex} onClick={() => setSituation(ex)} style={{
                    padding: '7px 14px', background: 'white',
                    border: '1px solid var(--rule)', color: 'var(--ink4)',
                    cursor: 'pointer', fontFamily: "'Source Serif 4', serif",
                    fontSize: '13px', transition: 'all 0.15s', boxShadow: 'var(--s1)',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = currentMode.color
                    e.currentTarget.style.color = currentMode.color
                    e.currentTarget.style.background = 'var(--gold-bg)'
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = 'var(--rule)'
                    e.currentTarget.style.color = 'var(--ink4)'
                    e.currentTarget.style.background = 'white'
                  }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={generatePrayer}
              disabled={loading || !situation.trim() || corpus.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '14px 32px',
                background: situation.trim() && !loading ? currentMode.color : 'var(--paper2)',
                border: `1.5px solid ${situation.trim() && !loading ? currentMode.color : 'var(--rule)'}`,
                color: situation.trim() && !loading ? 'white' : 'var(--ink4)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                cursor: situation.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: situation.trim() && !loading ? 'var(--s2)' : 'none',
              }}
              onMouseOver={e => { if (situation.trim() && !loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseOut={e  => { e.currentTarget.style.transform = 'none' }}
            >
              {loading ? (
                <>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%',
                        background: situation.trim() ? 'white' : 'var(--ink4)', display: 'block',
                        animation: `thinking 1.2s ease-in-out ${i*0.2}s infinite` }}/>
                    ))}
                  </div>
                  Drawing from Scripture…
                </>
              ) : (
                <>
                  <span style={{ fontSize: '16px' }}>{currentMode.icon}</span>
                  Generate {currentMode.label}
                </>
              )}
            </button>
          </div>
        )}

        {/* Prayer result */}
        {result && (
          <div className="fade-in">
            {/* Result header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', gap: '16px',
              marginBottom: '24px', paddingBottom: '20px',
              borderBottom: '1px solid var(--rule)', flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                  fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: currentMode.color, marginBottom: '4px' }}>
                  {currentMode.icon} {currentMode.label} · {result.date}
                </div>
                <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '16px',
                  color: 'var(--ink3)', fontStyle: 'italic' }}>
                  {result.situation}
                </p>
                {result.refs.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {result.refs.map(r => (
                      <span key={r} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px',
                        fontWeight: 500, padding: '2px 10px', borderRadius: '100px',
                        background: 'var(--paper2)', border: '1px solid var(--rule2)',
                        color: 'var(--gold2)' }}>{r}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => { setResult(null); setSaved(false); setSituation('') }}
                style={{ padding: '8px 16px', background: 'transparent',
                  border: '1px solid var(--rule)', color: 'var(--ink4)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
                onMouseOver={e => { e.currentTarget.style.borderColor='var(--gold2)'; e.currentTarget.style.color='var(--gold)' }}
                onMouseOut={e  => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--ink4)' }}>
                ← New Prayer
              </button>
            </div>

            {/* Prayer text */}
            <div style={{
              padding: '32px 36px', background: 'white',
              border: '1px solid var(--rule)',
              borderTop: `3px solid ${currentMode.color}`,
              boxShadow: 'var(--s2)', marginBottom: '24px',
            }}>
              <div dangerouslySetInnerHTML={{ __html: formatPrayer(result.prayer) }} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {!saved ? (
                <button onClick={savePrayer} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px',
                  background: 'var(--gold)', color: 'white', border: 'none',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', boxShadow: 'var(--s2)', transition: 'all 0.15s' }}
                  onMouseOver={e => { e.currentTarget.style.background='var(--gold2)'; e.currentTarget.style.transform='translateY(-1px)' }}
                  onMouseOut={e  => { e.currentTarget.style.background='var(--gold)'; e.currentTarget.style.transform='none' }}>
                  <BookMarked size={13} /> Save to Journal
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px',
                  background: 'var(--paper2)', border: '1px solid var(--rule)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--ink4)' }}>
                  <BookMarked size={13} style={{ color: 'var(--gold2)' }} /> Saved to journal
                </div>
              )}

              <button onClick={copyPrayer} style={{
                display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px',
                background: 'transparent', border: '1px solid var(--rule)', color: 'var(--ink4)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor='var(--gold2)'; e.currentTarget.style.color='var(--gold)' }}
                onMouseOut={e  => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--ink4)' }}>
                {copied ? <Check size={12}/> : <Copy size={12}/>}
                {copied ? 'Copied' : 'Copy'}
              </button>

              <button onClick={sharePrayer} style={{
                display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px',
                background: 'transparent', border: '1px solid var(--rule)', color: 'var(--ink4)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor='var(--gold2)'; e.currentTarget.style.color='var(--gold)' }}
                onMouseOut={e  => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--ink4)' }}>
                <Share2 size={12}/> Share
              </button>

              <button onClick={generatePrayer} style={{
                display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px',
                background: 'transparent',
                border: `1px solid ${currentMode.color}40`,
                color: currentMode.color,
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s', marginLeft: 'auto' }}
                onMouseOver={e => e.currentTarget.style.background='var(--gold-bg)'}
                onMouseOut={e  => e.currentTarget.style.background='transparent'}>
                ↺ Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
