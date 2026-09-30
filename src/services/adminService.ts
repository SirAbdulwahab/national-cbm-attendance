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

function getTodayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start: start.toISOString(), end: end.toISOString() }
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