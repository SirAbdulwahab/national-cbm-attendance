import type { Database } from '@/lib/supabase/database.types'

type AttendanceRecord = Database['public']['Tables']['attendance']['Row']

export type AttendanceQrCard = {
  id: string
  qr_code: string
  label: string
  qr_value: string
  is_active: boolean
  activated_at: string | null
  created_at: string | null
  updated_at: string | null
}

type AdminQrResponse = {
  items?: AttendanceQrCard[]
  cards?: AttendanceQrCard[]
  success?: boolean
  message?: string
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  const responseText = await response.text()
  let payload: unknown = {}

  try {
    payload = responseText ? JSON.parse(responseText) : {}
  } catch {
    payload = {}
  }

  if (!response.ok) {
    const message = (payload as { message?: string })?.message
    throw new Error(message ?? `Request failed (HTTP ${response.status} ${response.statusText}).`)
  }

  return payload as T
}

export async function fetchAttendanceQrCards(): Promise<AttendanceQrCard[]> {
  const payload = await requestJson<AttendanceQrCard[] | AdminQrResponse>('/api/admin/attendance-qr', {
    method: 'GET',
  })

  if (Array.isArray(payload)) {
    return payload
  }

  return payload.items ?? payload.cards ?? []
}

export async function activateAttendanceQrCard(qrId: string): Promise<AttendanceQrCard[]> {
  const payload = await requestJson<AdminQrResponse>('/api/admin/attendance-qr', {
    method: 'POST',
    body: JSON.stringify({ action: 'activate', qrId }),
  })

  return payload.items ?? payload.cards ?? (await fetchAttendanceQrCards())
}

export async function rotateDailyAttendanceQrToken(): Promise<{ token: string; validDate: string }> {
  return requestJson<{ token: string; validDate: string }>('/api/admin/attendance-qr', {
    method: 'POST',
    body: JSON.stringify({ action: 'legacy-rotate' }),
  })
}

export async function punchInWithAttendanceQr(token: string): Promise<AttendanceRecord> {
  const normalizedToken = token.trim()
  if (!normalizedToken || normalizedToken.length > 128) {
    throw new Error('The QR code is invalid.')
  }

  return requestJson<AttendanceRecord>('/api/attendance/punch-in', {
    method: 'POST',
    body: JSON.stringify({ token: normalizedToken }),
  })
}