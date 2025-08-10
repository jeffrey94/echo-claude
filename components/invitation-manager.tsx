'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, X, Mail, Upload, UserPlus, Trash2, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Invitation {
  id: string
  email: string
  name?: string
  role?: string
  department?: string
  status: string
  created_at: string
}

interface InvitationFormData {
  email: string
  name: string
  role: string
  department: string
}

interface InvitationManagerProps {
  sessionId: string
  sessionStatus: string
  existingInvitations: Invitation[]
}

export function InvitationManager({ 
  sessionId, 
  sessionStatus, 
  existingInvitations 
}: InvitationManagerProps) {
  const [invitations, setInvitations] = useState<InvitationFormData[]>([
    { email: '', name: '', role: '', department: '' }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [showBulkAdd, setShowBulkAdd] = useState(false)

  const router = useRouter()

  const addInvitation = () => {
    setInvitations(prev => [...prev, { email: '', name: '', role: '', department: '' }])
  }

  const removeInvitation = (index: number) => {
    if (invitations.length > 1) {
      setInvitations(prev => prev.filter((_, i) => i !== index))
    }
  }

  const updateInvitation = (index: number, field: keyof InvitationFormData, value: string) => {
    setInvitations(prev => 
      prev.map((inv, i) => 
        i === index ? { ...inv, [field]: value } : inv
      )
    )
  }

  const parseBulkInvitations = () => {
    const lines = bulkText.trim().split('\n')
    const parsed: InvitationFormData[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Support formats:
      // email@domain.com
      // Name <email@domain.com>
      // email@domain.com, Name, Role, Department
      
      if (trimmed.includes(',')) {
        const parts = trimmed.split(',').map(p => p.trim())
        parsed.push({
          email: parts[0] || '',
          name: parts[1] || '',
          role: parts[2] || '',
          department: parts[3] || ''
        })
      } else if (trimmed.includes('<') && trimmed.includes('>')) {
        const match = trimmed.match(/(.+?)\s*<(.+?)>/)
        if (match) {
          parsed.push({
            email: match[2].trim(),
            name: match[1].trim(),
            role: '',
            department: ''
          })
        }
      } else if (trimmed.includes('@')) {
        parsed.push({
          email: trimmed,
          name: '',
          role: '',
          department: ''
        })
      }
    }

    if (parsed.length > 0) {
      setInvitations(parsed)
      setBulkText('')
      setShowBulkAdd(false)
    }
  }

  const validateInvitations = () => {
    const errors: string[] = []
    const emails = new Set()

    invitations.forEach((inv, index) => {
      if (!inv.email.trim()) {
        errors.push(`Row ${index + 1}: Email is required`)
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.email.trim())) {
        errors.push(`Row ${index + 1}: Invalid email format`)
      } else if (emails.has(inv.email.trim().toLowerCase())) {
        errors.push(`Row ${index + 1}: Duplicate email`)
      } else {
        emails.add(inv.email.trim().toLowerCase())
      }

      // Check against existing invitations
      const existingEmails = new Set(existingInvitations.map(inv => inv.email.toLowerCase()))
      if (existingEmails.has(inv.email.trim().toLowerCase())) {
        errors.push(`Row ${index + 1}: Email already invited`)
      }
    })

    return errors
  }

  const sendInvitations = async () => {
    const validationErrors = validateInvitations()
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'))
      return
    }

    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch(`/api/sessions/${sessionId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitations: invitations.map(inv => ({
            email: inv.email.trim(),
            name: inv.name.trim() || null,
            role: inv.role.trim() || null,
            department: inv.department.trim() || null
          }))
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send invitations')
      }

      const data = await response.json()
      setSuccessMessage(`Successfully sent ${data.sent} invitation${data.sent !== 1 ? 's' : ''}!`)
      
      // Reset form
      setInvitations([{ email: '', name: '', role: '', department: '' }])
      
      // Refresh the page to show new invitations
      setTimeout(() => {
        router.refresh()
      }, 2000)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Invitations
          </CardTitle>
          <CardDescription>
            Invite people to participate in this feedback session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bulk Add Toggle */}
          <div className="flex gap-2">
            <Button
              variant={showBulkAdd ? "default" : "outline"}
              size="sm"
              onClick={() => setShowBulkAdd(!showBulkAdd)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Bulk Add
            </Button>
            <Button
              variant={!showBulkAdd ? "default" : "outline"}
              size="sm"
              onClick={() => setShowBulkAdd(false)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Individual
            </Button>
          </div>

          {showBulkAdd ? (
            /* Bulk Add Interface */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste email addresses (one per line)
                </label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`Format options:
email@domain.com
John Doe <john@domain.com>
email@domain.com, Name, Role, Department`}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                />
              </div>
              <Button onClick={parseBulkInvitations} disabled={!bulkText.trim()}>
                Parse Invitations
              </Button>
            </div>
          ) : (
            /* Individual Add Interface */
            <div className="space-y-4">
              {invitations.map((invitation, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-900">Invitation {index + 1}</h4>
                    {invitations.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInvitation(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={invitation.email}
                        onChange={(e) => updateInvitation(index, 'email', e.target.value)}
                        placeholder="colleague@company.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={invitation.name}
                        onChange={(e) => updateInvitation(index, 'name', e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role/Position
                      </label>
                      <input
                        type="text"
                        value={invitation.role}
                        onChange={(e) => updateInvitation(index, 'role', e.target.value)}
                        placeholder="Manager, Colleague, Direct Report"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={invitation.department}
                        onChange={(e) => updateInvitation(index, 'department', e.target.value)}
                        placeholder="Engineering, Sales, Marketing"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <Button
                variant="outline"
                onClick={addInvitation}
                className="w-full flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Another Invitation
              </Button>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{successMessage}</p>
            </div>
          )}

          {/* Send Button */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={sendInvitations}
              disabled={isLoading || invitations.some(inv => !inv.email.trim())}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Mail className="h-4 w-4 animate-pulse" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send {invitations.filter(inv => inv.email.trim()).length} Invitation{invitations.filter(inv => inv.email.trim()).length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Invitations will be sent via email with a secure access link</p>
            <p>• Participants remain anonymous throughout the feedback process</p>
            <p>• You can track invitation status and send reminders as needed</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}