import { createRouteHandlerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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
    // Fetch user's sessions
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const { title, description, focus_topics, custom_questions, deadline } = body

    // Validate required fields
    if (!title || !focus_topics || !deadline) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('Creating session for user:', user.id)

    // Create new session with explicit user context
    const { data: session, error } = await supabase
      .from('sessions')
      .insert([
        {
          user_id: user.id,
          title,
          description,
          focus_topics,
          custom_questions: custom_questions || [],
          deadline,
          status: 'draft',
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      console.error('User ID:', user.id)
      console.error('Session data:', { title, description, focus_topics, custom_questions, deadline })
      return NextResponse.json({ 
        error: 'Failed to create session', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}