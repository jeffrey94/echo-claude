/**
 * Production AI Agent with LiveKit-Optimized VAD
 * Implements real-time conversation with instant interruption capabilities
 * Based on LiveKit's proven architecture and best practices
 */

import { InterviewContext } from './deepdive-prompts'
import { DeepDiveInterviewConductor } from './deepdive-conductor'
import { OpenAITTS } from './openai-tts'
import { OptimizedVAD } from './optimized-vad'

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export type AIAgentState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking'

export interface ProductionAIConfig {
  interviewContext: InterviewContext
  onStateChange?: (state: AIAgentState) => void
  onAIMessage?: (message: string) => void
  onInterviewComplete?: (summary: any) => void
  onError?: (error: string) => void
}

export class ProductionAIAgent {
  private config: ProductionAIConfig
  private conductor: DeepDiveInterviewConductor
  private vad: OptimizedVAD | null = null
  private tts: OpenAITTS
  private speechRecognition: any
  private microphoneStream: MediaStream | null = null
  
  // Agent State
  private isActive: boolean = false
  private isListening: boolean = false
  private isSpeaking: boolean = false
  private conversationStarted: boolean = false
  private isProcessingResponse: boolean = false
  private lastProcessedTranscript: string = ''
  private responseDebounceTimer: number | null = null
  private currentState: AIAgentState = 'idle'
  
  // Performance Tracking
  private metrics = {
    responseTime: 0,
    interruptionLatency: 0,
    speechDetectionLatency: 0
  }

  constructor(config: ProductionAIConfig) {
    this.config = config
    console.log('🚀 ProductionAIAgent: Initializing with LiveKit-optimized architecture')
    
    // Initialize AI conductor with proper prompts and OpenAI integration
    this.conductor = new DeepDiveInterviewConductor(config.interviewContext)
    console.log('🤖 AI Conductor initialized with professional interview prompts')
    
    // Initialize components
    this.tts = new OpenAITTS()
    this.initializeSpeechRecognition()
    this.initializeOptimizedVAD()
    
    console.log('✅ ProductionAIAgent: Ready for high-performance conversations with real AI')
  }

  private updateState(newState: AIAgentState): void {
    if (this.currentState !== newState) {
      this.currentState = newState
      console.log(`🔄 AI State: ${newState}`)
      this.config.onStateChange?.(newState)
    }
  }

  // Public method to force reset processing state if stuck
  public resetProcessingState(): void {
    console.log('🔄 Force resetting processing state')
    this.isProcessingResponse = false
    this.updateState('idle')
    if (!this.isListening && !this.isSpeaking) {
      this.startListening()
    }
  }

  private initializeSpeechRecognition(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      this.config.onError?.('Speech recognition not supported in this browser')
      return
    }

    this.speechRecognition = new SpeechRecognition()
    
    // Production-optimized speech recognition settings
    this.speechRecognition.continuous = true
    this.speechRecognition.interimResults = true
    this.speechRecognition.lang = 'en-US'
    this.speechRecognition.maxAlternatives = 1  // Focus on best result for speed
    
    // Chrome-specific optimizations for real-time performance
    if ('webkitSpeechRecognition' in window) {
      this.speechRecognition.webkitServiceURI = 'https://www.google.com/speech-api/v2/recognize'
    }

    this.speechRecognition.onresult = (event: any) => {
      const speechDetectionStart = Date.now()
      const lastResult = event.results[event.results.length - 1]
      const transcript = lastResult[0].transcript.trim()
      
      // LiveKit-inspired instant interruption: ANY speech stops AI immediately
      if (transcript.length > 0 && this.isSpeaking) {
        const interruptLatency = Date.now() - speechDetectionStart
        this.metrics.interruptionLatency = interruptLatency
        
        console.log(`🛑 INSTANT INTERRUPTION: "${transcript}" (${interruptLatency}ms latency)`)
        this.forceStopAISpeech()
        return
      }
      
      // Process final results for conversation with deduplication
      if (lastResult.isFinal && transcript.length > 0 && !this.isSpeaking) {
        console.log('✅ Final transcript received:', transcript)
        this.handleUserResponseDebounced(transcript)
      }
    }

