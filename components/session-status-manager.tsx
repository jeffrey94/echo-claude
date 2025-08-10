'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Play, Pause, Square, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SessionStatusManagerProps {
  sessionId: string
  currentStatus: string
  onStatusChange?: (newStatus: string) => void
}

export function SessionStatusManager({ 
  sessionId, 
  currentStatus, 
  onStatusChange 
}: SessionStatusManagerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingStatus, setPendingStatus] = useState('')
  const [error, setError] = useState('')
  
  const router = useRouter()

  const statusConfig = {
    draft: {
      label: 'Draft',
      color: 'yellow',
      actions: ['activate', 'cancel']
    },
    active: {
      label: 'Active',
      color: 'green', 
      actions: ['complete', 'cancel']
    },
    completed: {
      label: 'Completed',
      color: 'purple',
      actions: []
    },
    cancelled: {
      label: 'Cancelled',
      color: 'gray',
      actions: []
    }
  }

  const actionConfig = {
    activate: {
      label: 'Launch Session',
      icon: Play,
      status: 'active',
      description: 'This will make the session active and allow invitees to participate.',
      warning: 'Make sure you have added all invitees before launching.'
    },
    complete: {
      label: 'Complete Session',
      icon: Square,
      status: 'completed',
      description: 'This will end the session and prevent further responses.',
      warning: 'This action cannot be undone.'
    },
    cancel: {
      label: 'Cancel Session',
      icon: Pause,
      status: 'cancelled',
      description: 'This will cancel the session and notify all invitees.',
      warning: 'This action cannot be undone.'
    }
  }

  const availableActions = statusConfig[currentStatus as keyof typeof statusConfig]?.actions || []

  const handleStatusChange = async (action: string) => {
    const config = actionConfig[action as keyof typeof actionConfig]
    setPendingStatus(config.status)
    setShowConfirmDialog(true)
  }

  const confirmStatusChange = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/sessions/${sessionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: pendingStatus }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update session status')
      }

      const data = await response.json()
      
      // Call the callback if provided
      if (onStatusChange) {
        onStatusChange(pendingStatus)
      }

      // Refresh the page to show updated status
      router.refresh()
      
      setShowConfirmDialog(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const getActionButton = (action: string) => {
    const config = actionConfig[action as keyof typeof actionConfig]
    const Icon = config.icon
    
    return (
      <Button
        key={action}
        onClick={() => handleStatusChange(action)}
        variant={action === 'cancel' ? 'destructive' : 'default'}
        className="flex items-center gap-2"
      >
        <Icon className="h-4 w-4" />
        {config.label}
      </Button>
    )
  }

  return (
    <>
      <div className="flex gap-2">
        {availableActions.map(getActionButton)}
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Status Change
            </DialogTitle>
            <DialogDescription className="space-y-2">
              {pendingStatus && (
                <>
                  <p>{actionConfig[availableActions.find(a => actionConfig[a as keyof typeof actionConfig].status === pendingStatus) as keyof typeof actionConfig]?.description}</p>
                  <p className="text-amber-600 font-medium">
                    {actionConfig[availableActions.find(a => actionConfig[a as keyof typeof actionConfig].status === pendingStatus) as keyof typeof actionConfig]?.warning}
                  </p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStatusChange}
              disabled={isLoading}
              variant={pendingStatus === 'cancelled' ? 'destructive' : 'default'}
            >
              {isLoading ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}