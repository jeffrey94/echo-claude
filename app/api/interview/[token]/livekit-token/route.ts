import { createAdminClient } from '@/lib/supabase'
import { generateAccessToken, createInterviewRoom, generateParticipantName } from '@/lib/livekit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = createAdminClient()

  try {
    // Get invitation details using the token
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        id,
        session_id,
        email,
        status,
        sessions (
          id,
          title,
          status,
          deadline
        )
      `)
      .eq('token', params.token)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
    }

    const session = invitation.sessions as any

    // Check if session exists
    if (!session) {
      return NextResponse.json({ error: 'Session not found or has been deleted' }, { status: 404 })
    }

    // Validate invitation is still valid
    if (invitation.status === 'completed') {
      return NextResponse.json({ error: 'Interview already completed' }, { status: 400 })
    }

    if (invitation.status === 'expired') {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 })
    }

    // Check if session deadline has passed
    if (session.deadline && new Date(session.deadline) < new Date()) {
      return NextResponse.json({ error: 'Session deadline has passed' }, { status: 400 })
    }

    // Create or get existing LiveKit room
    const roomName = await createInterviewRoom(session.id, invitation.id)
    
    // Generate participant name and access token
    const participantName = generateParticipantName('human', invitation.id)
    const accessToken = generateAccessToken(
      roomName,
      participantName,
      {
        invitationId: invitation.id,
        sessionId: session.id,
        email: invitation.email,
        role: 'interviewee'
      }
    )

    // Update invitation status to 'started' if not already
    if (invitation.status === 'pending' || invitation.status === 'opened') {
      await supabase
        .from('invitations')
        .update({ 
          status: 'started',
          started_at: new Date().toISOString()
        })
        .eq('id', invitation.id)
    }

    // Create or update interview record
    const { data: existingInterview } = await supabase
      .from('interviews')
      .select('id')
      .eq('invitation_id', invitation.id)
      .single()

    if (!existingInterview) {
      await supabase
        .from('interviews')
        .insert({
          invitation_id: invitation.id,
          livekit_room_name: roomName,
          livekit_participant_token: accessToken,
          status: 'scheduled'
        })
    } else {
      await supabase
        .from('interviews')
        .update({
          livekit_room_name: roomName,
          livekit_participant_token: accessToken,
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('invitation_id', invitation.id)
    }

    return NextResponse.json({
      token: accessToken,
      roomName: roomName,
      participantName: participantName,
      serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL,
      sessionTitle: session.title,
      metadata: {
        invitationId: invitation.id,
        sessionId: session.id,
        interviewType: 'feedback_session'
      }
    })

  } catch (error: any) {
    console.error('LiveKit token generation error:', error)
    
    // Handle specific LiveKit errors
    if (error.message?.includes('credentials not configured')) {
      return NextResponse.json(
        { error: 'Audio service temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate audio session token' },
      { status: 500 }
    )
  }
}