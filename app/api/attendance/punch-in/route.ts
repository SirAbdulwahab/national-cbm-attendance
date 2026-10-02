import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

class PunchInError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'PunchInError'
  }
}

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get('authorization')
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1].trim()
  const supabase = await createClient(bearerToken)
  const { data: { user }, error } = await supabase.auth.getUser(bearerToken)

  if (error || !user) {
    throw new PunchInError('Your session is missing or has expired. Please sign in again, then scan the QR code.', 401)
  }

  return { supabase, user }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = typeof body?.token === 'string' ? body.token.trim() : ''

    if (!token || token.length > 128) {
      throw new PunchInError('The scanned QR code is invalid. Please scan an active attendance card.', 400)
    }

    const { supabase, user } = await getAuthenticatedUser(request)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || profile?.role !== 'agent') {
      throw new PunchInError('This account is not set up as an agent and cannot check in.', 403)
    }

    const { data, error } = await supabase.rpc('punch_in_with_qr', { p_qr_token: token })

    if (error) {
      if (error.code === '23505') {
        throw new PunchInError('Attendance has already been recorded for today.', 409)
      }
      if (error.code === '28000') {
        throw new PunchInError('This QR code is invalid or expired. Please scan the currently active attendance card.', 400)
      }
      console.error('Attendance punch-in RPC failed:', error.message)
      throw new PunchInError('We could not record your check-in. Please try again or contact an administrator.', 500)
    }

    if (!data) {
      throw new PunchInError('The attendance record was not created. Please try again.', 500)
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof PunchInError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    console.error('Unexpected attendance punch-in error:', error)
    return NextResponse.json(
      { message: 'We could not complete check-in right now. Please try again.' },
      { status: 500 },
    )
  }
}