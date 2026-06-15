// ═══════════════════════════════════════════════════════
// BEREAN — KINGDOM PATTERNS
// 15 recurring narrative structures in Scripture
// Keywords refined against the gold-standard corpus
// ═══════════════════════════════════════════════════════

export interface KingdomPattern {
  name:               string
  description:        string
  formation_question: string
  carrying_question:  string
  keywords:           string[]
  anchors:            string[]
  color:              string
  icon:               string
}

export const KINGDOM_PATTERNS: Record<string, KingdomPattern> = {
  "The Wilderness": {
    name:               "The Wilderness",
    description:        "Stripping before equipping. The preparation season that feels like abandonment.",
    formation_question: "What is God removing from you in this season that you are still clinging to?",
    carrying_question:  "Where did today's principle ask you to release something you were holding?",
    keywords:           ["wilderness","desert","wandering","forty years","barren","stripped","fasting","exile","manna","no water"],
    anchors:            ["Exodus","Numbers","Deuteronomy","Matthew","Hosea"],
    color:              "#8a6d35",
    icon:               "○"
  },
  "The Pit": {
    name:               "The Pit",
    description:        "The lowest point that becomes the turning point. Burial before resurrection.",
    formation_question: "What has died in you that God may be preparing to resurrect?",
    carrying_question:  "Where is God present in what feels like abandonment today?",
    keywords:           ["pit","cistern","dungeon","depths","forsaken","anguish","cast down","lament","Sheol","abandoned"],
    anchors:            ["Genesis","Psalms","Jeremiah","Lamentations","Job"],
    color:              "#5a4535",
    icon:               "▽"
  },
  "The Long Obedience": {
    name:               "The Long Obedience",
    description:        "Faithfulness without visible fruit. Faith operating on delay.",
    formation_question: "What are you trusting God for that requires you to keep moving without seeing the outcome?",
    carrying_question:  "Where did faithfulness cost you something today without a visible return?",
    keywords:           ["long obedience","patient endurance","years of waiting","faithfulness without","not yet visible","waited","persevered","remained faithful","keep going","delayed promise"],
    anchors:            ["Genesis","Ruth","Hebrews","Psalms","Habakkuk"],
    color:              "#5a6a4a",
    icon:               "→"
  },
  "The Hidden Years": {
    name:               "The Hidden Years",
    description:        "Preparation in obscurity. The years that seem wasted but are formative.",
    formation_question: "What is being formed in you in this hidden season that could not be formed in public?",
    carrying_question:  "What did today demand of you that no one else will see?",
    keywords:           ["obscurity","hidden","background","unknown","overlooked","before his time","in the field","tending","private","unnoticed"],
    anchors:            ["Genesis","Exodus","1 Samuel","Luke","Galatians"],
    color:              "#4a4a6a",
    icon:               "◦"
  },
  "The Commissioning": {
    name:               "The Commissioning",
    description:        "Called despite inadequacy. The moment of specific assignment.",
    formation_question: "What assignment are you resisting because you feel unqualified for it?",
    carrying_question:  "Where did today call you to act beyond your felt capacity?",
    keywords:           ['calling precedes','inadequacy is not disqualification','called to','god equips after','commission','vocation','sent','appointed','who am i','called by name'],
    anchors:            ["Exodus","Isaiah","Jeremiah","John","Acts"],
    color:              "#7a5a3a",
    icon:               "↑"
  },
  "The Covenant Test": {
    name:               "The Covenant Test",
    description:        "The moment that reveals what is actually trusted.",
    formation_question: "What would you hold back from God if He asked for it today?",
    carrying_question:  "What did today reveal about what you are ultimately trusting?",
    keywords:           ['integrity is proven','what you trust','surrender','sacrifice','covenant faithfulness','tested','obedience reveals','faithful when','fear of the lord','prove your'],
    anchors:            ["Genesis","Job","Daniel","Matthew","Hebrews"],
    color:              "#6a3a3a",
    icon:               "◇"
  },
  "The Pruning": {
    name:               "The Pruning",
    description:        "Reduction that produces fruit. Loss that serves formation.",
    formation_question: "What reduction in your life is God using to concentrate your fruitfulness?",
    carrying_question:  "What was removed from you today that you are still grieving?",
    keywords:           ["thorn in the flesh","my grace is sufficient","weakness is not disqualification","discipline produces","loss serves","reduction","pruning","stripped","what was taken","fruitfulness through"],
    anchors:            ["John","2 Corinthians","Job","Hebrews","Philippians"],
    color:              "#5a4a3a",
    icon:               "✦"
  },
  "The Remnant": {
    name:               "The Remnant",
    description:        "Faithfulness in isolation. When it seems you are the only one left.",
    formation_question: "Where are you assuming you are alone in your faithfulness?",
    carrying_question:  "What would it mean to be faithful today even if no one else is?",
    keywords:           ['seven thousand','faithful few','remnant','alone in faithfulness','isolated faithfulness','minority faithful','preserved through','small remnant','survive','few who remain'],
    anchors:            ["1 Kings","2 Kings","Isaiah","Romans","Amos"],
    color:              "#4a5a4a",
    icon:               "⊙"
  },
  "The Confrontation": {
    name:               "The Confrontation",
    description:        "Truth spoken to power. The moment of costly witness.",
    formation_question: "What truth are you withholding because the cost feels too high?",
    carrying_question:  "Where did today require you to say something true that was unwelcome?",
    keywords:           ['you are the man','thus says the lord','prophetic courage','bold proclamation','costly witness','speak truth','rebuke','stood before power','woe to','prophetic responsibility'],
    anchors:            ["2 Samuel","Jeremiah","Amos","Matthew","Acts"],
    color:              "#6a5a3a",
    icon:               "‼"
  },
  "The Table Turned": {
    name:               "The Table Turned",
    description:        "What was meant for harm becoming the instrument of redemption.",
    formation_question: "Where are you still interpreting a past wound as only damage rather than potential redemption?",
    carrying_question:  "What reversal is God working in something you have written off as only loss?",
    keywords:           ["you intended to harm","God intended it for good","reversal","what seemed like defeat","turned around","the very thing","used against them","trap became","enemies' plan failed","unlikely instrument"],
    anchors:            ["Genesis","Esther","Romans","Acts","Ruth"],
    color:              "#4a6a5a",
    icon:               "↺"
  },
  "The Return": {
    name:               "The Return",
    description:        "Restoration after unfaithfulness. The father running.",
    formation_question: "Where have you been keeping God at a distance because you do not believe you are welcomed back?",
    carrying_question:  "What would it mean to receive grace today without earning it?",
    keywords:           ["return to me","when he came to himself","first love","I will arise","still a long way off","ran to meet","turn back","restore us","after all this","prodigal"],
    anchors:            ["Hosea","Luke","Jeremiah","Ezekiel","Revelation"],
    color:              "#6a3a5a",
    icon:               "←"
  },
  "The Multiplication": {
    name:               "The Multiplication",
    description:        "Sufficiency from apparent scarcity. Provision that exceeds calculation.",
    formation_question: "Where are you calculating with human arithmetic what God intends to multiply?",
    carrying_question:  "What did you offer today that seemed insufficient for what was needed?",
    keywords:           ["five loaves","what do you have","never ran out","oil did not stop","fed the multitude","jar of flour","asking big reveals faith","provision exceeded","more than enough","exceeds calculation"],
    anchors:            ["Exodus","1 Kings","2 Kings","John","Matthew"],
    color:              "#3a5a6a",
    icon:               "×"
  },
  "The Threshold": {
    name:               "The Threshold",
    description:        "The moment before the new thing. Called to cross over.",
    formation_question: "What crossing is God asking you to make that you have been postponing?",
    carrying_question:  "What held you back from the threshold today — fear, comfort, or unbelief?",
    keywords:           ["cross over the Jordan","be strong and courageous","do not be afraid","for such a time as this","now is the time","step into","new season","cross over","God has gone before","called to enter"],
    anchors:            ["Joshua","Esther","Isaiah","Acts","Revelation"],
    color:              "#6a4a5a",
    icon:               "▷"
  },
  "The Night Season": {
    name:               "The Night Season",
    description:        "When God seems absent and the struggle is real. Wrestling that produces blessing.",
    formation_question: "What would it mean to keep wrestling with God instead of walking away from Him?",
    carrying_question:  "Where did you encounter the silence of God today — and what did you do with it?",
    keywords:           ['wrestled until daybreak','weeping may last','why have you forsaken','silence of god','darkness before','night of','why do you hide','absence of god','where are you god','crying out unanswered'],
    anchors:            ["Genesis","Psalms","Job","Matthew","Lamentations"],
    color:              "#3a3a5a",
    icon:               "☽"
  },
  "The Mantle": {
    name:               "The Mantle",
    description:        "Calling received, passed on, or resisted. Formation for purpose.",
    formation_question: "What calling are you carrying that you have not yet fully stepped into?",
    carrying_question:  "What did today reveal about what you are being prepared to carry?",
    keywords:           ['persistence in following qualifies','double portion','raised up','successor','inheritance','legacy','prepared for this','pass on','asking big reveals','mantle'],
    anchors:            ["1 Kings","2 Kings","Acts","Ephesians","2 Timothy"],
    color:              "#5a4a6a",
    icon:               "◈"
  }
}

