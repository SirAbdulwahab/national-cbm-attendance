import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

export type AttendanceRecord = Database['public']['Tables']['attendance']['Row']

const attendanceColumns = 'agent_id, time_in, time_out, qr_verified' as const

function getTodayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start: start.toISOString(), end: end.toISOString() }
}

function requireAgentId(agentId: string) {
  if (!agentId.trim()) {
    throw new Error('An agent ID is required to access attendance.')
  }
}

export async function fetchTodayAttendance(agentId: string): Promise<AttendanceRecord | null> {
  requireAgentId(agentId)
  const supabase = createClient()
  const { start, end } = getTodayRange()

  const { data, error } = await supabase
    .from('attendance')
    .select(attendanceColumns)
    .eq('agent_id', agentId)
    .gte('time_in', start)
    .lt('time_in', end)
    .order('time_in', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Could not load today's attendance: ${error.message}`)
  }

  return data
}

export async function handlePunchIn(agentId: string, qrPayload: string): Promise<AttendanceRecord> {
  requireAgentId(agentId)
  if (!qrPayload.trim()) {
    throw new Error('Scan a QR code before punching in.')
  }

  const existingAttendance = await fetchTodayAttendance(agentId)
  if (existingAttendance) {
    throw new Error('Attendance has already been recorded for today.')
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('attendance')
    .insert({
      agent_id: agentId,
      time_in: new Date().toISOString(),
      time_out: null,
      qr_verified: true,
    })
    .select(attendanceColumns)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Attendance has already been recorded for today.')
    }
    throw new Error(`Could not punch in: ${error.message}`)
  }

  return data
}

export async function handlePunchOut(agentId: string): Promise<AttendanceRecord> {
  requireAgentId(agentId)
  const attendance = await fetchTodayAttendance(agentId)

  if (!attendance) {
    throw new Error('No attendance record was found for today.')
  }
  if (attendance.time_out) {
    throw new Error('This shift has already been ended.')
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('attendance')
    .update({ time_out: new Date().toISOString() })
    .eq('agent_id', agentId)
    .eq('time_in', attendance.time_in)
    .is('time_out', null)
    .select(attendanceColumns)
    .maybeSingle()

  if (error) {
    throw new Error(`Could not punch out: ${error.message}`)
  }
  if (!data) {
    throw new Error('The shift changed before it could be ended. Refresh and try again.')
  }

  return data
}