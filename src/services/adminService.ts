import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type AttendanceRecord = Database['public']['Tables']['attendance']['Row']

export type AdminAgentStatus = 'active' | 'completed' | 'absent'

export type AdminAgentAttendance = {
  agentId: Profile['id']
  fullName: Profile['full_name']
  attendance: AttendanceRecord | null
  status: AdminAgentStatus
}

export type AdminAttendanceOverview = {
  agents: AdminAgentAttendance[]
  metrics: {
    totalAgents: number
    presentToday: number
    notClockedIn: number
  }
}

export type AttendanceReportRange = 'daily' | 'weekly' | 'monthly'
export type AttendanceReportStatus = 'Present' | 'Late' | 'Absent' | 'On Leave' | 'Missing Clock-Out'

export type AttendanceExportRow = {
  agentId: Profile['id']
  fullName: Profile['full_name']
  team: string
  shift: string
  clockIn: string | null
  status: AttendanceReportStatus
  latenessMinutes: number
}

export type AttendanceExportSummary = {
  totalScheduledStaff: number
  totalPresent: number
  totalLate: number
  totalAbsent: number
}

export type AttendanceExportReport = {
  range: AttendanceReportRange
  rangeLabel: string
  generatedAt: string
  summary: AttendanceExportSummary
  rows: AttendanceExportRow[]
}

function getTodayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start: start.toISOString(), end: end.toISOString() }
}

function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getLocalMinutes(timestamp: string) {
  const value = new Date(timestamp)
  return value.getHours() * 60 + value.getMinutes()
}

function getSettingMinutes(value: string) {
  const [hours = 0, minutes = 0] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function getReportRangeWindow(range: AttendanceReportRange) {
  const now = new Date()

  if (range === 'daily') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      label: `Daily • ${start.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`,
    }
  }

  if (range === 'weekly') {
    const start = new Date(now)
    const day = start.getDay()
    const diff = (day === 0 ? -6 : 1 - day)
    start.setDate(start.getDate() + diff)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(end.getDate() + 7)

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      label: `Weekly • ${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${new Date(end.getTime() - 86400000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`,
    }
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: `Monthly • ${start.toLocaleDateString([], { month: 'long', year: 'numeric' })}`,
  }
}

export async function fetchAllAgentsAttendance(): Promise<AdminAttendanceOverview> {
  const supabase = createClient()
  const { start, end } = getTodayRange()

  const [profilesResult, attendanceResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'agent')
      .order('full_name', { ascending: true }),
    supabase
      .from('attendance')
      .select('agent_id, time_in, time_out, qr_verified')
      .gte('time_in', start)
      .lt('time_in', end)
      .order('time_in', { ascending: false }),
  ])

  if (profilesResult.error) {
    throw new Error(`Could not load agents: ${profilesResult.error.message}`)
  }
  if (attendanceResult.error) {
    throw new Error(`Could not load today's attendance: ${attendanceResult.error.message}`)
  }

  const latestAttendanceByAgent = new Map<string, AttendanceRecord>()
  for (const record of attendanceResult.data) {
    if (!latestAttendanceByAgent.has(record.agent_id)) {
      latestAttendanceByAgent.set(record.agent_id, record)
    }
  }

  const agents: AdminAgentAttendance[] = profilesResult.data.map((profile) => {
    const attendance = latestAttendanceByAgent.get(profile.id) ?? null

    return {
      agentId: profile.id,
      fullName: profile.full_name,
      attendance,
      status: !attendance ? 'absent' : attendance.time_out ? 'completed' : 'active',
    }
  })

  const presentToday = agents.filter((agent) => agent.attendance !== null).length

  return {
    agents,
    metrics: {
      totalAgents: agents.length,
      presentToday,
      notClockedIn: agents.length - presentToday,
    },
  }
}

