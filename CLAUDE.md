# Berean — Claude Session Context

Read this file before making any changes. It contains everything needed to work on this codebase without prior conversation history.

---

## What Berean Is

Berean is a biblical spiritual formation web app deployed at **monskisnote.com**. It is built on a corpus of 1,185 chapters and 4,065 principles extracted from all 66 books of the Bible, authored by Tolu Sorinola over 6 months. The corpus is the heart of everything — it powers devotions, prayer, Ask Scripture, and semantic search.

The owner is **Tolu Sorinola** (Aloniros Inc., Calgary). He is a Bible study leader, entrepreneur (nightclub in Abeokuta, Nigeria; Quenchtails beverage brand in Canada), and the corpus is his personal biblical study work.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router, TypeScript |
| Styling | Tailwind v4 + CSS custom properties |
| Auth & DB | Supabase (ztbpleqzexhybmkmhtyk.supabase.co) |
| Vector search | Supabase pgvector (text-embedding-3-small, 1536 dims) |
| AI | Anthropic API (claude-sonnet-4-5) |
| TTS | OpenAI API (tts-1, nova voice) |
| Embeddings | OpenAI API (text-embedding-3-small) |
| Deployment | Vercel (project: tolu-aloniroscom) |
| Repo | github.com/chorinurholla/bereanapp |

---

## Environment Variables (Vercel + .env.local)

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://ztbpleqzexhybmkmhtyk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
OPENAI_API_KEY=sk-...         # Required for TTS + semantic search
SUPABASE_SERVICE_ROLE_KEY=eyJ... # Only needed for embedding script, not Vercel
```

---

## File Map

```
app/
  (app)/
    layout.tsx              — Navigation (7 items: Devotion, Prayer, Ask, Search, History, Journal, Settings)
    devotion/page.tsx       — Daily devotion: 3 length modes (Brief/Standard/Deep), 21 themes, testament filter
    prayer/page.tsx         — Prayer Workshop: 7 modes (Adoration, Confession, Thanksgiving, Intercession, Lament, Declaration, Warfare)
    chat/page.tsx           — Ask Scripture: RAG chat, conversation-aware, saves to Supabase
    search/page.tsx         — Corpus Explorer: all 66 books, all 21 themes, keyword search
    history/page.tsx        — Formation Record: Arc, Canon Map, Kingdom Patterns (15), Devotion Log (full text)
    journal/page.tsx        — Journal: Prayer Journal tab + Sermon Notes tab (with live corpus search)
    settings/page.tsx       — User profile (name, occupation)
  api/
    chat/route.ts           — Anthropic proxy (Node runtime, 60s timeout)
    tts/route.ts            — OpenAI TTS proxy (nova voice, segments long text, 60s timeout)
    embed/route.ts          — OpenAI embedding endpoint (text-embedding-3-small)
    semantic-search/route.ts — Supabase pgvector RPC (match_corpus_chunks function)
  layout.tsx                — Root layout (Google Fonts: Playfair Display, Source Serif 4, DM Sans)
  globals.css               — Design system CSS vars

lib/
  use-corpus-chat.ts        — Core RAG hook: semantic search → keyword fallback, devo + ask modes
  corpus.ts                 — CorpusChapter type, retrieve() keyword scoring, buildContextBlock()
  patterns.ts               — 15 Kingdom Patterns with detection logic
  sync.ts                   — localStorage + Supabase sync (all 6 data types)
  auth-context.tsx          — AuthProvider + useAuth hook
  supabase.ts               — Supabase client + TypeScript interfaces (JournalEntry, SermonNote, etc.)

components/berean/
  MessageBubble.tsx         — Chat message renderer + ReadAloudButton (OpenAI TTS, iOS-safe)
  TopBar.tsx                — Desktop top navigation
  BottomNav.tsx             — Mobile bottom navigation (first 5 nav items)

public/
  corpus.json               — 1,185 chapters, 4,065 principles, 66 books (DO NOT REGENERATE)

scripts/
  generate-embeddings.mjs   — One-time embedding script (already run, 1,185 rows in Supabase)

