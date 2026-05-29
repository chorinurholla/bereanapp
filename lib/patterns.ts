// ═══════════════════════════════════════════════════════
// BEREAN — KINGDOM PATTERNS
// 15 recurring narrative structures in Scripture
// Each pattern maps to how God works in human life
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
    keywords:           ["wilderness","desert","wander","prepare","test","strip","exile","barren","40","fasting"],
    anchors:            ["Exodus","Numbers","Deuteronomy","Matthew","1 & 2 Kings"],
    color:              "#8a6d35",
    icon:               "○"
  },
  "The Pit": {
    name:               "The Pit",
    description:        "The lowest point that becomes the turning point. Burial before resurrection.",
    formation_question: "What has died in you that God may be preparing to resurrect?",
    carrying_question:  "Where is God present in what feels like abandonment today?",
    keywords:           ["pit","prison","dungeon","depths","lowest","forsaken","dark","lament","cry out","despair"],
    anchors:            ["Genesis","Psalms","Jeremiah","Job","Lamentations"],
    color:              "#5a4535",
    icon:               "▽"
  },
  "The Long Obedience": {
    name:               "The Long Obedience",
    description:        "Faithfulness without visible fruit. Faith operating on delay.",
    formation_question: "What are you trusting God for that requires you to keep moving without seeing the outcome?",
    carrying_question:  "Where did faithfulness cost you something today without a visible return?",
    keywords:           ["wait","patient","faith","promise","long","years","persevere","endure","trust","generation"],
    anchors:            ["Genesis","Ruth","Hebrews","Psalms","Isaiah"],
    color:              "#5a6a4a",
    icon:               "→"
  },
  "The Hidden Years": {
    name:               "The Hidden Years",
    description:        "Preparation in obscurity. The years that seem wasted but are formative.",
    formation_question: "What is being formed in you in this hidden season that could not be formed in public?",
    carrying_question:  "What did today demand of you that no one else will see?",
    keywords:           ["hidden","obscure","shepherd","slave","servant","unknown","forgotten","quiet","silent","background"],
    anchors:            ["Genesis","Exodus","Samuel","Luke","Acts"],
    color:              "#4a4a6a",
    icon:               "◦"
  },
  "The Commissioning": {
    name:               "The Commissioning",
    description:        "Called despite inadequacy. The moment of specific assignment.",
    formation_question: "What assignment are you resisting because you feel unqualified for it?",
    carrying_question:  "Where did today call you to act beyond your felt capacity?",
    keywords:           ["call","send","commission","appoint","go","assigned","chosen","set apart","anointed","ordained"],
    anchors:            ["Exodus","Isaiah","Jeremiah","John","Acts"],
    color:              "#7a5a3a",
    icon:               "↑"
  },
  "The Covenant Test": {
    name:               "The Covenant Test",
    description:        "The moment that reveals what is actually trusted.",
    formation_question: "What would you hold back from God if He asked for it today?",
    carrying_question:  "What did today reveal about what you are ultimately trusting?",
    keywords:           ["test","prove","trust","sacrifice","surrender","covenant","fear God","hold back","obey","devotion"],
    anchors:            ["Genesis","Job","Daniel","Matthew","Hebrews"],
    color:              "#6a3a3a",
    icon:               "◇"
  },
  "The Pruning": {
    name:               "The Pruning",
    description:        "Reduction that produces fruit. Loss that serves formation.",
    formation_question: "What reduction in your life is God using to concentrate your fruitfulness?",
    carrying_question:  "What was removed from you today that you are still grieving?",
    keywords:           ["prune","cut","reduce","loss","discipline","thorn","weakness","remove","less","decrease"],
    anchors:            ["John","1 & 2 Corinthians","Job","Hebrews","Philippians"],
    color:              "#5a4a3a",
    icon:               "✦"
  },
  "The Remnant": {
    name:               "The Remnant",
    description:        "Faithfulness in isolation. When it seems you are the only one left.",
    formation_question: "Where are you assuming you are alone in your faithfulness?",
    carrying_question:  "What would it mean to be faithful today even if no one else is?",
    keywords:           ["remnant","alone","seven thousand","few","faithful","minority","preserve","survive","small","holy"],
    anchors:            ["1 & 2 Kings","Isaiah","Romans","Revelation","Amos"],
    color:              "#4a5a4a",
    icon:               "⊙"
  },
  "The Confrontation": {
    name:               "The Confrontation",
    description:        "Truth spoken to power. The moment of costly witness.",
    formation_question: "What truth are you withholding because the cost feels too high?",
    carrying_question:  "Where did today require you to say something true that was unwelcome?",
    keywords:           ["confront","rebuke","prophet","speak truth","bold","courage","witness","stand","oppose","declare"],
    anchors:            ["Samuel","Kings","Amos","Matthew","Acts","Jeremiah"],
    color:              "#6a5a3a",
    icon:               "‼"
  },
  "The Table Turned": {
    name:               "The Table Turned",
    description:        "What was meant for harm becoming the instrument of redemption.",
    formation_question: "Where are you still interpreting a past wound as only damage rather than potential redemption?",
    carrying_question:  "What reversal is God working in something you have written off as only loss?",
    keywords:           ["meant for evil","reversal","redeem","restore","turned","all things","purpose","plan","from death"],
    anchors:            ["Genesis","Esther","Acts","Romans","Ruth"],
    color:              "#4a6a5a",
    icon:               "↺"
  },
  "The Return": {
    name:               "The Return",
    description:        "Restoration after unfaithfulness. The father running.",
    formation_question: "Where have you been keeping God at a distance because you do not believe you are welcomed back?",
    carrying_question:  "What would it mean to receive grace today without earning it?",
    keywords:           ["return","restore","repent","come back","forgive","unfaithful","wayward","turn back","lost","found"],
    anchors:            ["Hosea","Luke","Jeremiah","Revelation","Isaiah"],
    color:              "#6a3a5a",
    icon:               "←"
  },
  "The Multiplication": {
    name:               "The Multiplication",
    description:        "Sufficiency from apparent scarcity. Provision that exceeds calculation.",
    formation_question: "Where are you calculating with human arithmetic what God intends to multiply?",
    carrying_question:  "What did you offer today that seemed insufficient for what was needed?",
    keywords:           ["multiply","provision","loaves","fish","abundance","overflow","more than enough","supply","provide","fill"],
    anchors:            ["Genesis","Exodus","Kings","John","Matthew"],
    color:              "#3a5a6a",
    icon:               "×"
  },
  "The Threshold": {
    name:               "The Threshold",
    description:        "The moment before the new thing. Called to cross over.",
    formation_question: "What crossing is God asking you to make that you have been postponing?",
    carrying_question:  "What held you back from the threshold today — fear, comfort, or unbelief?",
    keywords:           ["cross over","enter","new","threshold","door","transition","move","step","forward","Jordan"],
    anchors:            ["Joshua","Isaiah","Acts","Revelation","Matthew"],
    color:              "#6a4a5a",
    icon:               "▷"
  },
  "The Night Season": {
    name:               "The Night Season",
    description:        "When God seems absent and the struggle is real. Wrestling that produces blessing.",
    formation_question: "What would it mean to keep wrestling with God instead of walking away from Him?",
    carrying_question:  "Where did you encounter the silence of God today — and what did you do with it?",
    keywords:           ["night","dark","struggle","wrestle","absent","silence","why","weeping","Gethsemane","alone"],
    anchors:            ["Genesis","Psalms","Job","Matthew","Lamentations"],
    color:              "#3a3a5a",
    icon:               "☽"
  },
  "The Mantle": {
    name:               "The Mantle",
    description:        "Calling received, passed on, or resisted. Formation for purpose.",
    formation_question: "What calling are you carrying that you have not yet fully stepped into?",
    carrying_question:  "What did today reveal about what you are being prepared to carry?",
    keywords:           ["mantle","anoint","calling","purpose","inherit","spirit","double portion","pass on","successor","gift"],
    anchors:            ["Kings","Samuel","Acts","Titus/Philemon/Hebrews/James","Ephesians"],
    color:              "#5a4a6a",
    icon:               "◈"
  }
}

// ── Detect the most relevant pattern for a corpus chapter ──
export function detectPattern(chunk: {
  book?: string
  title?: string
  chapter_title?: string
  content?: string
  observation?: string
  godShot?: string
  god_shot?: string
  themes?: string[]
  principles?: (string | { title: string; application?: string })[]
}): { pattern: KingdomPattern | null; score: number } {
  const text = [
    chunk.title || chunk.chapter_title || '',
    chunk.content || chunk.observation || '',
    chunk.godShot || chunk.god_shot || '',
    (chunk.themes || []).join(' '),
    (chunk.principles || []).map(p =>
      typeof p === 'string' ? p : p.title + ' ' + (p.application || '')
    ).join(' ')
  ].join(' ').toLowerCase()

  const book = (chunk.book || '').toLowerCase()

  let best: KingdomPattern | null = null
  let bestScore = 0

  for (const pattern of Object.values(KINGDOM_PATTERNS)) {
    let score = 0
    for (const kw of pattern.keywords) {
      if (text.includes(kw.toLowerCase())) score += 2
    }
    for (const anchor of pattern.anchors) {
      if (book.includes(anchor.toLowerCase().split(' ')[0]) ||
          anchor.toLowerCase().includes(book.split(' ')[0])) {
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
