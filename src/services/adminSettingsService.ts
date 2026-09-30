'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type SystemSettings = Database['public']['Tables']['system_settings']['Row']

const settingsColumns = 'id, resumption_time, closing_time, late_threshold_minutes, updated_by, updated_at' as const

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('You must be signed in to perform this action.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'admin') throw new Error('Administrator access is required.')
  return { supabase, adminId: user.id }
}

function validateSettings(resumption: string, closing: string, threshold: number) {
  const validTime = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/
  if (!validTime.test(resumption) || !validTime.test(closing)) throw new Error('Enter valid 24-hour shift times.')
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 1440) {
    throw new Error('Late threshold must be a whole number between 0 and 1440.')
  }
}

export async function fetchSystemSettings(): Promise<SystemSettings | null> {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('system_settings')
    .select(settingsColumns)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Could not load system settings: ${error.message}`)
  return data
}

export async function updateSystemSettings(
  resumption: string,
  closing: string,
  threshold: number,
): Promise<SystemSettings> {
  validateSettings(resumption, closing, threshold)
  const { supabase, adminId } = await requireAdmin()
  const { data: currentSettings, error: fetchError } = await supabase
    .from('system_settings')
    .select(settingsColumns)
    .limit(1)
    .maybeSingle()

  if (fetchError) throw new Error(`Could not find system settings: ${fetchError.message}`)
  if (!currentSettings) throw new Error('No system settings row exists. Apply the settings migration first.')

  const { data, error } = await supabase
    .from('system_settings')
    .update({
      resumption_time: resumption,
      closing_time: closing,
      late_threshold_minutes: threshold,
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', currentSettings.id)
    .select(settingsColumns)
    .maybeSingle()

  if (error) throw new Error(`Could not save system settings: ${error.message}`)
  if (!data) throw new Error('The system settings row was not updated.')

  revalidatePath('/')
  return data
}

export async function grantAgentException(agentId: string, date: string, note: string): Promise<void> {
  const normalizedNote = note.trim()
  if (!agentId.trim()) throw new Error('Select an agent.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error('Select a valid exception date.')
  }
  if (!normalizedNote || normalizedNote.length > 500) throw new Error('Enter a note of up to 500 characters.')

  const { supabase, adminId } = await requireAdmin()
  const { data: agent, error: agentError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', agentId)
    .eq('role', 'agent')
    .maybeSingle()

  if (agentError) throw new Error(`Could not verify the selected agent: ${agentError.message}`)
  if (!agent) throw new Error('The selected account is not an agent.')

  const { error } = await supabase
    .from('attendance_exceptions')
    .upsert({
      agent_id: agent.id,
      exception_date: date,
      note: normalizedNote,
      granted_by: adminId,
    }, { onConflict: 'agent_id,exception_date' })

  if (error) throw new Error(`Could not grant the exception: ${error.message}`)
  revalidatePath('/')
}