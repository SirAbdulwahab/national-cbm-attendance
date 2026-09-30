'use server'

import { createHash, randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type AttendanceRecord = Database['public']['Tables']['attendance']['Row']

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('You must be signed in to use attendance QR codes.')
  return { supabase, user }
}

async function requireAdmin() {
  const { supabase, user } = await getAuthenticatedUser()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error || profile?.role !== 'admin') throw new Error('Administrator access is required.')
  return { supabase, user }
}

export async function rotateDailyAttendanceQrToken(): Promise<{ token: string; validDate: string }> {
  const { supabase, user } = await requireAdmin()
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const validDate = new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('attendance_qr_tokens')
    .upsert({ valid_date: validDate, token_hash: tokenHash, created_by: user.id }, { onConflict: 'valid_date' })

  if (error) throw new Error(`Could not rotate today's QR code: ${error.message}`)
  return { token, validDate }
}

export async function punchInWithAttendanceQr(token: string): Promise<AttendanceRecord> {
  const normalizedToken = token.trim()
  if (!normalizedToken || normalizedToken.length > 128) throw new Error('The QR code is invalid.')

  const { supabase, user } = await getAuthenticatedUser()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'agent') throw new Error('Only agent accounts can punch in.')

  const { data, error } = await supabase.rpc('punch_in_with_qr', { p_qr_token: normalizedToken })
  if (error) {
    if (error.code === '23505') throw new Error('Attendance has already been recorded for today.')
    if (error.code === '28000') throw new Error('This QR code is invalid, expired, or already rotated.')
    throw new Error(`Could not punch in: ${error.message}`)
  }
  if (!data) throw new Error('The attendance record was not created.')
  return data
}