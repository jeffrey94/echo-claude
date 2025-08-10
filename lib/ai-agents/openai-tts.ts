/**
 * OpenAI Text-to-Speech Client
 * Handles premium TTS generation using OpenAI's neural voices
 */

export interface TTSOptions {
  voice?: 'nova' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer'
  speed?: number
}

export class OpenAITTS {
  private audioContext: AudioContext | null = null
  private currentAudio: HTMLAudioElement | null = null

  constructor() {
    // Initialize audio context for better audio handling
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  /**
   * Generate and play speech from text using OpenAI TTS
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    try {
      console.log('🎤 OpenAI TTS: Generating speech for:', text.substring(0, 50) + '...')

      // Stop any currently playing audio
      this.stop()

      // Call our TTS API endpoint
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: options.voice || 'nova', // Default to Nova (warm female voice)
          speed: options.speed || 1.0
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'TTS generation failed')
      }

      // Get audio blob from response
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      // Create and play audio element
      return new Promise((resolve, reject) => {
        this.currentAudio = new Audio(audioUrl)
        
        this.currentAudio.onloadeddata = () => {
          console.log('🎵 Audio loaded, starting playback')
        }

        this.currentAudio.onplay = () => {
          console.log('🎵 OpenAI TTS: Playing audio')
        }

        this.currentAudio.onended = () => {
          console.log('🎵 OpenAI TTS: Audio finished')
          URL.revokeObjectURL(audioUrl) // Clean up
          this.currentAudio = null
          resolve()
        }

        this.currentAudio.onerror = (error) => {
          console.error('🎵 Audio playback error:', error)
          URL.revokeObjectURL(audioUrl)
          this.currentAudio = null
          reject(new Error('Audio playback failed'))
        }

        // Start playback
        this.currentAudio.play().catch(error => {
          console.error('🎵 Failed to start audio playback:', error)
          reject(error)
        })
      })

    } catch (error: any) {
      console.error('OpenAI TTS Error:', error)
      
      // Only fallback if it's a real TTS generation error, not a playback error
      if (error.message?.includes('TTS generation failed') || error.message?.includes('Failed to generate speech')) {
        console.log('🔄 TTS generation failed, falling back to browser TTS...')
        return this.fallbackTTS(text)
      } else {
        console.error('🔄 Playback error, not falling back to avoid duplicate audio')
        throw error
      }
    }
  }

  /**
   * Stop current audio playback
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
      console.log('🛑 Stopped OpenAI TTS playback')
    }
  }

  /**
   * Check if audio is currently playing
   */
  isSpeaking(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused
  }

  /**
   * Fallback to browser TTS if OpenAI fails
   */
  private fallbackTTS(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9
        utterance.pitch = 1.1
        utterance.volume = 0.9

        // Try to use a natural voice
        const voices = speechSynthesis.getVoices()
        const naturalVoice = voices.find(voice => 
          voice.name.includes('Samantha') || 
          voice.name.includes('Microsoft Aria') ||
          voice.name.includes('Google UK English Female')
        )
        
        if (naturalVoice) {
          utterance.voice = naturalVoice
        }

        utterance.onend = () => resolve()
        utterance.onerror = (error) => reject(error)

        speechSynthesis.speak(utterance)
      } else {
        reject(new Error('No TTS available'))
      }
    })
  }
}