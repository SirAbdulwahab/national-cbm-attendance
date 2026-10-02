import { createHash, randomBytes } from 'node:crypto'
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

async function requireAdmin() {
  const { supabase, user } = await getAuthenticatedUser()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error || profile?.role !== 'admin') {
    throw new Error('Administrator access is required.')
  }

  return { supabase, user }
}

async function listStaticQrCards(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data, error } = await supabase
      .from('attendance_qr')
      .select('*')
      .order('qr_code', { ascending: true })

    if (error) {
      console.warn('Attendance QR cards query failed:', error.message)
      return []
    }

    return data ?? []
  } catch (error) {
    console.warn('Attendance QR cards list failed:', error)
    return []
  }
}

async function activateStaticQrCard(supabase: Awaited<ReturnType<typeof createClient>>, qrId: string, userId: string) {
  try {
    const { data: targetCard, error: targetError } = await supabase
      .from('attendance_qr')
      .select('*')
      .eq('id', qrId)
      .maybeSingle()

    if (targetError) {
      console.warn('Unable to load target QR card:', targetError.message)
      return { items: [], message: 'Unable to locate the selected QR card.' }
    }

    if (!targetCard) {
      return { items: [], message: 'The selected QR card was not found.' }
    }

    const now = new Date().toISOString()

    await supabase
      .from('attendance_qr')
      .update({ is_active: false, updated_at: now })
      .neq('id', '')

    const { error: activateError } = await supabase
      .from('attendance_qr')
      .update({
        is_active: true,
        activated_at: now,
        updated_at: now,
      })
      .eq('id', qrId)

    if (activateError) {
      console.warn('Unable to activate QR card:', activateError.message)
      return { items: [], message: 'Could not activate the selected QR card.' }
    }

    const { error: logError } = await supabase
      .from('qr_activation_logs')
      .insert({
        qr_id: qrId,
        qr_code: targetCard.qr_code,
        activated_by: userId,
        activated_at: now,
        note: `Activated physical card ${targetCard.qr_code}`,
      })

    if (logError) {
      console.warn('QR activation log insert failed:', logError.message)
    }

    const items = await listStaticQrCards(supabase)
    return { items, success: true }
  } catch (error) {
    console.warn('QR activation failed:', error)
    return { items: [], message: 'QR activation could not be completed.' }
  }
}

export async function GET() {
  try {
    const { supabase } = await requireAdmin()
    const items = await listStaticQrCards(supabase)
    return NextResponse.json(items)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load static QR cards.'
    return NextResponse.json({ message }, { status: 400 })
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAdmin()
    const body = await request.json().catch(() => ({}))
    const action = typeof body?.action === 'string' ? body.action : ''
    const qrId = typeof body?.qrId === 'string' ? body.qrId.trim() : ''

    if (action === 'activate' && qrId) {
      const result = await activateStaticQrCard(supabase, qrId, user.id)
      if (result.message) {
        return NextResponse.json({ message: result.message }, { status: 400 })
      }
      return NextResponse.json({ success: true, items: result.items })
    }

    const token = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const validDate = new Date().toISOString().slice(0, 10)

    const { error } = await supabase
      .from('attendance_qr_tokens')
      .upsert({ valid_date: validDate, token_hash: tokenHash, created_by: user.id }, { onConflict: 'valid_date' })

    if (error) {
      throw new Error(`Could not rotate today's QR code: ${error.message}`)
    }

    return NextResponse.json({ token, validDate })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not generate the attendance QR code.'
    return NextResponse.json({ message }, { status: 400 })
  }
}
