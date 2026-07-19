// ── Berean prayer domain ────────────────────────────────
// Extracted from the prayer page so the Night Watch sequencer can invoke the
// real mode prompts rather than duplicating or summarising them. A watch
// movement IS an ordinary prayer mode — same prompt, same retrieval profile —
// which is what keeps the seven modes' quality inside the watch.

import { retrieve } from '@/lib/corpus'
import type { CorpusChapter } from '@/lib/corpus'

// ── 8 Prayer Modes ──────────────────────────────────────
export type PrayerMode =
  | 'adoration'
  | 'confession'
  | 'thanksgiving'
  | 'intercession'
  | 'lament'
  | 'declaration'
  | 'warfare'
  | 'nightwatch'

// ── Night Watch postures ────────────────────────────────
// The watch is not a content type like the other seven — it is a time-bound
// practice. Posture is not a UI toggle: it threads through retrieval (anchors +
// queryBoost), theme filtering, and the system prompt.
export type NightPosture = 'communion' | 'contending'

export const POSTURES = [
  {
    id:      'communion' as const,
    label:   'Communion',
    icon:    '☾',
    tagline: 'Stillness in the night watch — Psalm 134, 1 Samuel 3',
    blurb:   'The servants who stand by night (Psalm 134). Samuel hearing his name in the dark (1 Samuel 3). This posture is unhurried and non-instrumental — you are not contending for anything. You are awake with God while the world sleeps.',
  },
  {
    id:      'contending' as const,
    label:   'Contending',
    icon:    '✦',
    tagline: 'Wrestling until daybreak — Genesis 32, Acts 12, Acts 16',
    blurb:   'Jacob wrestling until the breaking of the day (Genesis 32). The church praying through the night while Peter sat in chains (Acts 12). Paul and Silas singing at midnight (Acts 16). This posture contends — but from the accomplished victory, not toward an uncertain one.',
  },
]

// ── Curated night-watch anchors ─────────────────────────
// Keyword retrieval alone cannot reach these: the corpus has no "night watch"
// vocabulary (travail=0, contending=2, meditation=5, stillness=8 chapters).
// Genesis 32 and Matthew 26 — the two central night texts — never surface by
// query at all. So we always seed 2 anchors and let retrieve() fill the rest
// from the user's actual situation. IDs verified against public/corpus.json.
export const NIGHTWATCH_ANCHORS: Record<NightPosture, string[]> = {
  communion: [
    'Psalms_PSALM_134',        // Servants Who Stand by Night — the night-watch psalm
    '1_Samuel_1_SAMUEL_3',     // The Voice in the Night
    'Psalms_PSALM_63',         // Thirst for God
    'Psalms_PSALM_4',          // Evening Trust
    'Job_JOB_35',              // Songs in the Night
    'Psalms_PSALM_88',         // The Darkest Psalm
  ],
  contending: [
    'Genesis_GENESIS_32',      // Wrestling until daybreak
    'Acts_ACTS_12',            // Peter freed at night while the church prayed
    'Acts_ACTS_16',            // Paul and Silas at midnight
    'Luke_LUKE_18',            // Persistent prayer — the importunate widow
    'Matthew_MATTHEW_26',      // Gethsemane — "could you not watch one hour"
    '2_Kings_2_KINGS_19',      // Hezekiah's night deliverance
  ],
}

// Query boosts tuned to vocabulary that actually scores in this corpus.
// Dead words deliberately avoided: travail, contending, meditation, stillness,
// midnight, communion — they retrieve nothing and dilute the token budget.
const NIGHTWATCH_BOOST: Record<NightPosture, string> = {
  communion:  'night seeking presence waiting trust darkness sleep dawn morning',
  contending: 'night deliverance rescue prayer persistent cry breakthrough darkness enemy',
}

const NIGHTWATCH_THEMES: Record<NightPosture, string[]> = {
  communion:  ['prayer', 'worship'],
  contending: ['prayer', 'faith'],
}

