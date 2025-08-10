import { createRouteHandlerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
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
    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Fetch invitations
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('session_id', params.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
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
    const { invitations } = body

    if (!invitations || !Array.isArray(invitations) || invitations.length === 0) {
      return NextResponse.json({ error: 'Invalid invitations data' }, { status: 400 })
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Validate invitation data
    const validInvitations = []
    const errors = []

    for (let i = 0; i < invitations.length; i++) {
      const inv = invitations[i]
      
      if (!inv.email || typeof inv.email !== 'string') {
        errors.push(`Invitation ${i + 1}: Email is required`)
        continue
      }

      const email = inv.email.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Invitation ${i + 1}: Invalid email format`)
        continue
      }

      validInvitations.push({
        session_id: params.id,
        email: email,
        name: inv.name?.trim() || null,
        role: inv.role?.trim() || null,
        department: inv.department?.trim() || null,
        status: 'pending'
      })
    }

    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: errors 
      }, { status: 400 })
    }

    // Check for existing invitations
    const emails = validInvitations.map(inv => inv.email)
    const { data: existingInvitations, error: existingError } = await supabase
      .from('invitations')
      .select('email')
      .eq('session_id', params.id)
      .in('email', emails)

    if (existingError) {
      console.error('Error checking existing invitations:', existingError)
      return NextResponse.json({ error: 'Failed to validate invitations' }, { status: 500 })
    }

    const existingEmails = new Set(existingInvitations?.map(inv => inv.email) || [])
    const newInvitations = validInvitations.filter(inv => !existingEmails.has(inv.email))

    if (newInvitations.length === 0) {
      return NextResponse.json({ 
        error: 'All email addresses have already been invited' 
      }, { status: 400 })
    }

    // Insert new invitations
    const { data: insertedInvitations, error: insertError } = await supabase
      .from('invitations')
      .insert(newInvitations)
      .select()

    if (insertError) {
      console.error('Error inserting invitations:', insertError)
      return NextResponse.json({ error: 'Failed to create invitations' }, { status: 500 })
    }

    // TODO: Send email invitations here
    // For now, we'll just create the database records
    // In Phase 5, we'll integrate with Resend for email sending

    const skipped = validInvitations.length - newInvitations.length

    return NextResponse.json({
      message: 'Invitations created successfully',
      sent: newInvitations.length,
      skipped: skipped,
      invitations: insertedInvitations,
      details: skipped > 0 ? `${skipped} email(s) were already invited` : null
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}