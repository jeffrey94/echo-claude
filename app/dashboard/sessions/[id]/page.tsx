import { createServerComponentClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { SessionStatusManager } from '@/components/session-status-manager'
import { QuestionGenerator } from '@/components/question-generator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Calendar, Target, MessageSquare, Users, Edit2, BarChart3, Mail } from 'lucide-react'

interface PageProps {
  params: {
    id: string
  }
}

export default async function SessionDetailPage({ params }: PageProps) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient(cookieStore)

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch session details
  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !session) {
    notFound()
  }

  // Fetch invitations for this session
  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })

  const statusColors = {
    draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    completed: 'bg-purple-100 text-purple-800 border-purple-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const isOverdue = new Date(session.deadline) < new Date() && session.status !== 'completed'

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{session.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[session.status as keyof typeof statusColors]}`}>
                  {session.status}
                </span>
                {isOverdue && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border-red-200">
                    Overdue
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1">Feedback session details and management</p>
            </div>
            <div className="flex gap-2">
              {session.status === 'draft' && (
                <Link href={`/dashboard/sessions/${session.id}/edit`}>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Edit2 className="h-4 w-4" />
                    Edit Session
                  </Button>
                </Link>
              )}
              {session.status === 'active' && (
                <Button variant="outline" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send Reminders
                </Button>
              )}
              {session.status === 'completed' && (
                <Link href={`/dashboard/sessions/${session.id}/report`}>
                  <Button className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    View Report
                  </Button>
                </Link>
              )}
              <SessionStatusManager 
                sessionId={session.id} 
                currentStatus={session.status} 
              />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Session Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Session Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {session.description && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-gray-600">{session.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Focus Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {session.focus_topics?.map((topic: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Created</p>
                      <p className="text-gray-900">{new Date(session.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Deadline</p>
                      <p className={`${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                        {new Date(session.deadline).toLocaleDateString()} at {new Date(session.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Questions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Questions
                  </CardTitle>
                  <CardDescription>
                    {session.custom_questions?.length || 0} custom questions • {session.generated_questions?.length || 0} AI-generated questions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Custom Questions */}
                  {session.custom_questions && session.custom_questions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Custom Questions</h4>
                      <div className="space-y-2">
                        {session.custom_questions.map((question: string, index: number) => (
                          <div key={index} className="flex gap-3 p-3 bg-blue-50 rounded-md">
                            <span className="text-sm font-medium text-blue-600">{index + 1}.</span>
                            <span className="text-sm text-gray-900">{question}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI-Generated Questions */}
                  {session.generated_questions && session.generated_questions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">AI-Generated Questions</h4>
                      <div className="space-y-2">
                        {session.generated_questions.map((question: string, index: number) => (
                          <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-md">
                            <span className="text-sm font-medium text-gray-600">{(session.custom_questions?.length || 0) + index + 1}.</span>
                            <span className="text-sm text-gray-900">{question}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question Generator */}
                  <QuestionGenerator
                    sessionId={session.id}
                    hasCustomQuestions={(session.custom_questions?.length || 0) > 0}
                    customQuestionsCount={session.custom_questions?.length || 0}
                    hasGeneratedQuestions={(session.generated_questions?.length || 0) > 0}
                    generatedQuestions={session.generated_questions || []}
                  />

                  {/* Empty State */}
                  {(!session.custom_questions || session.custom_questions.length === 0) && 
                   (!session.generated_questions || session.generated_questions.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No questions yet. Generate AI questions or add custom ones when editing.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Invitation Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Invitations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{invitations?.length || 0}</p>
                        <p className="text-sm text-gray-600">Total Sent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {invitations?.filter(inv => inv.status === 'completed').length || 0}
                        </p>
                        <p className="text-sm text-gray-600">Completed</p>
                      </div>
                    </div>
                    
                    {session.status === 'draft' ? (
                      <Link href={`/dashboard/sessions/${session.id}/invitations`}>
                        <Button className="w-full flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Manage Invitations
                        </Button>
                      </Link>
                    ) : (
                      <div className="space-y-2">
                        {invitations && invitations.length > 0 ? (
                          invitations.slice(0, 3).map((invitation) => (
                            <div key={invitation.id} className="flex justify-between items-center text-sm">
                              <span className="truncate">{invitation.email}</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                invitation.status === 'completed' ? 'bg-green-100 text-green-800' :
                                invitation.status === 'started' ? 'bg-blue-100 text-blue-800' :
                                invitation.status === 'opened' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {invitation.status}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">No invitations sent yet</p>
                        )}
                        
                        {invitations && invitations.length > 3 && (
                          <Link href={`/dashboard/sessions/${session.id}/invitations`}>
                            <Button variant="outline" size="sm" className="w-full">
                              View All ({invitations.length})
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {session.status === 'draft' && (
                    <>
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href={`/dashboard/sessions/${session.id}/edit`}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit Session
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href={`/dashboard/sessions/${session.id}/invitations`}>
                          <Mail className="h-4 w-4 mr-2" />
                          Manage Invitations
                        </Link>
                      </Button>
                    </>
                  )}
                  {session.status === 'active' && (
                    <>
                      <Button variant="outline" className="w-full justify-start">
                        <Mail className="h-4 w-4 mr-2" />
                        Send Reminders
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Progress
                      </Button>
                    </>
                  )}
                  {session.status === 'completed' && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href={`/dashboard/sessions/${session.id}/report`}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Report
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}