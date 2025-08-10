/**
 * Start AI Agent API - Spawns AI interviewer for a specific interview token
 */

import { createRouteHandlerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { InterviewContext } from '@/lib/ai-agents/deepdive-prompts'

// Store active AI agents (in production, use Redis or database)
const activeAgents = new Map<string, any>()

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const response = NextResponse.next()
  const supabase = createRouteHandlerClient(request, response)

  try {
    // Get invitation and session details
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        id,
        session_id,
        email,
        name,
        role,
        status,
        sessions (
          id,
          title,
          status,
          deadline,
          focus_topics,
          custom_questions,
          generated_questions
        )
      `)
      .eq('token', params.token)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
    }

    const session = invitation.sessions as any
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if AI agent is already active for this interview
    const agentKey = `${session.id}-${invitation.id}`
    if (activeAgents.has(agentKey)) {
      return NextResponse.json({ 
        message: 'AI interviewer already active',
        status: 'active'
      })
    }

    // Create interview context for AI agent
    const interviewContext: InterviewContext = {
      sessionTitle: session.title,
      focusTopics: session.focus_topics || [],
      customQuestions: session.custom_questions || [],
      generatedQuestions: session.generated_questions || [],
      participantRole: invitation.role,
      intervieweeRelationship: 'colleague', // Could be derived from invitation metadata
      timeRemaining: 20 // Start with 20 minute limit
    }

    // For now, return instructions for manual AI agent setup
    // In production, this would spawn a server-side AI agent process
    const roomName = `interview-${session.id}-${invitation.id}`
    
    return NextResponse.json({
      message: 'AI interviewer instructions generated',
      roomName,
      interviewContext,
      instructions: {
        serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL,
        aiParticipantName: 'echo-ai-interviewer',
        estimatedDuration: '15-20 minutes',
        questionsCount: interviewContext.customQuestions.length + interviewContext.generatedQuestions.length
      },
      // This would be the actual AI agent instance in production
      agentStatus: 'ready_to_connect'
    })

  } catch (error: any) {
    console.error('Error starting AI agent:', error)
    return NextResponse.json(
      { error: 'Failed to start AI interviewer' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  // Get AI agent status for this interview
  try {
    const response = NextResponse.next()
    const supabase = createRouteHandlerClient(request, response)

    // Get invitation details
    const { data: invitation } = await supabase
      .from('invitations')
      .select('id, session_id')
      .eq('token', params.token)
      .single()

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    const agentKey = `${invitation.session_id}-${invitation.id}`
    const agent = activeAgents.get(agentKey)

    return NextResponse.json({
      agentActive: !!agent,
      status: agent?.getStatus?.() || 'not_started',
      roomName: `interview-${invitation.session_id}-${invitation.id}`
    })

  } catch (error) {
    console.error('Error getting AI agent status:', error)
    return NextResponse.json(
      { error: 'Failed to get AI agent status' },
      { status: 500 }
    )
  }
}