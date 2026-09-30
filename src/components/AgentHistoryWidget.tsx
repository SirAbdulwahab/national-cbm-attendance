'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock3, RefreshCw } from 'lucide-react'
import {
  fetchAgentAttendanceHistory,
  type AgentAttendanceHistoryRecord,
  type AgentHistoryStatus,
} from '@/services/attendanceHistoryService'
import { cn } from '@/lib/utils'

type AgentHistoryWidgetProps = {
  agentId: string
}

const statusLabel: Record<AgentHistoryStatus, string> = {
  present: 'Present',
  late: 'Late',
  excused: 'Excused',
}

const statusClass: Record<AgentHistoryStatus, string> = {
  present: 'bg-green-50 text-green-700',
  late: 'bg-amber-50 text-amber-800',
  excused: 'bg-blue-50 text-blue-700',
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(timestamp: string | null | undefined) {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function AgentHistoryWidget({ agentId }: AgentHistoryWidgetProps) {
  const [records, setRecords] = useState<AgentAttendanceHistoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    let active = true
    void fetchAgentAttendanceHistory(agentId)
      .then((data) => {
        if (!active) return
        setRecords(data)
        setErrorMessage(null)
        setIsLoading(false)
        setIsRefreshing(false)
      })
      .catch((error: unknown) => {
        if (!active) return
        setErrorMessage(error instanceof Error ? error.message : 'Could not load attendance history.')
        setIsLoading(false)
        setIsRefreshing(false)
      })

    return () => {
      active = false
    }
  }, [agentId, refreshCount])

  function refresh() {
    setIsRefreshing(true)
    setRefreshCount((count) => count + 1)
  }

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="attendance-history-heading">
      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <div>
          <h3 id="attendance-history-heading" className="font-bold text-slate-900">Attendance history</h3>
          <p className="mt-1 text-sm text-slate-500">Past shifts and excused dates</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isLoading || isRefreshing}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          aria-label="Refresh attendance history"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          Refresh
        </button>
      </header>

      {errorMessage && (
        <p role="alert" className="mx-5 mb-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />{errorMessage}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">Date</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Time in</th>
              <th scope="col" className="px-4 py-3">Time out</th>
              <th scope="col" className="px-4 py-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500"><Clock3 className="mr-2 inline h-4 w-4 animate-pulse" />Loading history…</td></tr>
            ) : records.length ? records.map((record) => (
              <tr key={record.date} className="border-t border-slate-100 text-sm">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{formatDate(record.date)}</td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', statusClass[record.status])}>
                    {record.status === 'present' && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {statusLabel[record.status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatTime(record.attendance?.time_in)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatTime(record.attendance?.time_out)}</td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-600" title={record.exceptionNote ?? undefined}>{record.exceptionNote || '—'}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No attendance history found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}