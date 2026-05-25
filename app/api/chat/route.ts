import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Standard Node.js runtime (more reliable on Vercel free tier)
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: { message: 'API key not configured on server' } },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { model, max_tokens, system, messages } = body

    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-5',
      max_tokens: max_tokens || 2000,
      system,
      messages,
    })

    return NextResponse.json(response)
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string }
    console.error('[Berean API]', error)
    return NextResponse.json(
      { error: { message: error?.message || 'Server error' } },
      { status: error?.status || 500 }
    )
  }
}
