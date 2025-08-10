'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { DashboardHeader } from '@/components/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Target, MessageSquare, Plus, X } from 'lucide-react'
import Link from 'next/link'

export default function NewSessionPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    focus_topics: [] as string[],
    custom_questions: [] as string[],
    deadline: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [newQuestion, setNewQuestion] = useState('')

  const router = useRouter()
  const supabase = createClientComponentClient()

  const addFocusTopic = () => {
    const trimmedTopic = newTopic.trim()
    console.log('Adding topic:', trimmedTopic, 'Current topics:', formData.focus_topics.length)
    
    if (trimmedTopic && formData.focus_topics.length < 5) {
      // Check for duplicates
      if (formData.focus_topics.includes(trimmedTopic)) {
        alert('This focus topic has already been added')
        return
      }
      
      setFormData(prev => ({
        ...prev,
        focus_topics: [...prev.focus_topics, trimmedTopic]
      }))
      setNewTopic('')
    } else if (!trimmedTopic) {
      alert('Please enter a focus topic')
    } else if (formData.focus_topics.length >= 5) {
      alert('Maximum 5 focus topics allowed')
    }
  }

  const removeFocusTopic = (index: number) => {
    setFormData(prev => ({
      ...prev,
      focus_topics: prev.focus_topics.filter((_, i) => i !== index)
    }))
  }

  const addCustomQuestion = () => {
    if (newQuestion.trim() && formData.custom_questions.length < 3) {
      setFormData(prev => ({
        ...prev,
        custom_questions: [...prev.custom_questions, newQuestion.trim()]
      }))
      setNewQuestion('')
    }
  }

  const removeCustomQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      custom_questions: prev.custom_questions.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Validate form
      if (!formData.title.trim()) {
        throw new Error('Session title is required')
      }
      if (formData.focus_topics.length === 0) {
        throw new Error('At least one focus topic is required')
      }
      if (!formData.deadline) {
        throw new Error('Deadline is required')
      }

      // Check if deadline is in the future
      const deadlineDate = new Date(formData.deadline)
      if (deadlineDate <= new Date()) {
        throw new Error('Deadline must be in the future')
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          focus_topics: formData.focus_topics,
          custom_questions: formData.custom_questions,
          deadline: formData.deadline
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create session')
      }

      const { session } = await response.json()
      router.push(`/dashboard/sessions/${session.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Session</h1>
              <p className="text-gray-600 mt-1">Set up a new feedback collection session</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Set the title, description, and purpose of your feedback session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Session Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Q1 Performance Review Feedback"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 characters</p>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Provide context about what feedback you're looking for..."
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500 characters</p>
                </div>

                <div>
                  <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Response Deadline *
                  </label>
                  <input
                    type="datetime-local"
                    id="deadline"
                    value={formData.deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Focus Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Focus Topics
                </CardTitle>
                <CardDescription>
                  Add 1-5 specific areas you want feedback on (e.g., Communication, Leadership, Technical Skills)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFocusTopic())}
                    placeholder="Add a focus topic..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={50}
                    disabled={formData.focus_topics.length >= 5}
                  />
                  <Button
                    type="button"
                    onClick={addFocusTopic}
                    disabled={!newTopic.trim() || formData.focus_topics.length >= 5}
                    className="flex items-center gap-1"
                    title={
                      !newTopic.trim() 
                        ? "Enter a topic first" 
                        : formData.focus_topics.length >= 5 
                        ? "Maximum 5 topics allowed" 
                        : "Add this topic"
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>

                {formData.focus_topics.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.focus_topics.map((topic, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {topic}
                        <button
                          type="button"
                          onClick={() => removeFocusTopic(index)}
                          className="hover:text-blue-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  {formData.focus_topics.length}/5 topics added {formData.focus_topics.length === 0 && '(at least 1 required)'}
                </p>
              </CardContent>
            </Card>

            {/* Custom Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Custom Questions (Optional)
                </CardTitle>
                <CardDescription>
                  Add up to 3 specific questions. AI will generate additional questions to reach a total of 5.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomQuestion())}
                    placeholder="Add a custom question..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={200}
                    disabled={formData.custom_questions.length >= 3}
                  />
                  <Button
                    type="button"
                    onClick={addCustomQuestion}
                    disabled={!newQuestion.trim() || formData.custom_questions.length >= 3}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>

                {formData.custom_questions.length > 0 && (
                  <div className="space-y-2">
                    {formData.custom_questions.map((question, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-3 border border-gray-200 rounded-md bg-gray-50"
                      >
                        <span className="text-sm text-gray-600 mt-0.5">{index + 1}.</span>
                        <span className="flex-1 text-sm">{question}</span>
                        <button
                          type="button"
                          onClick={() => removeCustomQuestion(index)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  {formData.custom_questions.length}/3 custom questions added
                  {formData.custom_questions.length > 0 && 
                    ` • AI will generate ${5 - formData.custom_questions.length} additional questions`
                  }
                </p>
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Link href="/dashboard">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isLoading || formData.focus_topics.length === 0 || !formData.title.trim()}
                className="flex items-center gap-2"
              >
                {isLoading ? 'Creating...' : 'Create Session'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}