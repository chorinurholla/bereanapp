import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60   // Increase Vercel timeout to 60s for long devotions

const MAX_CHARS = 4096  // OpenAI TTS token limit per call (~4096 tokens ≈ ~16,000 chars)

export async function POST(req: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY

  if (!openaiKey) {
    console.warn('[TTS] OPENAI_API_KEY not set')
    return NextResponse.json({ fallback: true, reason: 'no_key' }, { status: 200 })
  }

  try {
    const { text, voice = 'nova' } = await req.json()
    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // Strip markdown for clean speech
    const cleaned = text
      .replace(/\[PRINCIPLE\]([\s\S]*?)\[\/PRINCIPLE\]/g, '$1')
      .replace(/\[WARNING\]([\s\S]*?)\[\/WARNING\]/g, '$1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^#{1,3} /gm, '')
      .replace(/---+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Split into segments if text exceeds OpenAI's limit
    // Split at sentence boundaries to avoid cutting mid-word
    const segments: string[] = []
    if (cleaned.length <= MAX_CHARS) {
      segments.push(cleaned)
    } else {
      // Split on sentence endings, keeping segments under MAX_CHARS
      const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned]
      let current = ''
      for (const sentence of sentences) {
        if ((current + sentence).length > MAX_CHARS) {
          if (current) segments.push(current.trim())
          current = sentence
        } else {
          current += sentence
        }
      }
      if (current.trim()) segments.push(current.trim())
    }

    console.log(`[TTS] ${segments.length} segment(s), total chars: ${cleaned.length}`)

    // Generate audio for each segment and concatenate
    const audioChunks: ArrayBuffer[] = []

    for (const segment of segments) {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          model:           'tts-1',
          input:           segment,
          voice,
          response_format: 'mp3',
          speed:           0.95,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error('[TTS] OpenAI error:', response.status, errText)
        // Return what we have so far, or fall back
        if (audioChunks.length === 0) {
          return NextResponse.json({
            fallback: true, reason: 'openai_error', status: response.status,
          }, { status: 200 })
        }
        break  // Return partial audio rather than nothing
      }

      audioChunks.push(await response.arrayBuffer())
    }

    // Concatenate all MP3 chunks
    const totalLength = audioChunks.reduce((sum, b) => sum + b.byteLength, 0)
    const combined    = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of audioChunks) {
      combined.set(new Uint8Array(chunk), offset)
      offset += chunk.byteLength
    }

    console.log(`[TTS] Returning ${totalLength} bytes (${segments.length} segments)`)

    return new NextResponse(combined.buffer, {
      status: 200,
      headers: {
        'Content-Type':                'audio/mpeg',
        'Content-Length':              totalLength.toString(),
        'Accept-Ranges':               'bytes',
        'Cache-Control':               'no-cache, no-store',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options':      'nosniff',
        'X-TTS-Segments':              segments.length.toString(),
        'X-TTS-Chars':                 cleaned.length.toString(),
      },
    })

  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[TTS] Server error:', e?.message)
    return NextResponse.json({ fallback: true, reason: 'server_error' }, { status: 200 })
  }
}
