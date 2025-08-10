/**
 * LiveKit AI Agent - Connects AI interviewer to LiveKit rooms
 * Handles audio streaming, speech-to-text, and text-to-speech
 */

import { Room, RoomEvent, RemoteAudioTrack, LocalAudioTrack } from 'livekit-client'
import { generateAccessToken } from '../livekit'
import { DeepDiveInterviewConductor } from './deepdive-conductor'
import { InterviewContext } from './deepdive-prompts'
import OpenAI from 'openai'

export interface AIAgentConfig {
  roomName: string
  serverUrl: string
  interviewContext: InterviewContext
  onInterviewComplete?: (summary: any) => void
  onError?: (error: string) => void
}

export class LiveKitAIAgent {
  private room: Room
  private conductor: DeepDiveInterviewConductor
  private openai: OpenAI
  private isConnected: boolean = false
  private isListening: boolean = false
  private currentAudioStream?: MediaStream
  private speechRecognition?: SpeechRecognition
  private speechSynthesis: SpeechSynthesis
  private config: AIAgentConfig

  constructor(config: AIAgentConfig) {
    this.config = config
    this.room = new Room()
    this.conductor = new DeepDiveInterviewConductor(config.interviewContext)
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION_ID
    })
    this.speechSynthesis = window.speechSynthesis
    this.setupEventHandlers()
  }

  /**
   * Connect AI agent to LiveKit room
   */
  async connect(): Promise<void> {
    try {
      // Generate access token for AI participant
      const token = generateAccessToken(
        this.config.roomName,
        'echo-ai-interviewer',
        {
          role: 'interviewer',
          type: 'ai_agent',
          capabilities: ['speak', 'listen']
        }
      )

      // Connect to room
      await this.room.connect(this.config.serverUrl, token)
      console.log('AI Agent connected to room:', this.config.roomName)
      
      this.isConnected = true
      
      // Wait a moment for connection to stabilize
      setTimeout(() => {
        this.startInterview()
      }, 2000)

    } catch (error) {
      console.error('AI Agent connection error:', error)
      this.config.onError?.('Failed to connect AI interviewer')
    }
  }

  /**
   * Start the interview process
   */
  private async startInterview(): Promise<void> {
    try {
      // Begin with opening message
      const openingMessage = await this.conductor.getOpeningMessage()
      await this.speakMessage(openingMessage)
      
      // Start listening after opening
      setTimeout(() => {
        this.startListening()
      }, 3000)
      
    } catch (error) {
      console.error('Error starting interview:', error)
      this.config.onError?.('Failed to start interview')
    }
  }

  /**
   * Convert text to speech and play through LiveKit
   */
  private async speakMessage(text: string): Promise<void> {
    try {
      // Use OpenAI TTS for better quality
      const response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova', // Professional female voice
        input: text,
        speed: 0.9 // Slightly slower for better comprehension
      })

      // Convert response to audio and play
      const audioBuffer = await response.arrayBuffer()
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      // Create audio element and play
      const audio = new Audio(audioUrl)
      audio.volume = 0.8
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          resolve()
        }
        audio.onerror = reject
        audio.play()
      })

    } catch (error) {
      console.error('Text-to-speech error:', error)
      // Fallback to browser TTS
      return this.speakWithBrowserTTS(text)
    }
  }

  /**
   * Fallback browser text-to-speech
   */
  private speakWithBrowserTTS(text: string): Promise<void> {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.volume = 0.8
      
      // Try to use a professional voice
      const voices = this.speechSynthesis.getVoices()
      const professionalVoice = voices.find(voice => 
        voice.name.includes('Microsoft') || 
        voice.name.includes('Google') ||
        voice.lang.startsWith('en')
      )
      if (professionalVoice) {
        utterance.voice = professionalVoice
      }

      utterance.onend = () => resolve()
      utterance.onerror = () => resolve() // Continue even if TTS fails
      
      this.speechSynthesis.speak(utterance)
    })
  }

  /**
   * Start listening for participant responses
   */
  private startListening(): void {
    try {
      // Initialize Web Speech API
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      
      if (!SpeechRecognition) {
        console.warn('Speech recognition not supported, using manual mode')
        return
      }

      this.speechRecognition = new SpeechRecognition()
      this.speechRecognition.continuous = true
      this.speechRecognition.interimResults = false
      this.speechRecognition.lang = 'en-US'
      this.speechRecognition.maxAlternatives = 1

      this.speechRecognition.onresult = async (event) => {
        const lastResult = event.results[event.results.length - 1]
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript.trim()
          if (transcript.length > 0) {
            await this.processParticipantResponse(transcript)
          }
        }
      }

      this.speechRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        // Restart recognition on error
        setTimeout(() => {
          if (this.isConnected && !this.conductor.isInterviewComplete()) {
            this.startListening()
          }
        }, 1000)
      }

      this.speechRecognition.onend = () => {
        // Auto-restart if interview is still active
        if (this.isConnected && !this.conductor.isInterviewComplete()) {
          setTimeout(() => {
            this.startListening()
          }, 500)
        }
      }

      this.speechRecognition.start()
      this.isListening = true

    } catch (error) {
      console.error('Error starting speech recognition:', error)
    }
  }

  /**
   * Process participant response and generate AI reply
   */
  private async processParticipantResponse(transcript: string): Promise<void> {
    try {
      console.log('Participant said:', transcript)

      // Stop listening temporarily while AI responds
      this.stopListening()

      // Get AI response
      const aiResponse = await this.conductor.processResponse(transcript)
      
      // Speak the response
      await this.speakMessage(aiResponse)

      // Check if interview is complete
      if (this.conductor.isInterviewComplete()) {
        await this.completeInterview()
      } else {
        // Resume listening for next response
        setTimeout(() => {
          this.startListening()
        }, 1000)
      }

    } catch (error) {
      console.error('Error processing response:', error)
      // Try to recover
      const recoveryMessage = await this.conductor.handleRecovery('technical')
      await this.speakMessage(recoveryMessage)
      this.startListening()
    }
  }

  /**
   * Stop listening to participant
   */
  private stopListening(): void {
    if (this.speechRecognition && this.isListening) {
      this.speechRecognition.stop()
      this.isListening = false
    }
  }

  /**
   * Complete the interview and disconnect
   */
  private async completeInterview(): Promise<void> {
    try {
      // Get interview summary
      const summary = this.conductor.getInterviewSummary()
      
      // Speak closing message
      const closingMessage = 'Thank you so much for your thoughtful feedback today. Your insights will be valuable for professional growth. Have a wonderful day!'
      await this.speakMessage(closingMessage)

      // Notify completion
      this.config.onInterviewComplete?.(summary)

      // Disconnect after a brief pause
      setTimeout(() => {
        this.disconnect()
      }, 3000)

    } catch (error) {
      console.error('Error completing interview:', error)
      this.disconnect()
    }
  }

  /**
   * Disconnect from LiveKit room
   */
  disconnect(): void {
    this.stopListening()
    this.isConnected = false
    
    if (this.room) {
      this.room.disconnect()
      console.log('AI Agent disconnected from room')
    }
  }

  /**
   * Setup room event handlers
   */
  private setupEventHandlers(): void {
    this.room.on(RoomEvent.Connected, () => {
      console.log('AI Agent room connected')
    })

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('AI Agent room disconnected')
      this.isConnected = false
    })

    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('Participant joined:', participant.identity)
      if (participant.identity !== 'echo-ai-interviewer') {
        // Human participant joined, ready to start
      }
    })

    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === 'audio' && participant.identity !== 'echo-ai-interviewer') {
        console.log('Subscribed to participant audio')
        // Could use this for better audio processing
      }
    })
  }

  /**
   * Get current interview status
   */
  getStatus(): {
    connected: boolean
    listening: boolean
    interviewComplete: boolean
    summary?: any
  } {
    return {
      connected: this.isConnected,
      listening: this.isListening,
      interviewComplete: this.conductor.isInterviewComplete(),
      summary: this.conductor.isInterviewComplete() ? this.conductor.getInterviewSummary() : undefined
    }
  }
}