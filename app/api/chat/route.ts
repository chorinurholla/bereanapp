import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: { message: 'ANTHROPIC_API_KEY is not set in environment variables' } },
      { status: 500 }
    )
  }

  if (!apiKey.startsWith('sk-ant-')) {
    return NextResponse.json(
      { error: { message: 'ANTHROPIC_API_KEY format is invalid — must start with sk-ant-' } },
      { status: 500 }
    )
  }

  try {
    const body = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()

    // Make sure we always return valid JSON
    try {
      const data = JSON.parse(text)
      return NextResponse.json(data, { status: response.status })
    } catch {
      return NextResponse.json(
        { error: { message: `Anthropic API returned non-JSON: ${text.substring(0, 200)}` } },
        { status: 502 }
      )
    }

  } catch (err: unknown) {
    const e = err as { message?: string }
    return NextResponse.json(
      { error: { message: e?.message || 'Server error' } },
      { status: 500 }
    )
  }
}
