'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Clock, Shield, Users, AlertTriangle, Calendar } from 'lucide-react'

interface InvitationLandingProps {
  invitation: any
  session: any
  requester: any
  isExpired: boolean
  token: string
}

export function InvitationLanding({ 
  invitation, 
  session, 
  requester, 
  isExpired, 
  token 
}: InvitationLandingProps) {
  const [isReady, setIsReady] = useState(false)

  const handleStartInterview = () => {
    // Update invitation status to 'started'
    fetch(`/api/invitations/${invitation.id}/start`, { method: 'POST' })
    
    // Redirect to interview
    window.location.href = `/interview/${token}`
  }

  const requesterName = requester?.full_name || requester?.email?.split('@')[0] || 'Unknown User'
  const sessionTitle = session.title
  const focusAreas = session.focus_topics || []
  const deadline = new Date(session.deadline).toLocaleDateString()
  const estimatedTime = "15-20 minutes"

  // Handle expired or inactive sessions
  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Session No Longer Available
              </h1>
              <p className="text-gray-600 mb-4">
                This feedback session has expired or been completed. Thank you for your interest in providing feedback.
              </p>
              <p className="text-sm text-gray-500">
                If you believe this is an error, please contact the person who sent you this invitation.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Handle completed invitation
  if (invitation.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Thank You!
              </h1>
              <p className="text-gray-600 mb-4">
                You have already completed your feedback for {requesterName}. Your input has been recorded and will help them grow professionally.
              </p>
              <p className="text-sm text-gray-500">
                Your responses remain completely anonymous and confidential.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            You've been invited to give feedback
          </h1>
          <p className="text-gray-600">
            Help {requesterName} grow by sharing your honest thoughts
          </p>
        </div>

        {/* Main Card */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Feedback Session: {sessionTitle}
            </CardTitle>
            <CardDescription>
              Your responses will be completely anonymous and confidential
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Session Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Feedback Recipient</div>
                <div className="text-lg text-gray-900">{requesterName}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Your Role</div>
                <div className="text-lg text-gray-900">{invitation.role || 'Colleague'}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Estimated Time
                </div>
                <div className="text-lg text-gray-900">{estimatedTime}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Due Date
                </div>
                <div className="text-lg text-gray-900">{deadline}</div>
              </div>
            </div>

            {/* Session Description */}
            {session.description && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Session Description</div>
                <div className="text-gray-700 p-3 bg-gray-50 rounded-md">
                  {session.description}
                </div>
              </div>
            )}

            {/* Focus Areas */}
            {focusAreas.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-500">Focus Areas</div>
                <div className="flex flex-wrap gap-2">
                  {focusAreas.map((area: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy Notice */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-medium text-green-900">Your Privacy is Protected</div>
                  <div className="text-sm text-green-700">
                    • Your identity remains completely anonymous<br/>
                    • Audio recordings are deleted immediately after transcription<br/>
                    • All responses are processed with advanced privacy protection<br/>
                    • Only anonymized insights are shared with the recipient
                  </div>
                </div>
              </div>
            </div>

            {/* What to Expect */}
            <div className="space-y-3">
              <div className="text-lg font-medium text-gray-900">What to Expect</div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <div>You'll join a private audio conversation with our AI interviewer</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <div>The AI will ask thoughtful questions about the focus areas</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <div>Speak naturally - the conversation flows like talking to a colleague</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                  <div>Your feedback is compiled into actionable insights for growth</div>
                </div>
              </div>
            </div>

            {/* Ready Check */}
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReady}
                  onChange={(e) => setIsReady(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  I'm ready to provide honest, constructive feedback to help {requesterName} grow
                </span>
              </label>
            </div>

            {/* Action Button */}
            <Button 
              onClick={handleStartInterview}
              disabled={!isReady}
              size="lg" 
              className="w-full text-lg py-6"
            >
              Start Audio Interview
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          Powered by Echo - Anonymous Feedback Platform
        </div>
      </div>
    </div>
  )
}