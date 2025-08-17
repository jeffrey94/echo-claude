/**
 * DeepDive AI Interview Conductor
 * Manages the conversation flow and AI responses during interviews
 */

import OpenAI from 'openai'
import { 
  InterviewContext, 
  ConversationState, 
  SYSTEM_PROMPT, 
  INTERVIEW_OPENING, 
  QUESTION_TRANSITIONS,
  FOLLOW_UP_PROMPTS,
  TIME_MANAGEMENT,
  INTERVIEW_CLOSING,
  CONVERSATION_RECOVERY 
} from './deepdive-prompts'

export class DeepDiveInterviewConductor {
  private openai: OpenAI
  private context: InterviewContext
  private state: ConversationState
  private conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

  constructor(context: InterviewContext) {
    this.openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION_ID,
      dangerouslyAllowBrowser: true
    })
    
    this.context = context
    this.state = this.initializeState()
    this.setupConversation()
  }

  private initializeState(): ConversationState {
    const allQuestions = [...this.context.customQuestions, ...this.context.generatedQuestions]
    return {
      currentQuestionIndex: 0,
      questionsAsked: [],
      questionsRemaining: allQuestions,
      followUpCount: 0,
      startTime: new Date(),
      responses: []
    }
  }

  private setupConversation() {
    // Initialize conversation with system prompt and context
    this.conversationHistory = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}

## Interview Context:
- Session: ${this.context.sessionTitle}
- Focus Areas: ${this.context.focusTopics.join(', ')}
- Questions Available: ${this.state.questionsRemaining.length}
- Time Limit: 15-20 minutes

## Questions to Ask:
${this.state.questionsRemaining.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Start with the interview opening and then begin with the first question.`
      }
    ]
  }

  /**
   * Generate the opening message when interview begins
   */
  async getOpeningMessage(): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // 60% faster than gpt-4o, 95% cheaper
        messages: [
          ...this.conversationHistory,
          {
            role: 'user',
            content: 'Please start the interview with your opening message.'
          }
        ],
        max_tokens: 200, // Shorter responses for faster generation
        temperature: 0.7
      })

      const response = completion.choices[0]?.message?.content || INTERVIEW_OPENING(this.context)
      
      // Add to conversation history
      this.conversationHistory.push(
        { role: 'user', content: 'Please start the interview with your opening message.' },
        { role: 'assistant', content: response }
      )

      return response
    } catch (error) {
      console.error('Error generating opening message:', error)
      return INTERVIEW_OPENING(this.context)
    }
  }

  /**
   * Process participant response and generate next AI message
   */
  async processResponse(participantResponse: string): Promise<string> {
    try {
      const timeElapsed = this.getTimeElapsed()
      const shouldFollowUp = this.shouldAskFollowUp(participantResponse)
      const shouldManageTime = this.shouldManageTime(timeElapsed)
      
      // Record the response
      if (this.state.currentQuestionIndex < this.state.questionsAsked.length) {
        this.state.responses.push({
          question: this.state.questionsAsked[this.state.currentQuestionIndex - 1] || '',
          response: participantResponse,
          timestamp: new Date()
        })
      }

      let promptContext = ''
      
      if (shouldManageTime) {
        promptContext += this.getTimeManagementPrompt(timeElapsed)
      }
      
      if (shouldFollowUp && this.state.followUpCount < 2) {
        promptContext += '\nThis response could benefit from a follow-up question for more specificity.'
        this.state.followUpCount++
      } else if (this.state.questionsRemaining.length > 0) {
        // Move to next question
        promptContext += '\nMove to the next question with a smooth transition.'
        const nextQuestion = this.state.questionsRemaining.shift()
        if (nextQuestion) {
          this.state.questionsAsked.push(nextQuestion)
          this.state.currentQuestionIndex++
          this.state.followUpCount = 0
        }
      } else {
        // Interview complete
        promptContext += '\nWrap up the interview with closing remarks.'
      }

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // 60% faster than gpt-4o
        messages: [
          ...this.conversationHistory,
          {
            role: 'user', 
            content: `Participant response: "${participantResponse}"\n\n${promptContext}`
          }
        ],
        max_tokens: 150, // Concise responses for speed
        temperature: 0.7,
        stream: false // Keep simple for reliability
      })

      const aiResponse = completion.choices[0]?.message?.content || this.getDefaultResponse()
      
      // Add to conversation history
      this.conversationHistory.push(
        { role: 'user', content: participantResponse },
        { role: 'assistant', content: aiResponse }
      )

      return aiResponse
      
    } catch (error) {
      console.error('Error processing response:', error)
      return this.getErrorRecoveryResponse()
    }
  }

  /**
   * Handle technical issues or unclear responses
   */
  async handleRecovery(issue: 'unclear' | 'technical' | 'silence'): Promise<string> {
    const prompts = {
      unclear: CONVERSATION_RECOVERY.UNCLEAR_RESPONSE,
      technical: CONVERSATION_RECOVERY.TECHNICAL_ISSUES,
      silence: CONVERSATION_RECOVERY.SILENCE_PROMPTS
    }

    const randomPrompt = prompts[issue][Math.floor(Math.random() * prompts[issue].length)]
    return randomPrompt
  }

  /**
   * Get interview completion status
   */
  isInterviewComplete(): boolean {
    const timeElapsed = this.getTimeElapsed()
    return (
      this.state.questionsRemaining.length === 0 || 
      timeElapsed >= 20 || // Hard limit
      (timeElapsed >= 15 && this.state.responses.length >= 3) // Minimum viable interview
    )
  }

  /**
   * Get interview summary for completion
   */
  getInterviewSummary(): {
    duration: number
    questionsAsked: number
    responses: number
    completion: number
  } {
    return {
      duration: this.getTimeElapsed(),
      questionsAsked: this.state.questionsAsked.length,
      responses: this.state.responses.length,
      completion: Math.round((this.state.questionsAsked.length / (this.context.customQuestions.length + this.context.generatedQuestions.length)) * 100)
    }
  }

  // Private helper methods
  private getTimeElapsed(): number {
    return Math.floor((Date.now() - this.state.startTime.getTime()) / (1000 * 60))
  }

  private shouldAskFollowUp(response: string): boolean {
    // Simple heuristics for follow-up detection
    return (
      response.length < 50 || // Very short response
      !response.includes('because') || // No reasoning
      response.toLowerCase().includes('i guess') || // Uncertain
      response.toLowerCase().includes('not sure') // Vague
    )
  }

  private shouldManageTime(timeElapsed: number): boolean {
    const totalQuestions = this.context.customQuestions.length + this.context.generatedQuestions.length
    const expectedProgress = timeElapsed / 15 // Expected completion rate
    const actualProgress = this.state.currentQuestionIndex / totalQuestions
    
    return (
      timeElapsed >= 8 && expectedProgress > actualProgress * 1.5 || // Behind schedule
      timeElapsed >= 12 // Final minutes
    )
  }

  private getTimeManagementPrompt(timeElapsed: number): string {
    if (timeElapsed >= 12) {
      return TIME_MANAGEMENT.FINAL_MINUTES()
    } else if (timeElapsed >= 8) {
      return TIME_MANAGEMENT.HALFWAY_CHECK(this.state.questionsRemaining.length)
    }
    return ''
  }

  private getDefaultResponse(): string {
    const transitions = QUESTION_TRANSITIONS
    return transitions[Math.floor(Math.random() * transitions.length)]
  }

  private getErrorRecoveryResponse(): string {
    return "I apologize, but I'm having a brief technical issue. Could you please repeat your last response?"
  }
}