export async function fetchAttendanceExportReport(range: AttendanceReportRange): Promise<AttendanceExportReport> {
  const supabase = createClient()
  const { start, end, label } = getReportRangeWindow(range)

  const [profilesResult, attendanceResult, exceptionResult, settingsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'agent')
      .order('full_name', { ascending: true }),
    supabase
      .from('attendance')
      .select('agent_id, time_in, time_out, qr_verified')
      .gte('time_in', start)
      .lt('time_in', end)
      .order('time_in', { ascending: false }),
    supabase
      .from('attendance_exceptions')
      .select('agent_id, exception_date, note, granted_by, created_at')
      .gte('exception_date', getDateKey(new Date(start)))
      .lt('exception_date', getDateKey(new Date(end)))
      .order('exception_date', { ascending: false }),
    supabase
      .from('system_settings')
      .select('resumption_time, closing_time, late_threshold_minutes')
      .limit(1)
      .maybeSingle(),
  ])

  if (profilesResult.error) {
    throw new Error(`Could not load agents for export: ${profilesResult.error.message}`)
  }
  if (attendanceResult.error) {
    throw new Error(`Could not load attendance report data: ${attendanceResult.error.message}`)
  }
  if (exceptionResult.error) {
    throw new Error(`Could not load exception data for export: ${exceptionResult.error.message}`)
  }
  if (settingsResult.error) {
    throw new Error(`Could not load settings for export: ${settingsResult.error.message}`)
  }

  const settings = settingsResult.data
  const lateThresholdMinutes = settings?.late_threshold_minutes ?? 10
  const resumptionMinutes = settings ? getSettingMinutes(settings.resumption_time) : 8 * 60
  const shiftLabel = settings ? `${settings.resumption_time.slice(0, 5)}–${settings.closing_time.slice(0, 5)}` : 'Standard'

  const latestAttendanceByAgent = new Map<string, AttendanceRecord>()
  for (const record of attendanceResult.data) {
    if (!latestAttendanceByAgent.has(record.agent_id)) {
      latestAttendanceByAgent.set(record.agent_id, record)
    }
  }

  const exceptionsByAgent = new Map<string, string>()
  for (const exception of exceptionResult.data) {
    if (!exceptionsByAgent.has(exception.agent_id)) {
      exceptionsByAgent.set(exception.agent_id, exception.exception_date)
    }
  }

  const rows: AttendanceExportRow[] = profilesResult.data.map((profile) => {
    const attendance = latestAttendanceByAgent.get(profile.id) ?? null
    const hasException = exceptionsByAgent.has(profile.id)
    const attendanceMinutes = attendance ? getLocalMinutes(attendance.time_in) : null
    const latenessMinutes = attendance && attendanceMinutes !== null && attendanceMinutes > resumptionMinutes + lateThresholdMinutes
      ? attendanceMinutes - (resumptionMinutes + lateThresholdMinutes)
      : 0

    let status: AttendanceReportStatus = 'Absent'

    if (hasException && !attendance) {
      status = 'On Leave'
    } else if (attendance && attendance.time_out === null) {
      status = 'Missing Clock-Out'
    } else if (attendance && latenessMinutes > 0) {
      status = 'Late'
    } else if (attendance) {
      status = 'Present'
    }

    return {
      agentId: profile.id,
      fullName: profile.full_name,
      team: 'Operations',
      shift: shiftLabel,
      clockIn: attendance?.time_in ?? null,
      status,
      latenessMinutes,
    }
  })

  const summary: AttendanceExportSummary = {
    totalScheduledStaff: rows.length,
    totalPresent: rows.filter((row) => row.status === 'Present').length,
    totalLate: rows.filter((row) => row.status === 'Late').length,
    totalAbsent: rows.filter((row) => row.status === 'Absent' || row.status === 'On Leave' || row.status === 'Missing Clock-Out').length,
  }

  return {
    range,
    rangeLabel: label,
    generatedAt: new Date().toISOString(),
    summary,
    rows,
  }
}