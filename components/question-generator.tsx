'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wand2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface QuestionGeneratorProps {
  sessionId: string
  hasCustomQuestions: boolean
  customQuestionsCount: number
  hasGeneratedQuestions: boolean
  generatedQuestions?: string[]
}

export function QuestionGenerator({
  sessionId,
  hasCustomQuestions,
  customQuestionsCount,
  hasGeneratedQuestions,
  generatedQuestions = []
}: QuestionGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [newQuestions, setNewQuestions] = useState<string[]>([])
  
  const router = useRouter()
  
  const questionsNeeded = 5 - customQuestionsCount
  const canGenerate = questionsNeeded > 0

  const generateQuestions = async () => {
    setIsGenerating(true)
    setError('')
    setNewQuestions([])

    try {
      const response = await fetch(`/api/sessions/${sessionId}/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate questions')
      }

      const data = await response.json()
      
      if (data.questions && data.questions.length > 0) {
        setNewQuestions(data.questions)
        // Refresh the page to show updated questions
        setTimeout(() => {
          router.refresh()
        }, 2000)
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const regenerateQuestions = async () => {
    // For regeneration, we'd need to clear existing questions first
    // This would require a separate API endpoint or parameter
    setError('Regeneration feature coming soon')
  }

  if (hasGeneratedQuestions && generatedQuestions.length > 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Questions Generated Successfully
          </CardTitle>
          <CardDescription className="text-green-700">
            {generatedQuestions.length} AI-generated questions have been added to complete your interview set.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            {generatedQuestions.map((question, index) => (
              <div key={index} className="flex gap-3 p-3 bg-white rounded-md border border-green-200">
                <span className="text-sm font-medium text-green-600">
                  {customQuestionsCount + index + 1}.
                </span>
                <span className="text-sm text-gray-900">{question}</span>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={regenerateQuestions}
              className="flex items-center gap-2"
              disabled
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!canGenerate) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <h3 className="font-medium text-blue-900 mb-1">Question Set Complete</h3>
          <p className="text-sm text-blue-700">
            You have {customQuestionsCount} custom questions, which is the maximum of 5 total questions.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Generate AI Questions
        </CardTitle>
        <CardDescription>
          Generate {questionsNeeded} additional question{questionsNeeded !== 1 ? 's' : ''} using AI to reach a total of 5 questions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-600 font-medium">Generation Failed</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {newQuestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-green-800">✨ Generated Questions</h4>
            {newQuestions.map((question, index) => (
              <div key={index} className="flex gap-3 p-3 bg-green-50 rounded-md border border-green-200">
                <span className="text-sm font-medium text-green-600">
                  {customQuestionsCount + index + 1}.
                </span>
                <span className="text-sm text-gray-900">{question}</span>
              </div>
            ))}
            <p className="text-sm text-green-600 font-medium">
              Questions saved successfully! Refreshing...
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={generateQuestions}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Generate {questionsNeeded} Question{questionsNeeded !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• AI will analyze your focus topics and existing questions</p>
          <p>• Questions will be tailored to your feedback session context</p>
          <p>• You can regenerate if you're not satisfied with the results</p>
        </div>
      </CardContent>
    </Card>
  )
}