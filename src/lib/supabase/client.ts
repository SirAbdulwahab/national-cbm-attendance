'use client'

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/lib/supabase/env'
import type { Database } from '@/lib/supabase/database.types'

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}