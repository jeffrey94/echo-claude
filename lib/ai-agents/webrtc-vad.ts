/**
 * WebRTC Voice Activity Detection
 * Implements real-time VAD for faster speech detection
 */

export interface VADConfig {
  sampleRate?: number
  frameDuration?: number // ms
  mode?: 0 | 1 | 2 | 3 // 0=quality, 3=aggressive
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
  onVoiceActivity?: (probability: number) => void
}

export class WebRTCVAD {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private microphone: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private isActive: boolean = false
  private config: VADConfig
  
  // VAD state
  private isSpeaking: boolean = false
  private speechStartTime: number = 0
  private silenceStartTime: number = 0
  private speechProbabilityThreshold: number = 0.3
  private silenceTimeout: number = 1500 // ms
  private minSpeechDuration: number = 300 // ms

  constructor(config: VADConfig = {}) {
    this.config = {
      sampleRate: 16000,
      frameDuration: 30,
      mode: 2, // Balanced mode
      ...config
    }
  }

  async initialize(stream: MediaStream): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate
      })

      // Create analyser for real-time analysis
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 512
      this.analyser.smoothingTimeConstant = 0.3

      // Connect microphone
      this.microphone = this.audioContext.createMediaStreamSource(stream)
      
      // Create processor for real-time VAD
      this.processor = this.audioContext.createScriptProcessor(512, 1, 1)
      
      // Connect the chain: microphone -> analyser -> processor
      this.microphone.connect(this.analyser)
      this.analyser.connect(this.processor)
      this.processor.connect(this.audioContext.destination)

      // Set up real-time processing
      this.processor.onaudioprocess = (event) => {
        if (this.isActive) {
          this.processAudioFrame(event)
        }
      }

      console.log('✅ WebRTC VAD initialized')
      
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC VAD:', error)
      throw error
    }
  }

  private processAudioFrame(event: AudioProcessingEvent): void {
    const inputBuffer = event.inputBuffer
    const inputData = inputBuffer.getChannelData(0)
    
    // Calculate audio energy and spectral features
    const energy = this.calculateEnergy(inputData)
    const spectralCentroid = this.calculateSpectralCentroid()
    
    // Simple VAD algorithm based on energy and spectral features
    const voiceProbability = this.calculateVoiceProbability(energy, spectralCentroid)
    
    // Call voice activity callback
    this.config.onVoiceActivity?.(voiceProbability)
    
    // Determine speech state
    const currentTime = Date.now()
    
    if (voiceProbability > this.speechProbabilityThreshold) {
      // Voice detected
      if (!this.isSpeaking) {
        this.speechStartTime = currentTime
        this.isSpeaking = true
        console.log('🎤 Speech started (VAD)')
        this.config.onSpeechStart?.()
      }
      this.silenceStartTime = 0
    } else {
      // Silence detected
      if (this.isSpeaking) {
        if (this.silenceStartTime === 0) {
          this.silenceStartTime = currentTime
        } else if (currentTime - this.silenceStartTime > this.silenceTimeout) {
          // End of speech detected
          const speechDuration = currentTime - this.speechStartTime
          if (speechDuration > this.minSpeechDuration) {
            console.log(`🛑 Speech ended (VAD) - Duration: ${speechDuration}ms`)
            this.config.onSpeechEnd?.()
          }
          this.isSpeaking = false
          this.silenceStartTime = 0
        }
      }
    }
  }

  private calculateEnergy(samples: Float32Array): number {
    let sum = 0
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i]
    }
    return Math.sqrt(sum / samples.length)
  }

  private calculateSpectralCentroid(): number {
    if (!this.analyser) return 0
    
    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyser.getByteFrequencyData(dataArray)
    
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < bufferLength; i++) {
      const frequency = i * (this.config.sampleRate! / 2) / bufferLength
      const magnitude = dataArray[i]
      numerator += frequency * magnitude
      denominator += magnitude
    }
    
    return denominator > 0 ? numerator / denominator : 0
  }

  private calculateVoiceProbability(energy: number, spectralCentroid: number): number {
    // Simple voice detection algorithm
    // Voice typically has energy > threshold and spectral centroid in speech range
    
    const energyThreshold = 0.01
    const minVoiceFreq = 85 // Hz
    const maxVoiceFreq = 4000 // Hz
    
    let probability = 0
    
    // Energy component (0-0.5)
    if (energy > energyThreshold) {
      probability += Math.min(0.5, energy * 10)
    }
    
    // Spectral component (0-0.5)
    if (spectralCentroid >= minVoiceFreq && spectralCentroid <= maxVoiceFreq) {
      probability += 0.5
    }
    
    return Math.min(1.0, probability)
  }

  start(): void {
    this.isActive = true
    console.log('🟢 WebRTC VAD started')
  }

  stop(): void {
    this.isActive = false
    this.isSpeaking = false
    console.log('🔴 WebRTC VAD stopped')
  }

  getCurrentState(): {
    isSpeaking: boolean
    isActive: boolean
    speechDuration: number
  } {
    return {
      isSpeaking: this.isSpeaking,
      isActive: this.isActive,
      speechDuration: this.isSpeaking ? Date.now() - this.speechStartTime : 0
    }
  }

  destroy(): void {
    this.stop()
    
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }
    
    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }
    
    if (this.microphone) {
      this.microphone.disconnect()
      this.microphone = null
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }
    
    console.log('🗑️ WebRTC VAD destroyed')
  }
}