export const MODES = [
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
  {
    id:          'nightwatch' as const,
    label:       'Night Watch',
    icon:        '☾',
    color:       '#2a3550',
    tagline:     'Prayer in the night watch — communion or contending',
    description: 'The night watch is not a kind of prayer but a time of prayer — the hours when the world is quiet and God is not. Scripture keeps returning to it: the servants who stand by night (Psalm 134), Samuel hearing his name in the dark (1 Samuel 3), Jacob wrestling until daybreak (Genesis 32), the church praying through the night while Peter sat in chains (Acts 12), Paul and Silas singing at midnight (Acts 16). Choose your posture below — the watch holds both stillness and struggle.',
    promptLabel: 'What are you bringing into the watch?',
    placeholder: 'What has kept you awake, or what have you risen to seek? Name it plainly — what you are carrying, contending for, or simply want to be still with before God in these hours.',
    examples: [
      'I woke at 3am and could not get back to sleep — I want to use the hours',
      'A burden for my family that only surfaces when the house is quiet',
      'Something I have been contending for that has not broken yet',
      'I want to be still with God without asking Him for anything',
      'A decision I need clarity on before the morning',
      'Grief that is loudest at night',
    ],
    queryBoost: 'night watch prayer darkness dawn seeking',
  },
]

// ── System prompts for all 7 modes ──────────────────────
export function buildPrayerPrompt(
  mode: PrayerMode,
  situation: string,
  name: string,
  occ: string,
  contextBlock: string,
  posture: NightPosture = 'communion'   // only read by nightwatch
): { prompt: string; maxTokens: number } {

  // ── Shared contract — governs every mode ──
  // Applied to all eight prayer modes. The corpus block is built in rich mode,
  // so verse-level citations and the `principle` field are available; this
  // contract is what makes the model actually use them instead of paraphrasing
  // the application prose into reflection.
  const base = `You are Berean, generating a deeply biblical prayer for ${name} (${occ}).

═══════════════════════════════════════════════
WORD-ANCHORED PRAYER — NON-NEGOTIABLE
═══════════════════════════════════════════════

This output is a PRAYER, spoken to God. It is not a reflection, a meditation, a devotional, or an essay about prayer.

1. ADDRESS GOD DIRECTLY.
Every section is spoken to God in the second person — "You", "Your", "Lord", "Father". Never write about God in the third person ("God is faithful"); pray it to Him ("You are faithful"). Never narrate the person in the third person. If a sentence would sit comfortably in an article about prayer, it is wrong — rewrite it as address.

2. PRAY THE WORD BACK TO GOD.
Every movement or section must anchor on Scripture drawn from the CORPUS PASSAGES below. Quote the scriptural language directly, in quotation marks, and give its citation in parentheses using the [Book Chapter:Verse] reference supplied with each principle. Weave the quotation into the sentence of the prayer itself — do not append it as a footnote or proof-text.

Right: "You said You would not leave me until You had done what You promised (Genesis 28:15) — so I am holding You to Your own word tonight."
Wrong: "God promises never to abandon His people. This is a comfort in dark times."

3. BUILD ON THE PRINCIPLE AND THE GOD SHOT.
Each corpus entry gives a Principle (the theological substance, carrying the scriptural language itself) and each source ends with a God Shot (what the chapter reveals about God's character). These two are the raw material of the prayer. Pray the Principle as address and pray the God Shot as adoration — turn "God is the one who wrestles" into "You are the One who wrestles with me". Do not restate them as observations.

4. NEVER INVENT SCRIPTURE.
Quote only what appears in the CORPUS PASSAGES provided, and cite only the references supplied there. Do not reconstruct verses from memory, do not adjust wording to fit, and do not cite a reference that is not in the passages given. If you need something the corpus does not supply, allude to it without quoting or citing.

5. NO COMMENTARY.
Do not explain what the prayer is doing. Do not introduce sections with description. Do not summarise afterwards. Section headings are the only non-prayer text permitted.

6. HONOUR LEAP FLAGS.
If a corpus principle carries a LEAP FLAG, do not build a confident claim on it. Either avoid it or pray it with the tentativeness the flag indicates.

Aim for at least one direct, cited quotation per section, and more where the section is long. A section with no scriptural anchor has failed.
═══════════════════════════════════════════════`

  // ── Night Watch: two postures, one shape ──
  // Written as MOVEMENTS deliberately. In stage 2 each movement becomes its own
  // generation in a timed watch session; here they are compressed into a single
  // prayer. Keep the movement names stable so that expansion is a UI change.
  const nightwatch: Record<NightPosture, { instructions: string; maxTokens: number }> = {

    communion: {
      maxTokens: 1100,
      instructions: `
PRAYER MODE: NIGHT WATCH — COMMUNION POSTURE

WHAT IS BEING BROUGHT INTO THE WATCH: ${situation}

This is prayer for the night hours. The person is awake when most are not. Do NOT treat this as an emergency or assume distress — being awake at night is not automatically a crisis. This posture is contemplative and NON-INSTRUMENTAL: they are not contending for an outcome, not petitioning, not problem-solving. They are keeping watch with God.

The governing texts: Psalm 134 — the servants who stand by night in the house of the Lord, whose whole ministry is to bless Him in the dark hours. 1 Samuel 3 — Samuel hearing his name in the night and not at first recognising the voice. Psalm 63:6 — "when I remember you upon my bed, and meditate on you in the watches of the night."

Write in the register of the night: quieter, slower, fewer words per sentence than a daytime prayer. The night has its own acoustics. Do not fill the silence.

MOVEMENTS — every one is addressed to God, every one anchors on a cited corpus passage:

**THE WAKING**
Tell God simply that you are awake. Address Him directly. Do not describe the night or spiritualise the hour. 2-3 sentences. Anchor on one cited passage.

**THE STILLNESS**
Pray back to God what the corpus passages say He is. This movement is mostly quotation — take the statements about His character and presence and say them to Him. Not what He gives; who He is. 4-5 sentences, at least two cited quotations. Unhurried. Short sentences.

**THE LISTENING**
Pray Samuel's words if 1 Samuel 3 is supplied — "Speak, for your servant hears" — quoted and cited. Tell God you are listening. Do NOT manufacture a reply from Him or claim to have heard anything. 3-4 sentences with a cited anchor.

**THE KEEPING**
Pray Psalm 134's posture if supplied — the servants who stand by night and bless the Lord. Tell God what you are keeping watch over, or that you are keeping watch over nothing but Him. This is presence, not petition. 3-4 sentences, at least one cited quotation.

**THE ENTRUSTING**
Hand the night back to God in His own words — quote and cite a passage of rest or trust from the corpus (Psalm 4:8 if supplied). Release, not resolution. 2-3 sentences.

Close: "In Jesus' Name, Amen."

Total: 400-550 words. Quiet, unhurried, non-instrumental. Do NOT petition. Do NOT resolve. Do NOT manufacture a word from God on His behalf. If any movement contains no quoted Scripture, that movement has failed.

CORPUS PASSAGES:
${contextBlock}`,
    },

    contending: {
      maxTokens: 1300,
      instructions: `
PRAYER MODE: NIGHT WATCH — CONTENDING POSTURE

WHAT IS BEING CONTENDED FOR: ${situation}

This is prayer for the night hours, in the posture of holding on. The governing texts: Genesis 32 — Jacob wrestling until the breaking of the day, refusing to release without blessing, and walking away marked. Acts 12 — the church praying through the night while Peter slept in chains, and God moving before morning. Acts 16 — Paul and Silas singing hymns at midnight with their feet in the stocks. Luke 18 — the widow who would not stop coming. Matthew 26 — Gethsemane, "could you not watch with me one hour."

CRITICAL THEOLOGICAL BOUNDARIES:
- Persistence in prayer is NOT how we overcome God's reluctance. God is not worn down. Luke 18 contrasts the unjust judge with God — the point is that God is NOT like him.
- Do NOT imply that praying at 3am is more powerful, more effective, or more likely to be heard than praying at 3pm. There is no such mechanism in Scripture. The night watch is a discipline of the one praying, not a lever on God.
- Do NOT suggest the outcome depends on the intensity, duration, or volume of the prayer.
- Jacob did not win. He was overpowered, marked, and renamed — and called that blessing.
- Do NOT generate speculative demonology or treat the night hours as a time of heightened demonic activity requiring special counter-measures.

MOVEMENTS — every one is addressed to God, every one anchors on a cited corpus passage:

**THE WAKING**
Tell God plainly that you are awake and why. Address Him — "I am awake at this hour because…". No scene-setting, no description of the night. 2-3 sentences. Anchor on one cited passage.

**THE GRIP**
Pray Jacob's words as your own: "I will not let you go unless you bless me" (quote and cite from the corpus if Genesis 32 is supplied). Then tell God specifically what you are holding onto and why you have not released it. Speak to Him, not about the situation. 4-5 sentences, at least two cited quotations.

**THE HONEST DURATION**
Tell God how long this has gone unanswered. Ask Him directly — "How long…?" is a prayer, not a complaint about Him. Do not soften the delay and do not explain the delay's purpose on His behalf. 3-4 sentences with at least one cited anchor.

**THE GROUND**
Say back to God what He has said. This movement is almost entirely quotation: take the covenant statements and the declarations about Christ's finished work from the corpus passages and pray them to Him as the reason you are still asking. Confidence rests on His word, never on your persistence or the hour. 4-5 sentences, at least three cited quotations — this is the most heavily anchored movement in the prayer.

**THE HOLDING**
Speak the asking itself, plainly and specifically. "I am still asking You for…" "I am not letting go of…" Name the actual thing. 4-5 sentences, each tied to something God has said.

**THE BREAKING OF THE DAY**
Jacob ended the night with a limp and a new name, not a victory. Pray both: that you will keep holding on, and that you are willing to be changed rather than merely answered. 3-4 sentences with a cited anchor. Do NOT promise breakthrough by morning.

Close: "In Jesus' Name, Amen."

Total: 550-700 words. Contending but not striving. Persistent without treating persistence as leverage over God. If any movement contains no quoted Scripture, that movement has failed.

CORPUS PASSAGES:
${contextBlock}`,
    },
  }

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

    nightwatch: nightwatch[posture],
  }

  const fmt = formats[mode]
  return {
    prompt: base + fmt.instructions,
    // Word-anchored prayer carries inline quotations and parenthetical
    // citations, which cost roughly a third more output than the same prayer in
    // plain prose. Without this headroom the longer modes truncate mid-prayer.
    maxTokens: Math.round(fmt.maxTokens * 1.35),
  }
}

