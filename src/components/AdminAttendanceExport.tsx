'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Download, FileDown, Printer } from 'lucide-react'
import {
  fetchAttendanceExportReport,
  type AttendanceExportReport,
  type AttendanceReportRange,
} from '@/services/adminService'

const REPORT_RANGES: { value: AttendanceReportRange; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const statusStyles: Record<string, string> = {
  Present: 'bg-emerald-50 text-emerald-700',
  Late: 'bg-amber-50 text-amber-800',
  Absent: 'bg-slate-100 text-slate-700',
  'On Leave': 'bg-blue-50 text-blue-700',
  'Missing Clock-Out': 'bg-rose-50 text-rose-700',
}

function formatClockIn(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatGeneratedDate(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildPrintDocument(report: AttendanceExportReport) {
  const rowsHtml = report.rows.length
    ? report.rows
        .map(
          (row, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(row.fullName || 'Unnamed agent')}</td>
              <td>${escapeHtml(row.agentId.slice(0, 8))}</td>
              <td>${escapeHtml(row.team)}</td>
              <td>${escapeHtml(row.shift)}</td>
              <td>${escapeHtml(formatClockIn(row.clockIn))}</td>
              <td><span class="status-badge ${statusStyles[row.status] ?? 'bg-slate-50 text-slate-700'}">${escapeHtml(row.status)}</span></td>
              <td>${row.latenessMinutes}</td>
            </tr>
          `,
        )
        .join('')
    : '<tr><td colspan="8">No attendance records available for this period.</td></tr>'

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>NCC Attendance ${report.rangeLabel}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 16mm;
          }

          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            background: #ffffff;
            color: #0f172a;
          }

          .report-page {
            max-width: 1100px;
            margin: 0 auto;
            padding: 24px;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #dbeafe;
            padding-bottom: 18px;
            margin-bottom: 20px;
          }

          h1 {
            margin: 0;
            font-size: 28px;
            color: #0f172a;
          }

          .subtitle {
            margin: 8px 0 0;
            color: #475569;
            font-size: 14px;
          }

          .generated {
            text-align: right;
            color: #475569;
            font-size: 12px;
            font-weight: 600;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(180px, 1fr));
            gap: 12px;
            margin: 20px 0 28px;
          }

          .stat-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: #f8fafc;
            padding: 14px 16px;
            min-height: 82px;
          }

          .stat-label {
            display: block;
            font-size: 12px;
            color: #475569;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.1;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e2e8f0;
            font-size: 12px;
          }

          th, td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
            vertical-align: middle;
          }

          thead {
            background: #f1f5f9;
          }

          th {
            color: #334155;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          tbody tr:nth-child(even) {
            background: #f8fafc;
          }

          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border-radius: 999px;
            padding: 6px 10px;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
          }

          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-page">
          <div class="header">
            <div>
              <h1>NCC Attendance Report</h1>
              <p class="subtitle">${escapeHtml(report.rangeLabel)}</p>
            </div>
            <div class="generated">
              <div>Generated</div>
              <div>${escapeHtml(formatGeneratedDate(report.generatedAt))}</div>
            </div>
          </div>

          <div class="summary-grid">
            <div class="stat-card">
              <span class="stat-label">Total Scheduled Staff</span>
              <span class="stat-value">${report.summary.totalScheduledStaff}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Total Present (On Time)</span>
              <span class="stat-value">${report.summary.totalPresent}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Total Late</span>
              <span class="stat-value">${report.summary.totalLate}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Total Absent / On Leave / Missing Clock-Out</span>
              <span class="stat-value">${report.summary.totalAbsent}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Agent Name</th>
                <th>ID</th>
                <th>Team</th>
                <th>Shift</th>
                <th>Clock-In Time</th>
                <th>Status</th>
                <th>Lateness Minutes</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `
}

export default function AdminAttendanceExport() {
  const [range, setRange] = useState<AttendanceReportRange>('daily')
  const [report, setReport] = useState<AttendanceExportReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void fetchAttendanceExportReport(range)
      .then((data) => {
        if (!active) return
        setReport(data)
      })
      .catch((error: unknown) => {
        if (!active) return
        setErrorMessage(error instanceof Error ? error.message : 'Could not load the attendance export report.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [range])

  function handleRangeChange(nextRange: AttendanceReportRange) {
    setRange(nextRange)
    setIsLoading(true)
    setErrorMessage(null)
  }

  function handlePrint() {
    if (!report) {
      return
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!printWindow) {
      window.alert('The browser blocked the print window. Please allow pop-ups and try again.')
      return
    }

    printWindow.document.write(buildPrintDocument(report))
    printWindow.document.close()

    window.setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 300)
  }

  function handleDownloadCsv() {
    if (!report) {
      return
    }

    const header = ['Agent Name', 'ID', 'Team', 'Shift', 'Clock-In Time', 'Status', 'Lateness Minutes']
    const csvRows = report.rows.map((row) => [
      row.fullName || 'Unnamed agent',
      row.agentId,
      row.team,
      row.shift,
      formatClockIn(row.clockIn),
      row.status,
      String(row.latenessMinutes),
    ])

    const csvContent = [header, ...csvRows]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""') }"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `attendance-report-${report.range}-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <section id="export-module" className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="attendance-export-heading">
      <header className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin export</p>
          <h3 id="attendance-export-heading" className="mt-1 text-lg font-bold text-slate-900">
            Attendance report export
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1">
            {REPORT_RANGES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleRangeChange(option.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === option.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!report || isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Print / PDF
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={!report || isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            CSV
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-slate-500">
          <CalendarDays className="h-4 w-4 animate-pulse" />
          Loading export report...
        </div>
      ) : report ? (
        <div className="space-y-6 p-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <p className="text-sm text-slate-500">Report period</p>
              <p className="text-lg font-semibold text-slate-900">{report.rangeLabel}</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
              Generated {formatGeneratedDate(report.generatedAt)}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Scheduled Staff</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{report.summary.totalScheduledStaff}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Present (On Time)</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{report.summary.totalPresent}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Total Late</p>
              <p className="mt-2 text-3xl font-bold text-amber-700">{report.summary.totalLate}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Total Absent / On Leave / Missing Clock-Out</p>
              <p className="mt-2 text-3xl font-bold text-slate-800">{report.summary.totalAbsent}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-3">#</th>
                  <th scope="col" className="px-3 py-3">Agent Name</th>
                  <th scope="col" className="px-3 py-3">ID</th>
                  <th scope="col" className="px-3 py-3">Team</th>
                  <th scope="col" className="px-3 py-3">Shift</th>
                  <th scope="col" className="px-3 py-3">Clock-In Time</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-3 py-3">Lateness Minutes</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, index) => (
                  <tr key={row.agentId} className="border-t border-slate-200">
                    <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">{row.fullName || 'Unnamed agent'}</td>
                    <td className="px-3 py-3 text-slate-600">{row.agentId.slice(0, 8)}</td>
                    <td className="px-3 py-3 text-slate-600">{row.team}</td>
                    <td className="px-3 py-3 text-slate-600">{row.shift}</td>
                    <td className="px-3 py-3 text-slate-600">{formatClockIn(row.clockIn)}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[row.status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{row.latenessMinutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                Open Print / PDF View
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