// ── Detect the most relevant pattern for a corpus chapter ──
export function detectPattern(chunk: {
  book?: string
  title?: string
  chapter_title?: string
  framing?: string
  observation?: string
  content?: string
  god_shot?: string
  godShot?: string
  themes?: string[]
  principles?: (string | { title: string; application?: string; principle?: string })[]
}): { pattern: KingdomPattern | null; score: number } {
  const principleText = (chunk.principles || []).map(p =>
    typeof p === 'string' ? p :
    (p.title || '') + ' ' + (p.application || '') + ' ' + (p.principle || '')
  ).join(' ').toLowerCase()

  const text = [
    chunk.chapter_title || chunk.title || '',
    chunk.framing || chunk.observation || chunk.content || '',
    chunk.god_shot || chunk.godShot || '',
    (chunk.themes || []).join(' '),
    principleText,
  ].join(' ').toLowerCase()

  const book = (chunk.book || '').toLowerCase()

  let best: KingdomPattern | null = null
  let bestScore = 0

  for (const pattern of Object.values(KINGDOM_PATTERNS)) {
    let score = 0
    // Keyword matching — phrases score higher than single words
    for (const kw of pattern.keywords) {
      if (text.includes(kw.toLowerCase())) {
        score += kw.includes(' ') ? 4 : 2  // phrase match scores higher
      }
    }
    // Book anchor bonus
    for (const anchor of pattern.anchors) {
      const anchorLower = anchor.toLowerCase()
      const bookFirst   = anchorLower.split(' ')[0]
      if (book === anchorLower || book.includes(bookFirst) || anchorLower.includes(book)) {
        score += 3
      }
    }
    if (score > bestScore) {
      bestScore = score
      best = pattern
    }
  }

  return { pattern: best, score: bestScore }
}
