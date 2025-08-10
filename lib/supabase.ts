import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Only throw errors in runtime, not during build
if (typeof window !== 'undefined' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  console.warn('Supabase environment variables not configured. Authentication will not work.')
}

// Client-side Supabase client
export const createClientComponentClient = () =>
  createBrowserClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client for Server Components
export const createServerComponentClient = (cookieStore: any) =>
  createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })

// Server-side Supabase client for Route Handlers
export const createRouteHandlerClient = (
  request: NextRequest,
  response: NextResponse
) =>
  createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        const cookieOptions = {
          name,
          value,
          ...options,
          secure: process.env.NODE_ENV === 'production',
          httpOnly: options.httpOnly !== false,
          sameSite: 'lax' as const,
        }
        request.cookies.set(cookieOptions)
        response.cookies.set(cookieOptions)
      },
      remove(name: string, options: CookieOptions) {
        const cookieOptions = {
          name,
          value: '',
          ...options,
          maxAge: 0,
        }
        request.cookies.set(cookieOptions)
        response.cookies.set(cookieOptions)
      },
    },
  })

// Admin client for server-side operations (requires service role key)
export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not configured. Admin operations will not work.')
    // Return a placeholder client for build-time
    return createClient(supabaseUrl, supabaseAnonKey)
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Simple client for basic operations (backwards compatibility)
// Note: Only use this for non-authenticated operations
let _supabaseClient: any = null
export const supabase = (() => {
  if (!_supabaseClient) {
    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  return _supabaseClient
})()