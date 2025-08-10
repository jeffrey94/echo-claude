import { createRouteHandlerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const response = NextResponse.next()
  const supabase = createRouteHandlerClient(request, response)

  try {
    const body = await request.json()
    const { status, duration, completedAt } = body

    // Get invitation details using the token
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('id, session_id')
      .eq('token', params.token)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
    }

    // Update interview record
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'completed') {
      updateData.completed_at = completedAt || new Date().toISOString()
      updateData.duration_seconds = duration || 0
      
      // Update invitation status to completed
      await supabase
        .from('invitations')
        .update({ 
          status: 'completed',
          completed_at: completedAt || new Date().toISOString()
        })
        .eq('id', invitation.id)
    } else if (status === 'failed') {
      updateData.completed_at = completedAt || new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('interviews')
      .update(updateData)
      .eq('invitation_id', invitation.id)

    if (updateError) {
      console.error('Failed to update interview status:', updateError)
      return NextResponse.json({ error: 'Failed to update interview status' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Interview status updated successfully',
      status: status
    })

  } catch (error: any) {
    console.error('Interview status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}