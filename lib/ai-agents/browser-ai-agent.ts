/**
 * Browser-based Real AI Agent
 * Implements actual AI interviewer using browser APIs and OpenAI
 */

import { DeepDiveInterviewConductor } from './deepdive-conductor'
import { InterviewContext } from './deepdive-prompts'
import { OpenAITTS } from './openai-tts'
import { WebRTCVAD } from './webrtc-vad'

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export interface RealAIAgentConfig {
  interviewContext: InterviewContext
  onStateChange?: (state: string) => void
  onAIMessage?: (message: string) => void
  onInterviewComplete?: (summary: any) => void
  onError?: (error: string) => void
}

export class BrowserAIAgent {
  private conductor: DeepDiveInterviewConductor
  private speechRecognition: any
  private tts: OpenAITTS
  private vad: WebRTCVAD | null = null
  private microphoneStream: MediaStream | null = null
  private isActive: boolean = false
  private isListening: boolean = false
  private isSpeaking: boolean = false
  private config: RealAIAgentConfig
  private conversationStarted: boolean = false

  constructor(config: RealAIAgentConfig) {
    this.config = config
    
    console.log('🤖 BrowserAIAgent constructor called')
    console.log('🔧 Available env vars:', Object.keys(process.env).filter(key => key.includes('OPENAI')))
    
    // Initialize conductor and browser APIs
    this.conductor = new DeepDiveInterviewConductor(config.interviewContext)
    this.tts = new OpenAITTS()
    this.initializeSpeechRecognition()
    this.initializeVAD()
    
    console.log('✅ BrowserAIAgent initialized successfully')
  }

