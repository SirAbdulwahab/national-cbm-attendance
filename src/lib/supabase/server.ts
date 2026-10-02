import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from '@/lib/supabase/env'
import type { Database } from '@/lib/supabase/database.types'

export async function createClient(accessToken?: string) {
  const cookieStore = await cookies()
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: accessToken
      ? {
          fetch: (input, init) => {
            const headers = new Headers(init?.headers)
            headers.set('Authorization', `Bearer ${accessToken}`)
            return fetch(input, { ...init, headers })
          },
        }
      : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot write cookies; proxy refreshes the session.
        }
      },
    },
  })
}