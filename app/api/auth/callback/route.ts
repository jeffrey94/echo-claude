import { createRouteHandlerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)
    const supabase = createRouteHandlerClient(request, response)
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return response
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}