    this.speechRecognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        this.config.onError?.('Microphone access denied')
      } else if (event.error === 'no-speech') {
        // Ignore no-speech errors in continuous mode
        console.log('No speech detected, continuing...')
      }
    }

    this.speechRecognition.onend = () => {
      // Auto-restart for continuous listening (LiveKit pattern)
      if (this.isActive && !this.isSpeaking) {
        setTimeout(() => {
          this.startListening()
        }, 100) // Fast restart
      }
    }
  }

  private initializeOptimizedVAD(): void {
    this.vad = new OptimizedVAD({
      // LiveKit-optimized settings for natural conversation
      minSpeechDuration: 50,     // Very responsive
      minSilenceDuration: 550,   // Natural pause tolerance
      activationThreshold: 0.45, // Slightly more sensitive than default
      updateInterval: 16,        // 60 FPS for ultra-smooth detection
      
      onSpeechStart: () => {
        console.log('🎤 VAD: Speech started - IMMEDIATE ACTION')
        if (this.isSpeaking) {
          console.log('⚡ VAD INTERRUPTION: Stopping AI speech instantly!')
          this.forceStopAISpeech()
        }
      },
      
      onSpeechEnd: () => {
        console.log('🎤 VAD: Speech ended')
        // Could trigger faster speech recognition processing here
      },
      
      onVoiceActivity: (probability, energy) => {
        // Real-time interruption on any significant voice activity
        if (probability > 0.6 && this.isSpeaking) {
          console.log(`🎤 HIGH VOICE ACTIVITY: ${(probability * 100).toFixed(0)}% - INTERRUPTING!`)
          this.forceStopAISpeech()
        }
      }
    })
  }

  async startInterview(): Promise<void> {
    try {
      console.log('🎬 ProductionAIAgent: Starting interview...')
      
      if (this.isActive) {
        console.log('⚠️ Interview already active')
        return
      }
      
      this.isActive = true
      this.updateState('connecting')
      
      // Initialize microphone and VAD
      await this.initializeMicrophone()
      
      // Start real-time voice activity monitoring
      if (this.vad) {
        this.vad.start()
      }
      
      // Generate and speak opening message using real AI conductor
      console.log('🤖 Getting opening message from AI conductor...')
      const openingMessage = await this.conductor.getOpeningMessage()
      console.log('📝 AI Conductor generated opening:', openingMessage.substring(0, 50) + '...')
      
      await this.speakMessage(openingMessage)
      
      this.conversationStarted = true
      this.updateState('idle')
      
      // Start listening immediately after opening (optimized timing)
      setTimeout(() => {
        this.startListening()
      }, 200)
      
    } catch (error: any) {
      console.error('❌ Error starting interview:', error)
      this.config.onError?.(error.message || 'Failed to start interview')
    }
  }

  private async initializeMicrophone(): Promise<void> {
    try {
      console.log('🎤 Initializing microphone with production-quality settings...')
      
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Production-quality audio settings (LiveKit standards)
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          
          // Advanced settings for meeting-quality audio
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          googHighpassFilter: true,
          googTypingNoiseDetection: true
        } as any
      })
      
      // Initialize VAD with microphone stream
      if (this.vad) {
        await this.vad.initialize(this.microphoneStream)
      }
      
      console.log('✅ Microphone initialized with production settings')
      
    } catch (error) {
      console.error('❌ Failed to initialize microphone:', error)
      throw new Error('Microphone access required for interview')
    }
  }

  private async speakMessage(text: string): Promise<void> {
    try {
      this.isSpeaking = true
      this.updateState('speaking')
      this.stopListening() // Stop listening while AI speaks
      
      console.log('🤖 AI Speaking:', text.substring(0, 50) + '...')
      this.config.onAIMessage?.(text)

      const ttsStart = Date.now()
      
      // Use optimized TTS settings for natural conversation
      await this.tts.speak(text, {
        voice: 'nova',              // Warm, natural voice
        speed: 0.95,               // Slightly slower for clarity
        model: 'tts-1-hd',         // High-definition model
        response_format: 'mp3',    // Optimized format
        temperature: 0.7           // Natural variation
      })
      
      const ttsTime = Date.now() - ttsStart
      console.log(`🎤 TTS completed in ${ttsTime}ms`)
      
      this.isSpeaking = false
      this.updateState('idle')
      
    } catch (error: any) {
      this.isSpeaking = false
      this.updateState('idle')
      console.error('❌ Error in TTS:', error)
      throw error
    }
  }


  private forceStopAISpeech(): void {
    if (this.isSpeaking) {
      console.log('🛑 FORCE STOPPING AI SPEECH - IMMEDIATE!')
      
      // Multi-method stopping for guaranteed interruption
      this.tts.forceStop?.()
      this.tts.stop()
      
      // Stop any browser TTS as fallback
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      
      this.isSpeaking = false
      this.isProcessingResponse = false  // Clear processing flag when interrupted
      
      // Immediately restart listening (LiveKit pattern)
      setTimeout(() => {
        if (!this.isSpeaking) {
          this.startListening()
        }
      }, 50) // Ultra-fast restart
    }
  }

  private async startListening(): Promise<void> {
    if (!this.speechRecognition || this.isListening || this.isSpeaking) {
      return
    }

    try {
      console.log('👂 Starting optimized listening...')
      this.speechRecognition.start()
      this.isListening = true
      this.updateState('listening')
      
    } catch (error) {
      console.error('❌ Error starting speech recognition:', error)
      // Retry after short delay
      setTimeout(() => {
        if (this.isActive && !this.isListening && !this.isSpeaking) {
          this.startListening()
        }
      }, 500)
    }
  }

  private stopListening(): void {
    if (this.speechRecognition && this.isListening) {
      try {
        this.speechRecognition.stop()
        this.isListening = false
        console.log('👂 Stopped listening')
        if (!this.isSpeaking && !this.isProcessingResponse) {
          this.updateState('idle')
        }
      } catch (error) {
        console.error('❌ Error stopping speech recognition:', error)
      }
    }
  }

  private handleUserResponseDebounced(transcript: string): void {
    // Clear any existing debounce timer
    if (this.responseDebounceTimer) {
      clearTimeout(this.responseDebounceTimer)
    }
    
    // Deduplicate identical transcripts
    if (transcript === this.lastProcessedTranscript) {
      console.log('🚫 Duplicate transcript ignored:', transcript)
      return
    }
    
    // Prevent multiple simultaneous processing
    if (this.isProcessingResponse) {
      console.log('🚫 Already processing response, ignoring:', transcript)
      return
    }
    
    // Debounce rapid fire events (200ms window)
    this.responseDebounceTimer = window.setTimeout(() => {
      // Double-check processing state before proceeding
      if (!this.isProcessingResponse) {
        this.handleUserResponse(transcript)
      }
      this.responseDebounceTimer = null
    }, 200)
  }

  private async handleUserResponse(transcript: string): Promise<void> {
    // Safety timeout to reset processing flag if stuck (30 seconds)
    let safetyTimeout: NodeJS.Timeout | null = null
    
    try {
      // Set processing flag to prevent duplicates
      this.isProcessingResponse = true
      this.lastProcessedTranscript = transcript
      this.updateState('processing')
      
      safetyTimeout = setTimeout(() => {
        console.log('⚠️ Processing timeout - resetting flag')
        this.isProcessingResponse = false
      }, 30000)
      
      const responseStart = Date.now()
      console.log('👤 User said:', transcript)
      
      // Stop listening while processing
      this.stopListening()
      
      // Production-optimized response generation
      const aiResponse = await this.generateAIResponse(transcript)
      
      const responseTime = Date.now() - responseStart
      this.metrics.responseTime = responseTime
      console.log(`⚡ AI response generated in ${responseTime}ms`)
      
      // Speak the response
      await this.speakMessage(aiResponse)
      
      // Continue conversation (optimized timing)
      setTimeout(() => {
        this.startListening()
      }, 300)
      
    } catch (error: any) {
      console.error('❌ Error processing user response:', error)
      
      // Graceful error recovery
      const recoveryMessage = "I'm sorry, I didn't catch that. Could you please repeat your response?"
      await this.speakMessage(recoveryMessage)
      
      setTimeout(() => {
        this.startListening()
      }, 300)
    } finally {
      // Clear safety timeout and reset processing flag
      if (safetyTimeout) {
        clearTimeout(safetyTimeout)
      }
      this.isProcessingResponse = false
      if (!this.isSpeaking && !this.isListening) {
        this.updateState('idle')
      }
    }
  }


  private async generateAIResponse(userInput: string): Promise<string> {
    try {
      console.log('🤖 Processing response with AI conductor...')
      const startTime = Date.now()
      
      // Use the real AI conductor to process the response and generate next question/response
      const aiResponse = await this.conductor.processResponse(userInput)
      
      const processingTime = Date.now() - startTime
      console.log(`⚡ AI Conductor response generated in ${processingTime}ms`)
      console.log('🤖 AI Response:', aiResponse.substring(0, 100) + '...')
      
      // Check if interview should be completed
      if (this.conductor.isInterviewComplete()) {
        console.log('📊 Interview marked as complete by conductor')
        setTimeout(() => {
          const summary = this.conductor.getInterviewSummary()
          this.config.onInterviewComplete?.(summary)
        }, 1000)
      }
      
      return aiResponse
      
    } catch (error: any) {
      console.error('❌ Error in AI conductor:', error)
      
      // Fallback to recovery response
      return await this.conductor.handleRecovery('technical')
    }
  }

  stop(): void {
    console.log('🛑 Stopping ProductionAIAgent')
    
    this.isActive = false
    this.stopListening()
    if (this.vad) {
      this.vad.stop()
    }
    this.tts.stop()
    
    // Clean up microphone
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop())
      this.microphoneStream = null
    }
    
    // Clean up VAD
    if (this.vad) {
      this.vad.destroy()
    }
    
    this.updateState('idle')
    
    console.log('📊 Final metrics:', this.metrics)
  }

  // Public methods for external control
  getCurrentStatus(): {
    isActive: boolean
    isListening: boolean
    isSpeaking: boolean
    conversationStarted: boolean
    metrics: { responseTime: number; interruptionLatency: number; speechDetectionLatency: number }
    vadState: any
  } {
    return {
      isActive: this.isActive,
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      conversationStarted: this.conversationStarted,
      metrics: this.metrics,
      vadState: this.vad?.getCurrentState() || null
    }
  }

  async forceNextQuestion(): Promise<void> {
    if (this.isActive && !this.isSpeaking) {
      const response = await this.generateAIResponse('Could you move to the next question please?')
      await this.speakMessage(response)
    }
  }

  // Update VAD sensitivity on the fly
  updateVADSensitivity(threshold: number): void {
    if (this.vad) {
      this.vad.updateConfig({ activationThreshold: threshold })
      console.log('🔧 VAD sensitivity updated to:', threshold)
    }
  }
}