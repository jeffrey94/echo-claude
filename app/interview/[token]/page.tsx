'use client'

import { useEffect, useState } from 'react'
import { AudioInterview } from '@/components/audio-interview'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface InterviewPageProps {
  params: {
    token: string
  }
}

interface LiveKitTokenData {
  token: string
  roomName: string
  participantName: string
  serverUrl: string
  sessionTitle: string
  metadata: {
    invitationId: string
    sessionId: string
    interviewType: string
  }
}

type PageState = 'loading' | 'ready' | 'in_interview' | 'completed' | 'error'

export default function InterviewPage({ params }: InterviewPageProps) {
  const [state, setState] = useState<PageState>('loading')
  const [livekitData, setLivekitData] = useState<LiveKitTokenData | null>(null)
  const [error, setError] = useState<string>('')
  const [interviewDuration, setInterviewDuration] = useState<number>(0)

  useEffect(() => {
    const initializeInterview = async () => {
      try {
        setState('loading')
        
        // Get LiveKit token for this interview
        const response = await fetch(`/api/interview/${params.token}/livekit-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to initialize interview')
        }

        const data = await response.json()
        setLivekitData(data)
        setState('ready')

      } catch (err: any) {
        console.error('Interview initialization error:', err)
        setError(err.message)
        setState('error')
      }
    }

    initializeInterview()
  }, [params.token])

  const handleStartInterview = () => {
    setState('in_interview')
  }

  const handleInterviewComplete = (duration: number) => {
    setInterviewDuration(duration)
    setState('completed')
    
    // TODO: Send completion notification to server
    updateInterviewStatus('completed', duration)
  }

  const handleInterviewError = (errorMessage: string) => {
    setError(errorMessage)
    setState('error')
    
    // TODO: Send error notification to server
    updateInterviewStatus('failed')
  }

  const updateInterviewStatus = async (status: string, duration?: number) => {
    try {
      await fetch(`/api/interview/${params.token}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          duration,
          completedAt: new Date().toISOString()
        }),
      })
    } catch (err) {
      console.error('Failed to update interview status:', err)
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins} minute${mins !== 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Preparing Interview
            </h2>
            <p className="text-gray-600">
              Setting up your audio session...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Unable to Start Interview
            </h2>
            <p className="text-gray-600 mb-4">
              {error}
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Try Again
              </Button>
              <Link href={`/invite/${params.token}`}>
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Invitation
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Completed state
  if (state === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-4 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Interview Completed!
            </h2>
            <p className="text-gray-600 mb-4">
              Thank you for providing your feedback. Your responses have been recorded and will help with professional growth.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
              <p className="text-sm text-green-700">
                Interview duration: {formatDuration(interviewDuration)}
              </p>
            </div>
            <p className="text-xs text-gray-500">
              Your responses remain completely anonymous and will be processed with privacy protection.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Ready to start interview
  if (state === 'ready' && livekitData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Ready to Start</CardTitle>
            <CardDescription>
              Your audio interview for "{livekitData.sessionTitle}"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Audio connection ready</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>AI interviewer standing by</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span>Privacy protection enabled</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-900 mb-2">Before you begin:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Ensure you're in a quiet environment</li>
                <li>• Speak clearly and naturally</li>
                <li>• The interview typically takes 15-20 minutes</li>
                <li>• You can end the interview at any time</li>
              </ul>
            </div>

            <Button 
              onClick={handleStartInterview}
              className="w-full text-lg py-6"
            >
              Start Audio Interview
            </Button>

            <Link href={`/invite/${params.token}`}>
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Invitation
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // In interview state
  if (state === 'in_interview' && livekitData) {
    return (
      <AudioInterview
        token={livekitData.token}
        roomName={livekitData.roomName}
        serverUrl={livekitData.serverUrl}
        participantName={livekitData.participantName}
        sessionTitle={livekitData.sessionTitle}
        onInterviewComplete={handleInterviewComplete}
        onInterviewError={handleInterviewError}
      />
    )
  }

  return null
}