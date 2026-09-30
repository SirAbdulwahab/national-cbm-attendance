'use client'

import { BrowserQRCodeReader } from '@zxing/browser'
import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Camera, CheckCircle2, Clock3, Loader2, LogIn, LogOut, X } from 'lucide-react'
import {
  fetchTodayAttendance,
  handlePunchIn,
  handlePunchOut,
  type AttendanceRecord,
} from '@/services/attendanceService'
import { cn } from '@/lib/utils'

type AttendanceWidgetProps = {
  agentId: string
}

type LoadState = 'loading' | 'ready' | 'error'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function formatTime(timestamp: string | null) {
  if (!timestamp) return 'Not recorded'

  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export default function AttendanceWidget({ agentId }: AttendanceWidgetProps) {
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [isScanning, setIsScanning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [now, setNow] = useState<Date | null>(null)
  const [reloadCount, setReloadCount] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let active = true

    void fetchTodayAttendance(agentId)
      .then((record) => {
        if (!active) return
        setAttendance(record)
        setLoadState('ready')
      })
      .catch((error: unknown) => {
        if (!active) return
        setErrorMessage(getErrorMessage(error))
        setLoadState('error')
      })

    return () => {
      active = false
    }
  }, [agentId, reloadCount])

  useEffect(() => {
    const initialTick = window.setTimeout(() => setNow(new Date()), 0)
    const intervalId = window.setInterval(() => setNow(new Date()), 1000)
    return () => {
      window.clearTimeout(initialTick)
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!isScanning || !videoRef.current) return

    let active = true
    let decoded = false
    let controls: { stop: () => void } | undefined
    const reader = new BrowserQRCodeReader()

    void reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, _decodeError, scannerControls) => {
        controls = scannerControls
        if (!active || !result || decoded) return

        decoded = true
        scannerControls.stop()
        setIsScanning(false)
        setIsSubmitting(true)
        setErrorMessage(null)
        setNotice(null)

        void handlePunchIn(agentId, result.getText())
          .then((record) => {
            setAttendance(record)
            setNotice('QR scanned and shift started.')
          })
          .catch((error: unknown) => setErrorMessage(getErrorMessage(error)))
          .finally(() => setIsSubmitting(false))
      })
      .then((scannerControls) => {
        controls = scannerControls
        if (!active) scannerControls.stop()
      })
      .catch((error: unknown) => {
        if (!active) return
        setIsScanning(false)
        setErrorMessage(getErrorMessage(error))
      })

    return () => {
      active = false
      controls?.stop()
    }
  }, [agentId, isScanning])

  const hasCheckedIn = attendance !== null
  const hasCheckedOut = attendance?.time_out !== null && attendance !== null
  const isOnShift = hasCheckedIn && !hasCheckedOut
  const statusLabel = loadState === 'loading'
    ? 'Loading status'
    : loadState === 'error'
      ? 'Unavailable'
      : isOnShift
        ? 'On shift'
        : hasCheckedOut
          ? 'Shift complete'
          : 'Not checked in'

  const elapsedTime = isOnShift && now
    ? formatDuration(now.getTime() - new Date(attendance.time_in).getTime())
    : null

  async function punchOut() {
    setIsSubmitting(true)
    setErrorMessage(null)
    setNotice(null)

    try {
      const record = await handlePunchOut(agentId)
      setAttendance(record)
      setNotice('Shift ended successfully.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="attendance-heading">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div>
          <h2 id="attendance-heading" className="text-lg font-bold text-slate-900">Today&apos;s attendance</h2>
          <p className="mt-1 text-sm text-slate-500">
            {now ? `Local time ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}` : 'Loading local time'}
          </p>
        </div>
        <span className={cn(
          'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold',
          isOnShift ? 'bg-green-50 text-green-700' : hasCheckedOut ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700',
        )}>
          <span className={cn('h-2 w-2 rounded-full', isOnShift ? 'bg-green-500' : hasCheckedOut ? 'bg-slate-400' : 'bg-blue-500')} />
          {statusLabel}
        </span>
      </header>

      <div className="grid gap-4 px-6 py-5 sm:grid-cols-3">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-blue-50 p-2 text-blue-700"><LogIn className="h-5 w-5" /></span>
          <div>
            <p className="text-sm text-slate-500">Check-in</p>
            <p className="mt-1 font-semibold text-slate-900">{attendance ? formatTime(attendance.time_in) : 'Not recorded'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-slate-100 p-2 text-slate-700"><LogOut className="h-5 w-5" /></span>
          <div>
            <p className="text-sm text-slate-500">Check-out</p>
            <p className="mt-1 font-semibold text-slate-900">{formatTime(attendance?.time_out ?? null)}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-slate-100 p-2 text-slate-700"><Clock3 className="h-5 w-5" /></span>
          <div>
            <p className="text-sm text-slate-500">Shift duration</p>
            <p className="mt-1 font-mono font-semibold tabular-nums text-slate-900">{elapsedTime ?? (hasCheckedOut ? 'Complete' : '--:--:--')}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-6 py-4">
        {isScanning && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Position the QR code in view</p>
              <button
                type="button"
                onClick={() => setIsScanning(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                aria-label="Close QR scanner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <video ref={videoRef} className="aspect-video max-h-72 w-full rounded-md bg-slate-950 object-cover" muted playsInline />
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="mb-3 flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{errorMessage}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-3 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />{notice}
          </p>
        )}

        {loadState === 'error' ? (
          <button
            type="button"
            onClick={() => {
              setLoadState('loading')
              setErrorMessage(null)
              setReloadCount((count) => count + 1)
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Retry loading attendance
          </button>
        ) : (
          <div className="flex flex-wrap gap-3">
            {!hasCheckedIn ? (
              <button
                type="button"
                disabled={loadState !== 'ready' || isSubmitting || isScanning}
                onClick={() => {
                  setErrorMessage(null)
                  setNotice(null)
                  setIsScanning(true)
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Scan QR &amp; Punch In
              </button>
            ) : isOnShift ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={punchOut}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Punch Out (End Shift)
              </button>
            ) : (
              <p className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-green-600" /> Attendance is complete for today.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}