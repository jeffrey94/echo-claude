/**
 * OpenAI Text-to-Speech API Endpoint
 * Converts text to natural speech using OpenAI's TTS models
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'nova' } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    console.log('🎤 Generating speech for:', text.substring(0, 50) + '...')

    // Generate speech using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: "tts-1", // Standard model - 2x faster than tts-1-hd
      voice: voice as any, // nova, alloy, echo, fable, onyx, shimmer
      input: text,
      response_format: "mp3",
      speed: 1.1 // Slightly faster speaking for quicker responses
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())

    // Return audio as MP3
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours (interviews reuse phrases)
      },
    })

  } catch (error: any) {
    console.error('TTS Generation Error:', error)
    
    if (error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    )
  }
}