  private initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      this.config.onError?.('Speech recognition not supported in this browser')
      return
    }

    this.speechRecognition = new SpeechRecognition()
    this.speechRecognition.continuous = true
    this.speechRecognition.interimResults = true // Enable interim results for faster processing
    this.speechRecognition.lang = 'en-US'
    this.speechRecognition.maxAlternatives = 1

    this.speechRecognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1]
      const transcript = lastResult[0].transcript.trim()
      
      // Process final results immediately
      if (lastResult.isFinal) {
        if (transcript.length > 0 && !this.isSpeaking) {
          console.log('⚡ Final transcript received, processing immediately:', transcript)
          this.handleUserResponse(transcript)
        }
      } else if (transcript.length > 20) {
        // For long interim results that seem complete, process early
        console.log('⚡ Long interim result detected:', transcript)
      }
    }

    this.speechRecognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        this.config.onError?.('Microphone access denied. Please allow microphone access and try again.')
      }
    }

    this.speechRecognition.onend = () => {
      if (this.isActive && !this.tts.isSpeaking() && !this.conductor.isInterviewComplete()) {
        // Restart recognition if interview is still active
        setTimeout(async () => {
          await this.startListening()
        }, 500)
      }
    }
  }

  private async initializeVAD() {
    try {
      console.log('🎤 Initializing WebRTC VAD...')
      
      this.vad = new WebRTCVAD({
        onSpeechStart: () => {
          console.log('🟢 VAD: Speech started')
          // Could trigger visual feedback here
        },
        onSpeechEnd: () => {
          console.log('🔴 VAD: Speech ended - Processing faster!')
          // Trigger faster speech recognition processing
          if (this.speechRecognition && this.isListening) {
            // Force recognition to process current result
            this.speechRecognition.stop()
          }
        },
        onVoiceActivity: (probability) => {
          // Optional: Use for real-time voice activity visualization
          if (probability > 0.5) {
            console.log(`🎤 Voice activity: ${(probability * 100).toFixed(0)}%`)
          }
        }
      })

      console.log('✅ WebRTC VAD initialized')
      
    } catch (error) {
      console.error('❌ VAD initialization failed:', error)
      // VAD is optional, continue without it
      this.vad = null
    }
  }

  async startInterview(): Promise<void> {
    try {
      console.log('🤖 Real AI agent startInterview() called')
      
      if (this.isActive) {
        console.log('⚠️ Interview already active, ignoring duplicate start request')
        return
      }
      
      this.isActive = true
      this.config.onStateChange?.('starting')
      
      console.log('🤖 Real AI agent starting interview...')
      
      // Get opening message from AI conductor
      console.log('🔍 Getting opening message from conductor...')
      const openingMessage = await this.conductor.getOpeningMessage()
      console.log('📝 Opening message received:', openingMessage.substring(0, 50) + '...')
      
      // Speak the opening message
      console.log('🎤 Speaking opening message...')
      await this.speakMessage(openingMessage)
      
      this.conversationStarted = true
      this.config.onStateChange?.('active')
      
      // Start listening after opening
      setTimeout(async () => {
        await this.startListening()
      }, 1000)
      
    } catch (error: any) {
      console.error('Error starting interview:', error)
      this.config.onError?.(error.message || 'Failed to start AI interview')
    }
  }

  private async speakMessage(text: string): Promise<void> {
    try {
      this.isSpeaking = true
      this.stopListening() // Stop listening while AI speaks
      
      console.log('🤖 AI Speaking (OpenAI TTS):', text)
      this.config.onAIMessage?.(text)

      // Use OpenAI TTS for premium natural speech
      await this.tts.speak(text, {
        voice: 'nova', // Warm, natural female voice
        speed: 1.0
      })
      
      console.log('🤖 OpenAI TTS finished speaking')
      this.isSpeaking = false
      
    } catch (error: any) {
      this.isSpeaking = false
      console.error('Error in OpenAI TTS speakMessage:', error)
      throw error
    }
  }

  private async startListening(): Promise<void> {
    if (!this.speechRecognition || this.isListening || this.isSpeaking) {
      return
    }

    try {
      console.log('👂 AI starting to listen...')
      
      // Initialize VAD with microphone stream if not already done
      if (this.vad && !this.microphoneStream) {
        await this.initializeMicrophoneForVAD()
      }
      
      this.speechRecognition.start()
      this.isListening = true
      
      // Start VAD monitoring
      if (this.vad) {
        this.vad.start()
      }
      
    } catch (error) {
      console.error('Error starting speech recognition:', error)
    }
  }

  private async initializeMicrophoneForVAD(): Promise<void> {
    try {
      console.log('🎤 Getting microphone access for VAD...')
      
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      if (this.vad) {
        await this.vad.initialize(this.microphoneStream)
        console.log('✅ VAD microphone initialized')
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize microphone for VAD:', error)
      this.vad = null // Disable VAD if microphone fails
    }
  }

  private stopListening(): void {
    if (this.speechRecognition && this.isListening) {
      try {
        this.speechRecognition.stop()
        this.isListening = false
        console.log('👂 AI stopped listening')
        
        // Stop VAD monitoring
        if (this.vad) {
          this.vad.stop()
        }
      } catch (error) {
        console.error('Error stopping speech recognition:', error)
      }
    }
  }

  private async handleUserResponse(transcript: string): Promise<void> {
    try {
      console.log('👤 User said:', transcript)
      
      // Stop listening while processing
      this.stopListening()
      
      console.log('⚡ Processing response with AI conductor (optimized)...')
      const startTime = Date.now()
      
      // Process response with AI conductor
      const aiResponse = await this.conductor.processResponse(transcript)
      const processingTime = Date.now() - startTime
      console.log(`⚡ AI response generated in ${processingTime}ms`)
      
      // Start TTS immediately (parallel processing)
      console.log('🎤 Starting TTS generation...')
      const ttsStartTime = Date.now()
      await this.speakMessage(aiResponse)
      const ttsTime = Date.now() - ttsStartTime
      console.log(`🎤 TTS completed in ${ttsTime}ms`)
      
      // Check if interview is complete
      if (this.conductor.isInterviewComplete()) {
        await this.completeInterview()
      } else {
        // Continue listening for next response
        setTimeout(async () => {
          await this.startListening()
        }, 1000)
      }
      
    } catch (error: any) {
      console.error('Error processing user response:', error)
      
      // Try to recover with a standard response
      const recoveryMessage = await this.conductor.handleRecovery('technical')
      await this.speakMessage(recoveryMessage)
      
      // Resume listening
      setTimeout(async () => {
        await this.startListening()
      }, 1000)
    }
  }

  private async completeInterview(): Promise<void> {
    try {
      this.stopListening()
      
      const summary = this.conductor.getInterviewSummary()
      console.log('📊 Interview completed:', summary)
      
      // Final closing message
      const closingMessage = 'Thank you so much for your thoughtful feedback today. Your insights will be valuable for their professional growth. Have a wonderful day!'
      await this.speakMessage(closingMessage)
      
      this.config.onStateChange?.('completed')
      this.config.onInterviewComplete?.(summary)
      
      // Stop the agent
      this.stop()
      
    } catch (error: any) {
      console.error('Error completing interview:', error)
      this.config.onError?.(error.message)
    }
  }

  stop(): void {
    this.isActive = false
    this.stopListening()
    this.tts.stop()
    
    // Clean up VAD resources
    if (this.vad) {
      this.vad.destroy()
      this.vad = null
    }
    
    // Close microphone stream
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop())
      this.microphoneStream = null
    }
    
    console.log('🤖 AI agent stopped')
  }

  // Public methods for external control
  getCurrentStatus(): {
    isActive: boolean
    isListening: boolean
    isSpeaking: boolean
    conversationStarted: boolean
    interviewComplete: boolean
  } {
    return {
      isActive: this.isActive,
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      conversationStarted: this.conversationStarted,
      interviewComplete: this.conductor.isInterviewComplete()
    }
  }

  async forceNextQuestion(): Promise<void> {
    if (this.isActive && !this.isSpeaking) {
      const response = await this.conductor.processResponse('Could you move to the next question please?')
      await this.speakMessage(response)
    }
  }
}