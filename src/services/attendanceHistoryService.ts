'use client'

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type AttendanceRecord = Database['public']['Tables']['attendance']['Row']
type AttendanceException = Database['public']['Tables']['attendance_exceptions']['Row']
type SystemSettings = Database['public']['Tables']['system_settings']['Row']

export type AgentHistoryStatus = 'present' | 'late' | 'excused'

export type AgentAttendanceHistoryRecord = {
  date: string
  attendance: AttendanceRecord | null
  status: AgentHistoryStatus
  exceptionNote: string | null
}

function getLocalDateKey(timestamp: string) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getLocalMinutes(timestamp: string) {
  const date = new Date(timestamp)
  return date.getHours() * 60 + date.getMinutes()
}

function getSettingMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export async function fetchAgentAttendanceHistory(agentId: string): Promise<AgentAttendanceHistoryRecord[]> {
  if (!agentId.trim()) throw new Error('An agent ID is required to load attendance history.')

  const supabase = createClient()
  const [attendanceResult, exceptionResult, settingsResult] = await Promise.all([
    supabase
      .from('attendance')
      .select('agent_id, time_in, time_out, qr_verified')
      .eq('agent_id', agentId)
      .order('time_in', { ascending: false }),
    supabase
      .from('attendance_exceptions')
      .select('id, agent_id, exception_date, note, granted_by, created_at')
      .eq('agent_id', agentId)
      .order('exception_date', { ascending: false }),
    supabase
      .from('system_settings')
      .select('id, resumption_time, closing_time, late_threshold_minutes, updated_by, updated_at')
      .limit(1)
      .maybeSingle(),
  ])

  if (attendanceResult.error) throw new Error(`Could not load attendance history: ${attendanceResult.error.message}`)
  if (exceptionResult.error) throw new Error(`Could not load excused permissions: ${exceptionResult.error.message}`)
  if (settingsResult.error) throw new Error(`Could not load shift settings: ${settingsResult.error.message}`)

  const settings: SystemSettings | null = settingsResult.data
  const exceptionsByDate = new Map<string, AttendanceException>()
  for (const exception of exceptionResult.data) {
    if (!exceptionsByDate.has(exception.exception_date)) {
      exceptionsByDate.set(exception.exception_date, exception)
    }
  }

  const attendanceByDate = new Map<string, AttendanceRecord>()
  for (const record of attendanceResult.data) {
    const date = getLocalDateKey(record.time_in)
    if (!attendanceByDate.has(date)) attendanceByDate.set(date, record)
  }

  const dates = new Set([...attendanceByDate.keys(), ...exceptionsByDate.keys()])
  const startMinutes = settings ? getSettingMinutes(settings.resumption_time) : null
  const lateAtMinutes = startMinutes === null
    ? null
    : startMinutes + (settings?.late_threshold_minutes ?? 0)

  return [...dates].sort((left, right) => right.localeCompare(left)).map((date) => {
    const attendance = attendanceByDate.get(date) ?? null
    const exception = exceptionsByDate.get(date) ?? null
    const isLate = Boolean(
      attendance && lateAtMinutes !== null && getLocalMinutes(attendance.time_in) > lateAtMinutes,
    )

    return {
      date,
      attendance,
      status: exception ? 'excused' : isLate ? 'late' : 'present',
      exceptionNote: exception?.note ?? null,
    }
  }) 
}