vercel.json                 — Function timeouts: TTS=60s, chat=60s, semantic-search=30s
supabase_vector_setup.sql   — Already executed in Supabase (DO NOT RE-RUN)
```

---

## Supabase Schema

### berean_data table
```sql
user_id   uuid references auth.users
data_type text  -- tracker | history | journal | sermons | conversations | devotion_count
data      jsonb
unique(user_id, data_type)
```

### corpus_embeddings table (pgvector)
```sql
id            text primary key  -- e.g. "Genesis_GENESIS_1"
book          text
testament     text              -- OT | NT
reference     text
chapter_title text
embedding     vector(1536)
```

### match_corpus_chunks RPC function
```sql
-- Called by /api/semantic-search
match_corpus_chunks(query_embedding vector, match_count int, filter_testament text)
returns table(id, book, testament, reference, chapter_title, similarity float)
```

---

## Corpus Structure (corpus.json)

Each chunk has:
```typescript
{
  id:            string       // "Genesis_GENESIS_1"
  book:          string       // "Genesis"
  testament:     'OT' | 'NT'
  reference:     string       // "GENESIS 1"
  chapter_title: string       // "Creation by the Word"
  framing:       string       // narrative context / observation
  observation:   string       // same as framing
  context:       string       // historical/cultural context
  principles:    Principle[]  // array of extracted principles
  god_shot:      string       // what this reveals about God
  themes:        string[]     // up to 6 from the 21 theme taxonomy
  principle_count: number
  sequence:      number       // canonical order
}
```

Each Principle:
```typescript
{
  title:           string  // "Creative Authority Is Exercised Through Words"
  verse_reference: string  // "Genesis 1:1-3"
  principle:       string  // one-sentence transferable statement
  application:     string  // modern application paragraph
  leap_flag:       string  // interpretive leap warning if present
  cross_ref:       string  // cross-references
}
```

### 21 Corpus Themes (in frequency order)
sin, covenant, sovereignty, faith, community, hope, calling, prayer, suffering, obedience, grace, worship, leadership, stewardship, identity, pride, love, repentance, wisdom, justice, holiness

---

## RAG Architecture (use-corpus-chat.ts)

**Primary: Semantic search** → `/api/semantic-search` → Supabase pgvector → top-k by cosine similarity
**Fallback: Keyword scoring** → local `retrieve()` in corpus.ts → tf-idf style scoring

**k values:**
- Devotion mode: k=3, fetches 18 candidates then filters for history/theme/testament
- Ask mode default: k=8
- Ask mode with search intent detected: k=12

**Context building:** Last 3 conversation exchanges + current message = retrieval query

**Devotion-specific filters applied after semantic retrieval:**
1. Remove already-used chapters (unusedOnly)
2. Apply theme filter if selectedThemes.size > 0
3. Apply testament filter (OT/NT/both)
4. Book diversity: max 2 chunks per book
5. Fill short results from unused pool if needed

---

## Design System

```css
/* Key CSS variables */
--paper:   #fefcf8   /* warm parchment background */
--paper2:  #faf7f2   /* slightly darker parchment */
--gold:    #8a6d35   /* primary gold */
--gold2:   #9a7b3a   /* slightly lighter gold */
--ink:     #18150f   /* near-black */
--ink2:    #2a2218   /* dark ink */
--ink3:    #4a3e2e   /* medium ink */
--ink4:    #7a6a54   /* muted ink */
--ink5:    #9a8a74   /* light ink */
--rule:    rgba(154,123,58,0.15)  /* border/divider */
--s1:      0 1px 3px rgba(0,0,0,0.06)   /* subtle shadow */
--s2:      0 2px 8px rgba(0,0,0,0.08)   /* card shadow */