export interface PrayerResult {
  mode: PrayerMode
  posture?: NightPosture
  situation: string
  prayer: string
  refs: string[]
  date: string
}

// ── Helper: get theme boost for corpus retrieval by mode ──
// Nightwatch themes are deliberately narrower (2 not 4). Theme bonus is 6pts
// each, so at nightwatch's lower keyword scores a 4-theme set lets the bonus
// dominate and floats in noise (this is how "Construction of the Temple"
// surfaced during the retrieval probe).
export function getModeThemes(mode: PrayerMode, posture: NightPosture = 'communion'): Set<string> {
  if (mode === 'nightwatch') return new Set(NIGHTWATCH_THEMES[posture])

  const themeMap: Record<PrayerMode, string[]> = {
    adoration:    ['worship', 'holiness', 'sovereignty', 'love'],
    confession:   ['repentance', 'grace', 'sin', 'covenant'],
    thanksgiving: ['faith', 'hope', 'covenant', 'love'],
    intercession: ['prayer', 'community', 'covenant', 'love'],
    lament:       ['suffering', 'prayer', 'hope', 'faith'],
    declaration:  ['faith', 'covenant', 'obedience', 'sovereignty'],
    warfare:      ['faith', 'obedience', 'covenant', 'sovereignty'],
    nightwatch:   NIGHTWATCH_THEMES.communion,
  }
  return new Set(themeMap[mode] || [])
}

