import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const { text, voice = 'alloy' } = await req.json()
    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // Clean text for speech — remove markdown, principle tags, etc.
    const cleanText = text
      .replace(/\[PRINCIPLE\](.*?)\[\/PRINCIPLE\]/gs, '$1')
      .replace(/\[WARNING\](.*?)\[\/WARNING\]/gs, '$1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^#{1,3} /gm, '')
      .replace(/---+/g, '')
      .trim()

    // Limit to ~3000 chars to keep cost reasonable (~$0.02 per devotion)
    const truncated = cleanText.length > 4000 ? cleanText.substring(0, 4000) + '...' : cleanText

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: truncated,
        voice,           // alloy | echo | fable | onyx | nova | shimmer
        response_format: 'mp3',
      }),
    })

    if (!response.ok) {
      // Fallback: return signal to use browser TTS
      const err = await response.text()
      console.error('[TTS] OpenAI error:', err)
      return NextResponse.json({ fallback: true, text: truncated }, { status: 200 })
    }

    // Stream audio back as mp3
    const audioBuffer = await response.arrayBuffer()
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    })

  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[TTS] Error:', e)
    return NextResponse.json({ fallback: true }, { status: 200 })
  }
}
