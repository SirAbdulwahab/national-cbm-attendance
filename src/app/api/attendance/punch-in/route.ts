import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('You must be signed in to use attendance QR codes.')
  }

  return { supabase, user }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = typeof body?.token === 'string' ? body.token.trim() : ''

    if (!token || token.length > 128) {
      throw new Error('The QR code is invalid.')
    }

    const { supabase, user } = await getAuthenticatedUser()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || profile?.role !== 'agent') {
      throw new Error('Only agent accounts can punch in.')
    }

    const { data, error } = await supabase.rpc('punch_in_with_qr', { p_qr_token: token })

    if (error) {
      if (error.code === '23505') {
        throw new Error('Attendance has already been recorded for today.')
      }
      if (error.code === '28000') {
        throw new Error('This QR code is invalid, expired, or already rotated.')
      }
      throw new Error(`Could not punch in: ${error.message}`)
    }

    if (!data) {
      throw new Error('The attendance record was not created.')
    }

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not punch in with the QR code.'
    return NextResponse.json({ message }, { status: 400 })
  }
}