// ── Hybrid retrieval for the night watch ────────────────
// 2 curated anchors + 2 situation-driven results. The anchors guarantee the
// theological spine is present regardless of what the user types; retrieve()
// keeps it personal. Anchors are rotated per call so repeat watches don't
// always open on the same two passages.
export function retrieveNightwatch(
  corpus: CorpusChapter[],
  situation: string,
  posture: NightPosture,
  k = 4,
): CorpusChapter[] {
  const anchorPool = NIGHTWATCH_ANCHORS[posture]
    .map(id => corpus.find(c => c.id === id))
    .filter((c): c is CorpusChapter => Boolean(c))

  const anchors = [...anchorPool].sort(() => Math.random() - 0.5).slice(0, 2)

  const retrieved = retrieve(corpus, `${situation} ${NIGHTWATCH_BOOST[posture]}`, {
    k:              k,
    selectedThemes: new Set(NIGHTWATCH_THEMES[posture]),
  })

  const seen = new Set(anchors.map(c => c.id))
  const merged = [...anchors]
  for (const c of retrieved) {
    if (seen.has(c.id)) continue
    merged.push(c)
    seen.add(c.id)
    if (merged.length >= k) break
  }
  return merged
}

// ── Format prayer text for display ──────────────────────
// `mode` matters: the declaration regex below matches any paragraph opening
// with "I am", which would catch nightwatch lines like "I am still asking…" and
// "I am not letting go of…" and render them as gold-bordered proclamations.
// Neither night posture is declaration-shaped — communion is deliberately quiet
// and contending is explicitly not leverage — so that styling is suppressed.
export function formatPrayer(text: string, mode?: PrayerMode): string {
  if (!text) return ''
  const allowDeclarationStyle = mode !== 'nightwatch'

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
    if (allowDeclarationStyle && /^(I declare|I am|I stand|I refuse|I will not|God has|By the|His word|I enforce|On the basis|Christ has|The victory|In Christ|I arrest|I command)/m.test(trimmed)) {
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
