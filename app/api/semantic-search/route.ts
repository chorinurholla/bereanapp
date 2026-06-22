import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const openaiKey   = process.env.OPENAI_API_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  if (!openaiKey) {
    return NextResponse.json({ fallback: true, reason: 'no_openai_key' }, { status: 200 })
  }

  try {
    const { query, k = 10, testament } = await req.json()

    if (!query?.trim()) {
      return NextResponse.json({ error: 'No query provided' }, { status: 400 })
    }

    // Step 1: Embed the query
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:      'text-embedding-3-small',
        input:      query.substring(0, 8000),
        dimensions: 1536,
      }),
    })

    if (!embedRes.ok) {
      const err = await embedRes.text()
      console.error('[semantic-search] Embed error:', embedRes.status, err)
      return NextResponse.json({ fallback: true, reason: 'embed_failed' }, { status: 200 })
    }

    const embedData = await embedRes.json()
    const embedding  = embedData.data?.[0]?.embedding

    if (!embedding) {
      return NextResponse.json({ fallback: true, reason: 'no_embedding' }, { status: 200 })
    }

    // Step 2: Query Supabase pgvector via RPC
    const rpcRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/match_corpus_chunks`,
      {
        method: 'POST',
        headers: {
          'apikey':        supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          query_embedding:  embedding,
          match_count:      k,
          filter_testament: testament || null,
        }),
      }
    )

    if (!rpcRes.ok) {
      const err = await rpcRes.text()
      console.error('[semantic-search] Supabase RPC error:', rpcRes.status, err)
      // Table may not exist yet (embeddings not generated) — fall back gracefully
      return NextResponse.json({
        fallback: true,
        reason:   rpcRes.status === 404 ? 'table_not_found' : 'rpc_error',
        detail:   err,
      }, { status: 200 })
    }

    const matches: Array<{
      id: string
      book: string
      testament: string
      reference: string
      chapter_title: string
      similarity: number
    }> = await rpcRes.json()

    if (!matches || matches.length === 0) {
      return NextResponse.json({ fallback: true, reason: 'no_matches' }, { status: 200 })
    }

    return NextResponse.json({ matches })

  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[semantic-search] Error:', e?.message)
    return NextResponse.json({ fallback: true, reason: 'server_error' }, { status: 200 })
  }
}
