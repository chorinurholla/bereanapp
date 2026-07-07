import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY

  // Log key status for debugging (redacted)
  console.log('[TTS] OPENAI_API_KEY present:', !!openaiKey, openaiKey ? `(starts: ${openaiKey.substring(0,7)}...)` : '(missing)')

  // If no OpenAI key configured, tell client to use browser TTS
  if (!openaiKey) {
    console.warn('[TTS] OPENAI_API_KEY not set — falling back to browser TTS')
    return NextResponse.json({ fallback: true, reason: 'no_key' }, { status: 200 })
  }

  try {
    const { text, voice = 'nova' } = await req.json()
    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // Strip markdown and tags for clean speech
    const cleanText = text
      .replace(/\[PRINCIPLE\]([\s\S]*?)\[\/PRINCIPLE\]/g, '$1')
      .replace(/\[WARNING\]([\s\S]*?)\[\/WARNING\]/g, '$1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^#{1,3} /gm, '')
      .replace(/---+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Keep under 4000 chars (~$0.02 at tts-1 pricing)
    const input = cleanText.length > 4000 ? cleanText.substring(0, 4000) : cleanText

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input,
        voice,           // nova is warm and natural — good for devotional content
        response_format: 'mp3',
        speed: 0.95,     // Slightly slower — better for devotional listening
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[TTS] OpenAI error:', response.status, errText)
      return NextResponse.json({
        fallback: true,
        reason: 'openai_error',
        status: response.status,
      }, { status: 200 })
    }

    const audioBuffer = await response.arrayBuffer()
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type':                 'audio/mpeg',
        'Content-Length':               audioBuffer.byteLength.toString(),
        'Accept-Ranges':                'bytes',
        'Cache-Control':                'no-cache, no-store',
        'Access-Control-Allow-Origin':  '*',
        'X-Content-Type-Options':       'nosniff',
      },
    })

  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[TTS] Server error:', e?.message)
    return NextResponse.json({ fallback: true, reason: 'server_error' }, { status: 200 })
  }
}
