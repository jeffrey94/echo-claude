import { createRouteHandlerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const response = NextResponse.next()
  const supabase = createRouteHandlerClient(request, response)

  // Check if user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if questions have already been generated
    if (session.generated_questions && session.generated_questions.length > 0) {
      return NextResponse.json({
        questions: session.generated_questions,
        message: 'Questions already generated'
      })
    }

    // Validate session has focus topics
    if (!session.focus_topics || session.focus_topics.length === 0) {
      return NextResponse.json(
        { error: 'Session must have focus topics to generate questions' },
        { status: 400 }
      )
    }

    const customQuestions = session.custom_questions || []
    const questionsNeeded = 5 - customQuestions.length

    if (questionsNeeded <= 0) {
      return NextResponse.json({
        questions: [],
        message: 'No additional questions needed'
      })
    }

    // Generate AI questions using OpenAI
    const prompt = `
You are an expert in workplace feedback and performance reviews. Generate ${questionsNeeded} thoughtful, specific interview questions for anonymous feedback collection.

Context:
- Session Title: "${session.title}"
- Description: "${session.description || 'No description provided'}"
- Focus Areas: ${session.focus_topics.join(', ')}
- Custom Questions Already Added: ${customQuestions.length > 0 ? customQuestions.map((q: string, i: number) => `${i+1}. ${q}`).join('\n') : 'None'}

Requirements:
1. Generate exactly ${questionsNeeded} questions
2. Questions should complement the existing custom questions (don't repeat similar themes)
3. Focus on the specified areas: ${session.focus_topics.join(', ')}
4. Questions should be open-ended to encourage detailed responses
5. Maintain professional, constructive tone suitable for workplace feedback
6. Each question should be actionable and specific
7. Questions should help the recipient understand strengths and areas for improvement

Return only the questions as a JSON array of strings, no additional formatting or numbering.

Example format:
["Question 1 text here", "Question 2 text here", "Question 3 text here"]
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in workplace feedback and performance reviews. Generate thoughtful, specific questions for anonymous feedback collection. Return only valid JSON array of question strings.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const aiResponse = completion.choices[0]?.message?.content?.trim()
    
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    // Parse the AI response
    let generatedQuestions: string[]
    try {
      generatedQuestions = JSON.parse(aiResponse)
      
      // Validate the response
      if (!Array.isArray(generatedQuestions)) {
        throw new Error('AI response is not an array')
      }
      
      if (generatedQuestions.length !== questionsNeeded) {
        throw new Error(`Expected ${questionsNeeded} questions, got ${generatedQuestions.length}`)
      }

      // Validate each question
      generatedQuestions = generatedQuestions.map(q => {
        if (typeof q !== 'string' || q.trim().length === 0) {
          throw new Error('Invalid question format')
        }
        return q.trim()
      })

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      console.error('AI Response:', aiResponse)
      throw new Error('Failed to parse AI-generated questions')
    }

    // Update session with generated questions
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update({
        generated_questions: generatedQuestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating session with questions:', updateError)
      throw new Error('Failed to save generated questions')
    }

    return NextResponse.json({
      questions: generatedQuestions,
      session: updatedSession,
      message: `Generated ${generatedQuestions.length} questions successfully`
    })

  } catch (error: any) {
    console.error('Question generation error:', error)
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded. Please check your API key and billing.' },
        { status: 402 }
      )
    }
    
    if (error.code === 'invalid_api_key') {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key. Please check your configuration.' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate questions' },
      { status: 500 }
    )
  }
}