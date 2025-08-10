import { createServerComponentClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardHeader } from '@/components/dashboard-header'
import Link from 'next/link'
import { Plus, MoreVertical, Eye, Edit2, Trash2, Users, Calendar, Target } from 'lucide-react'

export default async function DashboardPage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient(cookieStore)

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user's sessions
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching sessions:', error)
  }

  // Get session stats
  const stats = {
    total: sessions?.length || 0,
    draft: sessions?.filter(s => s.status === 'draft').length || 0,
    active: sessions?.filter(s => s.status === 'active').length || 0,
    completed: sessions?.filter(s => s.status === 'completed').length || 0
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your feedback sessions</p>
            </div>
            <Link href="/dashboard/sessions/new">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Session
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-gray-600">Total Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Edit2 className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
                    <p className="text-gray-600">Draft</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                    <p className="text-gray-600">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                    <p className="text-gray-600">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                Your Sessions
              </h2>
              <div className="text-sm text-gray-500">
                {stats.total} session{stats.total !== 1 ? 's' : ''}
              </div>
            </div>
            
            {sessions && sessions.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sessions.map((session) => {
                  const statusColors = {
                    draft: 'bg-yellow-100 text-yellow-800',
                    active: 'bg-green-100 text-green-800',
                    completed: 'bg-purple-100 text-purple-800',
                    cancelled: 'bg-gray-100 text-gray-800'
                  }
                  
                  const isOverdue = new Date(session.deadline) < new Date() && session.status !== 'completed'
                  
                  return (
                    <Card key={session.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="truncate text-lg">{session.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[session.status as keyof typeof statusColors] || statusColors.draft}`}>
                                {session.status}
                              </span>
                              {isOverdue && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Overdue
                                </span>
                              )}
                            </div>
                          </div>
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {session.description || 'No description provided'}
                        </p>
                        <div className="space-y-2 text-sm text-gray-500 mb-4">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            <span>{session.focus_topics?.length || 0} focus area{(session.focus_topics?.length || 0) !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className={isOverdue ? 'text-red-600' : ''}>
                              Due {new Date(session.deadline).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/dashboard/sessions/${session.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                          </Link>
                          {session.status === 'draft' && (
                            <Link href={`/dashboard/sessions/${session.id}/edit`}>
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <Edit2 className="h-3 w-3" />
                                Edit
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <CardTitle className="mb-2">No Sessions Yet</CardTitle>
                  <CardDescription className="mb-6 max-w-sm mx-auto">
                    Get started by creating your first feedback session. Gather anonymous insights from your team and peers.
                  </CardDescription>
                  <Link href="/dashboard/sessions/new">
                    <Button className="flex items-center gap-2 mx-auto">
                      <Plus className="h-4 w-4" />
                      Create Your First Session
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}