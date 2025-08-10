import { createRouteHandlerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const response = NextResponse.next()
  const supabase = createRouteHandlerClient(request, response)

  try {
    // Update invitation status to 'started'
    const { error } = await supabase
      .from('invitations')
      .update({ 
        status: 'started',
        started_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (error) {
      console.error('Error updating invitation status:', error)
      return NextResponse.json({ error: 'Failed to update invitation status' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Invitation status updated to started' })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}