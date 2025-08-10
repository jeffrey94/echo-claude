import { createServerComponentClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { InvitationLanding } from '@/components/invitation-landing'

interface InvitePageProps {
  params: {
    token: string
  }
}

export default async function InvitePage({ params }: InvitePageProps) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient(cookieStore)

  // Fetch invitation and session data using the token
  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select(`
      *,
      sessions (
        id,
        title,
        description,
        focus_topics,
        deadline,
        status,
        users (
          email,
          full_name
        )
      )
    `)
    .eq('token', params.token)
    .single()

  if (invitationError || !invitation || !invitation.sessions) {
    notFound()
  }

  const session = invitation.sessions
  const requester = session.users

  // Check if session is still active
  const isExpired = new Date(session.deadline) < new Date() || session.status === 'completed' || session.status === 'cancelled'
  
  // Update invitation status to 'opened' if it's still 'pending'
  if (invitation.status === 'pending') {
    await supabase
      .from('invitations')
      .update({ 
        status: 'opened',
        opened_at: new Date().toISOString()
      })
      .eq('id', invitation.id)
  }

  return (
    <InvitationLanding 
      invitation={invitation}
      session={session}
      requester={requester}
      isExpired={isExpired}
      token={params.token}
    />
  )
}