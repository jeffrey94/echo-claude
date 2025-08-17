'use client'

import { useEffect, useState, useRef } from 'react'
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, Track } from 'livekit-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Phone, 
  PhoneOff, 
  Clock,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { ProductionAIAgent, AIAgentState } from '@/lib/ai-agents/production-ai-agent'
import { InterviewContext } from '@/lib/ai-agents/deepdive-prompts'
import { ChatGPTVoiceVisual } from '@/components/ui/chatgpt-voice-visual'

interface AudioInterviewProps {
  token: string
  roomName: string
  serverUrl: string
  participantName: string
  sessionTitle: string
  onInterviewComplete?: (duration: number) => void
  onInterviewError?: (error: string) => void
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed'
type InterviewState = 'preparing' | 'waiting_for_ai' | 'in_progress' | 'completed' | 'error'

export function AudioInterview({
  token,
  roomName,
  serverUrl,
  participantName,
  sessionTitle,
  onInterviewComplete,
  onInterviewError
}: AudioInterviewProps) {
  const [room] = useState(() => new Room())
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [interviewState, setInterviewState] = useState<InterviewState>('preparing')
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isAudioOutputEnabled, setIsAudioOutputEnabled] = useState(true)
  const [participants, setParticipants] = useState<RemoteParticipant[]>([])
  const [duration, setDuration] = useState(0)
  const [aiStatus, setAiStatus] = useState<'connecting' | 'connected' | 'speaking' | 'listening'>('connecting')
  const [error, setError] = useState<string>('')
  const [productionAIAgent, setProductionAIAgent] = useState<ProductionAIAgent | null>(null)
  const [aiMessages, setAiMessages] = useState<string[]>([])
  const [showRealAI, setShowRealAI] = useState<boolean>(false)
  const [isStartingAI, setIsStartingAI] = useState<boolean>(false)
  const [aiAgentState, setAiAgentState] = useState<AIAgentState>('idle')

  const startTimeRef = useRef<Date>()
  const intervalRef = useRef<NodeJS.Timeout>()

  // Timer effect
  useEffect(() => {
    if (interviewState === 'in_progress') {
      startTimeRef.current = new Date()
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setDuration(Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000))
        }
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [interviewState])

  // LiveKit room connection and event handling
  useEffect(() => {
    let isMounted = true
    let connectionAttempted = false
    
    const setupRoom = async () => {
      if (connectionAttempted || !isMounted) return
      connectionAttempted = true
      try {
        // Set up event listeners
        room.on(RoomEvent.Connected, () => {
          console.log('Connected to room')
          setConnectionState('connected')
          setInterviewState('waiting_for_ai')
          
          // Trigger AI agent to join the room
          startAIAgent()
        })

        room.on(RoomEvent.Disconnected, (reason) => {
          console.log('Disconnected from room:', reason)
          setConnectionState('disconnected')
          if (interviewState === 'in_progress') {
            setInterviewState('error')
            setError('Connection lost during interview')
          }
        })

        room.on(RoomEvent.Reconnecting, () => {
          console.log('Reconnecting to room')
          setConnectionState('reconnecting')
        })

        room.on(RoomEvent.Reconnected, () => {
          console.log('Reconnected to room')
          setConnectionState('connected')
        })

        room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          console.log('Participant connected:', participant.identity)
          setParticipants(prev => [...prev, participant])
          
          // Check if AI interviewer joined
          if (participant.identity === 'echo-ai-interviewer') {
            setAiStatus('connected')
            setInterviewState('in_progress')
          }
        })

        room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          console.log('Participant disconnected:', participant.identity)
          setParticipants(prev => prev.filter(p => p.identity !== participant.identity))
          
          if (participant.identity === 'echo-ai-interviewer') {
            setAiStatus('connecting')
            if (interviewState === 'in_progress') {
              handleInterviewComplete()
            }
          }
        })

