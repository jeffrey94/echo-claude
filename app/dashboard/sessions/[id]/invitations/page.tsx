'use client'

import { createClientComponentClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { InvitationManager } from '@/components/invitation-manager'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Users, Mail, Plus, Eye, Calendar, AlertCircle, Copy, ExternalLink } from 'lucide-react'

interface PageProps {
  params: {
    id: string
  }
}

export default function SessionInvitationsPage({ params }: PageProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [session, setSession] = useState<any>(null)
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      try {
        // Check if user is authenticated
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/login')
          return
        }

        setUser(user)

        // Fetch session details
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', params.id)
          .eq('user_id', user.id)
          .single()

        if (sessionError || !sessionData) {
          router.push('/dashboard')
          return
        }

        setSession(sessionData)

        // Fetch invitations for this session
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('invitations')
          .select('*')
          .eq('session_id', sessionData.id)
          .order('created_at', { ascending: false })

        if (invitationsError) {
          console.error('Error fetching invitations:', invitationsError)
        } else {
          setInvitations(invitationsData || [])
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params.id, router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const statusColors = {
    pending: 'bg-gray-100 text-gray-800',
    opened: 'bg-yellow-100 text-yellow-800',
    started: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800'
  }

  const stats = {
    total: invitations?.length || 0,
    pending: invitations?.filter(inv => inv.status === 'pending').length || 0,
    opened: invitations?.filter(inv => inv.status === 'opened').length || 0,
    started: invitations?.filter(inv => inv.status === 'started').length || 0,
    completed: invitations?.filter(inv => inv.status === 'completed').length || 0,
    expired: invitations?.filter(inv => inv.status === 'expired').length || 0
  }

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  const isOverdue = new Date(session.deadline) < new Date() && session.status !== 'completed'

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/sessions/${session.id}`}>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Session
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">Manage Invitations</h1>
              <p className="text-gray-600 mt-1">
                {session.title} • {stats.total} invitation{stats.total !== 1 ? 's' : ''} • {completionRate}% completion rate
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Send Reminders
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-600">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
                <p className="text-xs text-gray-600">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.opened}</p>
                <p className="text-xs text-gray-600">Opened</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.started}</p>
                <p className="text-xs text-gray-600">Started</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                <p className="text-xs text-gray-600">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                <p className="text-xs text-gray-600">Expired</p>
              </CardContent>
            </Card>
          </div>

          {/* Session Status Warning */}
          {session.status === 'draft' && (
            <Card className="mb-6 border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-900">Session Not Active</h3>
                    <p className="text-sm text-amber-700">
                      This session is still in draft mode. Invitees won't be able to participate until you launch the session.
                    </p>
                    <Link href={`/dashboard/sessions/${session.id}`} className="inline-block mt-2">
                      <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                        Launch Session
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isOverdue && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900">Session Overdue</h3>
                    <p className="text-sm text-red-700">
                      The deadline for this session has passed. Consider extending the deadline or completing the session.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Invitation Manager */}
              <InvitationManager 
                sessionId={session.id}
                sessionStatus={session.status}
                existingInvitations={invitations || []}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Invitation List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Invitations ({stats.total})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {invitations && invitations.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {invitations.map((invitation) => {
                        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
                        const inviteUrl = `${baseUrl}/invite/${invitation.token}`
                        const interviewUrl = `${baseUrl}/interview/${invitation.token}`
                        
                        return (
                          <div key={invitation.id} className="p-3 border border-gray-200 rounded-md space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {invitation.name || invitation.email}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {invitation.email}
                                </p>
                                {invitation.role && (
                                  <p className="text-xs text-gray-500">
                                    {invitation.role}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400">
                                  Sent {new Date(invitation.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[invitation.status as keyof typeof statusColors]}`}>
                                  {invitation.status}
                                </span>
                              </div>
                            </div>
                            
                            {/* Invitation URLs */}
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-700">Invitation URL:</p>
                                <div className="flex items-center gap-1">
                                  <code className="flex-1 text-xs bg-gray-50 p-1 rounded truncate">
                                    {inviteUrl}
                                  </code>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => navigator.clipboard.writeText(inviteUrl)}
                                    title="Copy invitation URL"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Link href={inviteUrl} target="_blank">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 w-6 p-0"
                                      title="Open invitation page"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-700">Direct Interview URL:</p>
                                <div className="flex items-center gap-1">
                                  <code className="flex-1 text-xs bg-blue-50 p-1 rounded truncate">
                                    {interviewUrl}
                                  </code>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => navigator.clipboard.writeText(interviewUrl)}
                                    title="Copy interview URL"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Link href={interviewUrl} target="_blank">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 w-6 p-0"
                                      title="Start interview directly"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No invitations sent yet</p>
                      <p className="text-xs">Add invitees to get started</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Bulk Reminders
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Import from CSV
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Invitation
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}