/* Typography */
Playfair Display — headings (h1, h2, editorial)
Source Serif 4   — body text, principle text, prayer text
DM Sans          — UI labels, buttons, metadata, caps labels
```

### CSS utility classes
`.berean-prose` — formatted long-form text
`.principle-block` — gold left-border principle display
`.fade-in` — opacity transition animation
`.entry-row` — clickable list row
`.btn-gold` — primary gold button
`.btn-outline` — outlined secondary button
`.input-field` — standard text input
`.topnav` — desktop navigation bar
`.bottomnav` — mobile navigation bar

---

## Navigation (7 items)

```typescript
const NAV = [
  { href: '/devotion', label: 'Devotion'  },
  { href: '/prayer',   label: 'Prayer'    },
  { href: '/chat',     label: 'Ask'       },
  { href: '/search',   label: 'Search'    },
  { href: '/history',  label: 'History'   },
  { href: '/journal',  label: 'Journal'   },
  { href: '/settings', label: 'Settings'  },
]
// Mobile bottom nav shows first 5 items
```

---

## Key Features Summary

### Devotion (devotion/page.tsx)
- 3 length modes: Brief (400-600w), Standard (900-1200w), Deep Study (1400-1800w)
- 21 theme filters, OT/NT/Both testament filter
- Auto-saves to history with full text
- Kingdom Pattern detection from retrieved chunks
- Read Aloud button (OpenAI TTS nova voice)

### Prayer Workshop (prayer/page.tsx)
7 modes, each with distinct theology and system prompt:
1. **Adoration** — No agenda, pure encounter with God's character
2. **Confession** — Honest acknowledgment including Job-style protest
3. **Thanksgiving** — Specific rehearsal of past faithfulness
4. **Intercession** — Solidarity not superiority, "we" not "they"
5. **Lament** — Raw grief toward God, does NOT force resolution
6. **Covenant Declaration** — Covenant speech over situations
7. **Warfare & Enforcement** — Enforcing Christ's accomplished victory (bounded — no speculative demonology)

Each mode: tab UI → description card → textarea + examples → generate → result card → Save/Copy/Share/Regenerate

### Ask Scripture (chat/page.tsx)
- RAG chat with conversation-aware retrieval
- 8 starter question prompts
- Auto-saves conversations to Supabase
- Saved Conversations tab

### Corpus Explorer (search/page.tsx)
- Browse by all 9 canonical sections, all 66 books individually
- Filter by all 21 themes
- Keyword search across 4,065 principle titles
- Click book → see all chapters → click chapter → see all principles

### Formation Record (history/page.tsx)
- 4 tabs: Formation Arc (streak/progress), Canon Map (66 books), Kingdom Patterns (15), Devotion Log
- Devotion Log: expandable full text with formatted rendering
- Export to text file

### Journal (journal/page.tsx)
- **Prayer Journal tab**: saved prayers from devotions + Prayer Workshop
- **Sermon Notes tab**: structured capture (title, preacher, passage, main point, outline, insights, application, questions) + live corpus search from questions field
- Export both to text file

### Read Aloud (MessageBubble.tsx)
- Pre-creates Audio element synchronously in gesture handler (iOS Safari fix)
- `playsinline` attribute (prevents iOS fullscreen)
- Server segments long text at sentence boundaries
- `visibilitychange` listener recovers playback after screen lock
- Falls back to browser TTS if OpenAI key missing

---

## 15 Kingdom Patterns (patterns.ts)

The Wilderness, The Pit, The Long Obedience, The Hidden Years, The Commissioning, The Covenant Test, The Pruning, The Remnant, The Confrontation, The Table Turned, The Return, The Multiplication, The Threshold, The Night Season, The Mantle

Each pattern has: name, description, formation_question, carrying_question, keywords[], anchors[], color, icon

Detection: score by keyword phrase matches (phrases score 4pts, single words 2pts) + book anchor bonus (3pts)

---

## Sync Architecture (sync.ts)

Data persists in both localStorage (instant) and Supabase (cloud backup).

**6 data types synced:**
| data_type | Content |
|---|---|
| tracker | Chapter read history (unusedOnly tracking) |
| history | Devotion log entries with full text |
| journal | Prayer journal entries |
| sermons | Sermon notes |
| conversations | Saved Ask conversations |
| devotion_count | Running total |

**On login:** `syncFromCloud()` fetches all 6 types, merges with local (cloud wins on conflicts), sorts by date.

**On save:** `saveLocal()` (immediate) + `pushToCloud()` (fire-and-forget async to Supabase).

---

## Known Constraints / Do Not Touch

- **corpus.json** — Never regenerate. The gold-standard MD source files are in the project folder. The extraction was a one-time process producing exactly 1,185 chapters and 4,065 principles.
- **corpus_embeddings** — 1,185 rows already in Supabase. The `generate-embeddings.mjs` script is for first-time setup only.
- **supabase_vector_setup.sql** — Already executed. Do not re-run.
- **Deuteronomy** — Uses `Deuteronomy_2.md` (the larger file). The book name in corpus.json is "Deuteronomy" (without the _2).

---

## Git Workflow

```bash
cd ~/Documents/Monskinote/bereanapp
git add .
git commit -m "Description of change"
git push --force   # --force required because of diverged history
```

Remote: `https://github.com/chorinurholla/bereanapp.git`
Auth: Personal Access Token (GitHub → Settings → Developer settings → PAT classic → repo scope)

---

## How to Start a New Session

1. Upload `berean_nextjs_rebuild.zip` (latest build)
2. Say: *"Read CLAUDE.md and the zip, then [what you want to change]"*
3. Claude will unzip, read relevant files, make the change, build, and repackage
4. Download new zip → copy `berean-app/` contents into local repo → git push

---

## Tolu's Design Preferences

- Warm editorial aesthetic — parchment, gold, Source Serif 4 for all substantive text
- No bullet points in AI responses — prose only
- Theological precision over spiritual cliché — the corpus methodology (Observation → Interpretation → Timeless Principle → Modern Application) is the editorial spine
- Prayer modes must not produce generic output — every prayer grounded in specific corpus principles
- Honest about interpretive leaps — leap flags preserved, not smoothed over
- Formation-first — Berean is not a Bible search tool, it is a spiritual formation companion
