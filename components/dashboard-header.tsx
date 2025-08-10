'use client'

import { createClientComponentClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { LogOut, User, Settings } from 'lucide-react'

export function DashboardHeader() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Echo</h1>
            <nav className="ml-8 flex space-x-4">
              <a href="/dashboard" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </a>
              <a href="/dashboard/sessions" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Sessions
              </a>
              <a href="/dashboard/reports" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Reports
              </a>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}