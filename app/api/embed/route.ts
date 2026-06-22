import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY

  if (!openaiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 })
  }

  try {
    const { text } = await req.json()
    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:      'text-embedding-3-small',
        input:      text.substring(0, 8000),
        dimensions: 1536,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[embed] OpenAI error:', response.status, err)
      return NextResponse.json({ error: 'Embedding failed' }, { status: 500 })
    }

    const data = await response.json()
    const embedding = data.data?.[0]?.embedding

    if (!embedding) {
      return NextResponse.json({ error: 'No embedding returned' }, { status: 500 })
    }

    return NextResponse.json({ embedding })

  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[embed] Error:', e?.message)
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
