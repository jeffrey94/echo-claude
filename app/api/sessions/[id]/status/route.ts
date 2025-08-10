import { createRouteHandlerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const response = NextResponse.next()
  const supabase = createRouteHandlerClient(request, response)

  // Check if user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = ['draft', 'active', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Check if session exists and belongs to user
    const { data: existingSession, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Validate status transitions
    const currentStatus = existingSession.status
    const invalidTransitions = [
      // Can't go back to draft from active/completed
      { from: 'active', to: 'draft' },
      { from: 'completed', to: 'draft' },
      { from: 'completed', to: 'active' },
      // Can't reactivate cancelled sessions
      { from: 'cancelled', to: 'active' },
      { from: 'cancelled', to: 'completed' }
    ]

    const isInvalidTransition = invalidTransitions.some(
      transition => transition.from === currentStatus && transition.to === status
    )

    if (isInvalidTransition) {
      return NextResponse.json(
        { error: `Cannot change status from ${currentStatus} to ${status}` },
        { status: 400 }
      )
    }

    // Additional validations for specific status changes
    if (status === 'active') {
      // Check if session has at least one focus topic
      if (!existingSession.focus_topics || existingSession.focus_topics.length === 0) {
        return NextResponse.json(
          { error: 'Session must have at least one focus topic to be activated' },
          { status: 400 }
        )
      }

      // Check if deadline is in the future
      if (new Date(existingSession.deadline) <= new Date()) {
        return NextResponse.json(
          { error: 'Cannot activate session with past deadline' },
          { status: 400 }
        )
      }
    }

    // Update session status
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating session status:', updateError)
      return NextResponse.json({ error: 'Failed to update session status' }, { status: 500 })
    }

    return NextResponse.json({ 
      session: updatedSession,
      message: `Session status updated to ${status}`
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}