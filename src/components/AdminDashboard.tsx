'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock3, RefreshCw, Users, XCircle } from 'lucide-react'
import {
  fetchAllAgentsAttendance,
  type AdminAgentAttendance,
  type AdminAgentStatus,
  type AdminAttendanceOverview,
} from '@/services/adminService'
import { cn } from '@/lib/utils'
import AdminAttendanceExport from '@/components/AdminAttendanceExport'
import AdminSettingsPanel from '@/components/AdminSettingsPanel'
import AdminQRCodeGenerator from '@/components/AdminQRCodeGenerator'

type AdminDashboardProps = {
  adminName: string
}

const statusStyles: Record<AdminAgentStatus, string> = {
  active: 'bg-green-50 text-green-700',
  completed: 'bg-blue-50 text-blue-700',
  absent: 'bg-slate-100 text-slate-600',
}

const statusLabels: Record<AdminAgentStatus, string> = {
  active: 'Active',
  completed: 'Completed Shift',
  absent: 'Absent / Pending',
}

function formatTimestamp(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function AgentRow({ agent }: { agent: AdminAgentAttendance }) {
  return (
    <tr className="border-t border-slate-100 text-sm">
      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
        {agent.fullName || 'Unnamed agent'}
      </td>
      <td className="px-4 py-3">
        <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', statusStyles[agent.status])}>
          {statusLabels[agent.status]}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
        {formatTimestamp(agent.attendance?.time_in ?? null)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
        {formatTimestamp(agent.attendance?.time_out ?? null)}
      </td>
      <td className="px-4 py-3">
        {agent.attendance ? (
          <span className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium',
            agent.attendance.qr_verified ? 'text-green-700' : 'text-amber-700',
          )}>
            {agent.attendance.qr_verified
              ? <CheckCircle2 className="h-4 w-4" />
              : <XCircle className="h-4 w-4" />}
            {agent.attendance.qr_verified ? 'Verified' : 'Not verified'}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
    </tr>
  )
}

function Metric({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number | null
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className={cn('rounded-lg p-3', accent)}>{icon}</span>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value ?? '—'}</p>
      </div>
    </div>
  )
}

export default function AdminDashboard({ adminName }: AdminDashboardProps) {
  const [overview, setOverview] = useState<AdminAttendanceOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    let active = true

    void fetchAllAgentsAttendance()
      .then((data) => {
        if (!active) return
        setOverview(data)
        setErrorMessage(null)
        setUpdatedAt(new Date())
        setIsLoading(false)
        setIsRefreshing(false)
      })
      .catch((error: unknown) => {
        if (!active) return
        setErrorMessage(error instanceof Error ? error.message : 'Could not load attendance overview.')
        setIsLoading(false)
        setIsRefreshing(false)
      })

    return () => {
      active = false
    }
  }, [refreshCount])

  function refresh() {
    setErrorMessage(null)
    setIsRefreshing(true)
    setRefreshCount((count) => count + 1)
  }

  return (
    <section id="admin-overview-module" className="scroll-mt-24 space-y-6" aria-labelledby="admin-dashboard-heading">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-blue-700">Admin oversight</p>
          <h2 id="admin-dashboard-heading" className="mt-1 text-2xl font-bold text-slate-900">
            Attendance overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">Welcome, {adminName}</p>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="hidden text-xs text-slate-500 sm:inline">
              Updated {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={isRefreshing || isLoading}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </header>

      {errorMessage && (
        <div role="alert" className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{errorMessage}</span>
          <button type="button" onClick={refresh} className="shrink-0 font-semibold underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric
          label="Total agents"
          value={overview?.metrics.totalAgents ?? null}
          icon={<Users className="h-5 w-5" />}
          accent="bg-blue-50 text-blue-700"
        />
        <Metric
          label="Present today"
          value={overview?.metrics.presentToday ?? null}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="bg-green-50 text-green-700"
        />
        <Metric
          label="Not clocked in"
          value={overview?.metrics.notClockedIn ?? null}
          icon={<Clock3 className="h-5 w-5" />}
          accent="bg-slate-100 text-slate-700"
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="agent-attendance-heading">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <h3 id="agent-attendance-heading" className="font-bold text-slate-900">Agent attendance</h3>
            <p className="mt-1 text-sm text-slate-500">Today&apos;s check-in, shift, and QR status</p>
          </div>
          {isRefreshing && <span className="text-xs text-slate-500">Refreshing…</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Agent</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Time in</th>
                <th scope="col" className="px-4 py-3">Time out</th>
                <th scope="col" className="px-4 py-3">QR verification</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">Loading agent attendance…</td></tr>
              ) : overview?.agents.length ? (
                overview.agents.map((agent) => <AgentRow key={agent.agentId} agent={agent} />)
              ) : (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No agents found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AdminQRCodeGenerator />

      <AdminAttendanceExport />

      <AdminSettingsPanel
        agents={overview?.agents.map((agent) => ({ id: agent.agentId, fullName: agent.fullName })) ?? []}
        onRefresh={refresh}
      />
    </section>
  )
}