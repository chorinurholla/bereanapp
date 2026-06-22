/**
 * BEREAN — Corpus Embedding Generator
 * 
 * Run this ONCE locally after setting up pgvector in Supabase:
 *   node scripts/generate-embeddings.mjs
 * 
 * Prerequisites:
 *   1. Run supabase_vector_setup.sql in your Supabase SQL Editor
 *   2. Set environment variables (or create .env.local with these):
 *      OPENAI_API_KEY=sk-...
 *      NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *      SUPABASE_SERVICE_ROLE_KEY=eyJ...  (NOT the anon key — needs write access)
 * 
 * Cost: ~$0.006 for all 1,185 chunks at text-embedding-3-small pricing
 * Time: ~3-5 minutes (batched, rate-limited)
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

// ── Load env from .env.local ──
function loadEnv() {
  try {
    const envPath = join(__dir, '..', '.env.local')
    const raw = readFileSync(envPath, 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      if (key && rest.length) {
        process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // .env.local not found — expect env vars to be set externally
  }
}

loadEnv()

const OPENAI_KEY     = process.env.OPENAI_API_KEY
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!OPENAI_KEY)   { console.error('❌ Missing OPENAI_API_KEY'); process.exit(1) }
if (!SUPABASE_URL) { console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL'); process.exit(1) }
if (!SUPABASE_KEY) { console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

// ── Load corpus ──
const corpusPath = join(__dir, '..', 'public', 'corpus.json')
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'))
console.log(`Loaded ${corpus.length} corpus chunks`)

// ── Build embed text for a chunk ──
function buildEmbedText(chunk) {
  const title    = chunk.chapter_title || chunk.title || ''
  const framing  = (chunk.framing || chunk.observation || '').substring(0, 400)
  const godShot  = (chunk.god_shot || chunk.godShot || '').substring(0, 200)
  const themes   = (chunk.themes || []).join(', ')
  const principles = (chunk.principles || [])
    .slice(0, 6)
    .map(p => {
      if (typeof p === 'string') return p
      return [
        p.title || '',
        (p.application || '').substring(0, 200),
        (p.principle || '').substring(0, 150),
      ].filter(Boolean).join('. ')
    })
    .join(' | ')

  return [
    `${chunk.book} — ${title}`,
    framing,
    themes,
    principles,
    godShot,
  ].filter(Boolean).join('\n').substring(0, 2000)
}

// ── Embed a batch of texts via OpenAI ──
async function embedBatch(texts) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 1536,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.data.map(d => d.embedding)
}

// ── Upsert a batch to Supabase ──
async function upsertBatch(rows) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/corpus_embeddings`,
    {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'resolution=merge-duplicates',
      },
      body: JSON.stringify(rows),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Supabase upsert error ${response.status}: ${err}`)
  }
}

// ── Check which chunks already have embeddings ──
async function getExistingIds() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/corpus_embeddings?select=id`,
    {
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }
  )
  if (!response.ok) return new Set()
  const data = await response.json()
  return new Set(data.map(r => r.id))
}

// ── Main ──
async function main() {
  console.log('Checking existing embeddings...')
  const existing = await getExistingIds()
  console.log(`Already embedded: ${existing.size} / ${corpus.length}`)

  const toEmbed = corpus.filter(c => !existing.has(c.id))
  console.log(`Chunks to embed: ${toEmbed.length}`)

  if (toEmbed.length === 0) {
    console.log('✅ All chunks already embedded!')
    return
  }

  const BATCH_SIZE = 20   // Smaller batches to respect rate limits
  const batches = []
  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    batches.push(toEmbed.slice(i, i + BATCH_SIZE))
  }

  let processed = 0
  const startTime = Date.now()

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi]
    const texts  = batch.map(buildEmbedText)

    try {
      const embeddings = await embedBatch(texts)

      const rows = batch.map((chunk, i) => ({
        id:            chunk.id,
        book:          chunk.book,
        testament:     chunk.testament,
        reference:     chunk.reference || chunk.ref || '',
        chapter_title: chunk.chapter_title || chunk.title || '',
        embedding:     JSON.stringify(embeddings[i]),
      }))

      await upsertBatch(rows)
      processed += batch.length

      const elapsed   = ((Date.now() - startTime) / 1000).toFixed(0)
      const pct       = ((processed / toEmbed.length) * 100).toFixed(1)
      const remaining = Math.round((Date.now() - startTime) / processed * (toEmbed.length - processed) / 1000)
      
      console.log(`  [${bi+1}/${batches.length}] ${processed}/${toEmbed.length} (${pct}%) — ${elapsed}s elapsed, ~${remaining}s remaining`)

      // Rate limit: wait 6 seconds between batches to stay under 40k TPM
      if (bi < batches.length - 1) await new Promise(r => setTimeout(r, 6000))

    } catch (err) {
      console.error(`  ❌ Batch ${bi+1} failed:`, err.message)
      console.log('  Retrying in 3 seconds...')
      await new Promise(r => setTimeout(r, 3000))
      bi-- // retry this batch
    }
  }

  console.log(`\n✅ Done! ${processed} chunks embedded in ${((Date.now() - startTime)/1000).toFixed(0)}s`)
  console.log('\nNext step: Run the IVFFlat index in Supabase SQL Editor:')
  console.log(`  create index corpus_embeddings_embedding_idx`)
  console.log(`    on corpus_embeddings`)
  console.log(`    using ivfflat (embedding vector_cosine_ops)`)
  console.log(`    with (lists = 50);`)
}

main().catch(console.error)
