'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { AlertCircle, Loader2, QrCode, RefreshCw } from 'lucide-react'
import { rotateDailyAttendanceQrToken } from '@/services/attendanceQrService'

type AttendanceQr = {
  token: string
  validDate: string
}

export default function AdminQRCodeGenerator() {
  const [attendanceQr, setAttendanceQr] = useState<AttendanceQr | null>(null)
  const [isRotating, setIsRotating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function rotateToken() {
    setIsRotating(true)
    setErrorMessage(null)

    try {
      setAttendanceQr(await rotateDailyAttendanceQrToken())
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not generate the attendance QR code.')
    } finally {
      setIsRotating(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="attendance-qr-heading">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h3 id="attendance-qr-heading" className="font-bold text-slate-900">Attendance QR code</h3>
          <p className="mt-1 text-sm text-slate-500">Daily check-in token</p>
        </div>
        <button
          type="button"
          onClick={rotateToken}
          disabled={isRotating}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRotating ? <Loader2 className="h-4 w-4 animate-spin" /> : attendanceQr ? <RefreshCw className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
          {isRotating ? 'Generating…' : attendanceQr ? 'Rotate QR code' : "Generate today's QR"}
        </button>
      </header>

      <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-5 py-6">
        {attendanceQr ? (
          <>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <QRCodeSVG value={attendanceQr.token} size={240} level="H" includeMargin />
            </div>
            <p role="status" className="text-center text-sm text-slate-600">
              Active for {attendanceQr.validDate} UTC. Rotating replaces the previous code.
            </p>
          </>
        ) : (
          <div className="max-w-sm text-center">
            <QrCode className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-sm text-slate-600">Generate a QR code for agents to scan when checking in.</p>
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{errorMessage}
          </p>
        )}
      </div>
    </section>
  )
}