        room.on(RoomEvent.TrackSubscribed, (track: Track, publication, participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            console.log('Audio track subscribed from:', participant.identity)
            // Attach audio track to audio element
            const audioElement = document.getElementById('remote-audio') as HTMLAudioElement
            if (audioElement) {
              track.attach(audioElement)
              audioElement.play()
            }
          }
        })

        room.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
          if (track.kind === Track.Kind.Audio) {
            track.detach()
          }
        })

        // Connect to the room
        await room.connect(serverUrl, token)
        
        // Enable audio by default
        await room.localParticipant.setMicrophoneEnabled(true)

      } catch (err: any) {
        console.error('Failed to connect to room:', err)
        setConnectionState('failed')
        setInterviewState('error')
        setError(err.message || 'Failed to connect to interview session')
        onInterviewError?.(err.message || 'Connection failed')
      } finally {
        connectionAttempted = false
      }
    }

    setupRoom()

    // Cleanup
    return () => {
      isMounted = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (productionAIAgent) {
        productionAIAgent.stop()
      }
      room.disconnect()
    }
  }, [token, serverUrl, room, onInterviewError])

  const toggleAudio = async () => {
    try {
      const enabled = !isAudioEnabled
      await room.localParticipant.setMicrophoneEnabled(enabled)
      setIsAudioEnabled(enabled)
    } catch (err) {
      console.error('Failed to toggle audio:', err)
    }
  }

  const toggleAudioOutput = () => {
    const audioElement = document.getElementById('remote-audio') as HTMLAudioElement
    if (audioElement) {
      audioElement.muted = isAudioOutputEnabled
      setIsAudioOutputEnabled(!isAudioOutputEnabled)
    }
  }

  const startAIAgent = async () => {
    try {
      console.log('Starting AI agent for interview...')
      
      // Extract token from room name or use a different method to get token
      // For now, we'll create a simple method to trigger AI agent
      const roomNameParts = roomName.split('-')
      if (roomNameParts.length >= 3) {
        const sessionId = roomNameParts[1]
        const invitationId = roomNameParts[2]
        
        // In a real implementation, we would:
        // 1. Call API to start AI agent
        // 2. AI agent would connect to same room
        // 3. AI agent would begin interview
        
        console.log('AI agent connection would be triggered for:', {
          sessionId,
          invitationId,
          roomName
        })
        
        // For now, simulate AI agent joining after a delay
        setTimeout(() => {
          console.log('Simulating AI agent connection...')
          // This would normally be handled by the actual AI agent joining
          // setInterviewState('in_progress')
        }, 3000)
      }
      
    } catch (error) {
      console.error('Failed to start AI agent:', error)
      setError('Failed to start AI interviewer')
      setInterviewState('error')
    }
  }

  const simulateAIAgent = () => {
    try {
      console.log('🧪 Simulating AI agent for Phase 6 testing...')
      console.log('🔧 Current interview state:', interviewState)
      console.log('🔧 Current AI status:', aiStatus)
      
      // Update AI status to show it's working
      setAiStatus('connected')
      setInterviewState('in_progress')
      console.log('🔧 Updated states - AI: connected, Interview: in_progress')
      
      // Simulate AI agent joining and starting interview
      setTimeout(() => {
        console.log('✅ Simulated AI agent joined - Interview started!')
        
        // Simulate AI opening message (in real implementation, this would be actual TTS)
        setTimeout(() => {
          console.log('🤖 AI: Hello! I\'m Alex, your AI interviewer. Thank you for participating in this feedback session.')
          console.log('🤖 AI: This conversation will take about 15-20 minutes, and your responses will remain completely anonymous.')
          
          // Simulate first question after opening
          setTimeout(() => {
            console.log('🤖 AI: Let\'s begin with the first question: How would you describe their communication style in team meetings?')
            
            // Continue with more questions
            setTimeout(() => {
              console.log('🤖 AI: (Waiting for your response... In a real implementation, speech recognition would capture your answer)')
            }, 3000)
          }, 2000)
        }, 1000)
        
      }, 1000)
    } catch (error) {
      console.error('❌ Error in simulateAIAgent:', error)
    }
  }


  // PRODUCTION AI Agent - LiveKit-Optimized with Ultra-Fast VAD
  const startProductionAIAgent = async () => {
    try {
      setIsStartingAI(true)
      setError('')
      
      // Stop any existing agents
      if (productionAIAgent) {
        productionAIAgent.stop()
        setProductionAIAgent(null)
      }
      
      console.log('🚀 Starting PRODUCTION AI with LiveKit-optimized VAD...')
      setShowRealAI(true)
      
      // Create interview context
      const interviewContext: InterviewContext = {
        sessionTitle: sessionTitle,
        focusTopics: ['communication', 'leadership', 'teamwork'],
        customQuestions: [
          'How would you describe their communication style in team meetings?',
          'What areas would you suggest they focus on for professional growth?',
          'Can you share a specific example of their leadership abilities?'
        ],
        generatedQuestions: [
          'How effectively do they collaborate with cross-functional teams?',
          'What is their approach to handling challenging situations?'
        ],
        participantRole: 'colleague',
        timeRemaining: 20
      }

      // Initialize production AI agent
      const aiAgent = new ProductionAIAgent({
        interviewContext,
        onStateChange: (state) => {
          console.log('🚀 Production AI State:', state)
          setAiAgentState(state)
          if (state === 'listening' && aiAgentState === 'connecting') {
            setAiStatus('connected')
            setInterviewState('in_progress')
          }
        },
        onAIMessage: (message) => {
          console.log('🚀 Production AI Message:', message)
          setAiMessages(prev => [...prev, message])
        },
        onInterviewComplete: (summary) => {
          console.log('📊 Production Interview completed:', summary)
          setInterviewState('completed')
          onInterviewComplete?.(summary.duration)
        },
        onError: (error) => {
          console.error('❌ Production AI Error:', error)
          setError(error)
          setInterviewState('error')
        }
      })

      setProductionAIAgent(aiAgent)
      
      // Start the production interview
      await aiAgent.startInterview()
      
      console.log('✅ Production AI interviewer started successfully')
      
    } catch (error: any) {
      console.error('❌ Error starting Production AI agent:', error)
      setError(error.message || 'Failed to start Production AI interviewer')
      setInterviewState('error')
    } finally {
      setIsStartingAI(false)
    }
  }

  const handleInterviewComplete = () => {
    setInterviewState('completed')
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    onInterviewComplete?.(duration)
    
    // Disconnect after a short delay
    setTimeout(() => {
      room.disconnect()
    }, 2000)
  }

  const handleEndInterview = () => {
    handleInterviewComplete()
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getConnectionIcon = () => {
    switch (connectionState) {
      case 'connected': return <Wifi className="h-4 w-4 text-green-600" />
      case 'connecting':
      case 'reconnecting': return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
      case 'disconnected':
      case 'failed': return <WifiOff className="h-4 w-4 text-red-600" />
      default: return <Wifi className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusMessage = () => {
    switch (interviewState) {
      case 'preparing': return 'Preparing interview session...'
      case 'waiting_for_ai': return 'Waiting for AI interviewer to join...'
      case 'in_progress': return 'Interview in progress'
      case 'completed': return 'Interview completed successfully'
      case 'error': return error || 'An error occurred'
      default: return 'Unknown status'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Audio Interview</h1>
          <p className="text-gray-600">{sessionTitle}</p>
        </div>

        {/* Main Interview Interface */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getConnectionIcon()}
                  {connectionState === 'connected' ? 'Connected' : 'Connecting...'}
                </CardTitle>
                <CardDescription>{getStatusMessage()}</CardDescription>
              </div>
              {interviewState === 'in_progress' && (
                <div className="flex items-center gap-2 text-lg font-mono">
                  <Clock className="h-5 w-5 text-blue-600" />
                  {formatDuration(duration)}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ChatGPT-style Voice Visualization - Always visible, reacts to actual audio */}
            <div className="flex justify-center py-8">
              <ChatGPTVoiceVisual 
                className="mx-auto" 
                forceActive={aiAgentState === 'speaking'}
              />
            </div>
            {/* Error Display */}
            {interviewState === 'error' && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Interview Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Success Display */}
            {interviewState === 'completed' && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Interview Completed</p>
                  <p className="text-sm text-green-700">
                    Thank you for your feedback! Duration: {formatDuration(duration)}
                  </p>
                </div>
              </div>
            )}

            {/* AI Start Button - Only show when waiting for AI and not started yet */}
            {interviewState === 'waiting_for_ai' && aiStatus === 'connecting' && !showRealAI && (
              <div className="text-center">
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    startProductionAIAgent()
                  }}
                  disabled={isStartingAI}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 font-medium px-8 py-3 text-lg"
                  size="lg"
                >
                  {isStartingAI ? '🔄 Starting AI Interviewer...' : '🎤 Start AI Interview'}
                </Button>
              </div>
            )}

            {/* Audio Controls */}
            {(interviewState === 'in_progress' || interviewState === 'waiting_for_ai') && (
              <div className="flex justify-center gap-4">
                <Button
                  variant={isAudioEnabled ? "default" : "destructive"}
                  onClick={toggleAudio}
                  className="flex items-center gap-2"
                >
                  {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  {isAudioEnabled ? 'Mute' : 'Unmute'}
                </Button>

                <Button
                  variant={isAudioOutputEnabled ? "default" : "outline"}
                  onClick={toggleAudioOutput}
                  className="flex items-center gap-2"
                >
                  {isAudioOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  Audio
                </Button>

                <Button
                  variant="destructive"
                  onClick={handleEndInterview}
                  className="flex items-center gap-2"
                >
                  <PhoneOff className="h-4 w-4" />
                  End Interview
                </Button>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Real AI Messages Display */}
        {showRealAI && aiMessages.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                🤖 AI Interviewer Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {aiMessages.map((message, index) => (
                  <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-900">{message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hidden audio element for remote audio */}
        <audio id="remote-audio" autoPlay playsInline />
      </div>
    </div>
  )
}