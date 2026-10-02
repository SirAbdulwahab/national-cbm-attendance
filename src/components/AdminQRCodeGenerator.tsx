'use client'

import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { AlertCircle, CheckCircle2, Loader2, Printer, RefreshCw } from 'lucide-react'
import { activateAttendanceQrCard, fetchAttendanceQrCards, type AttendanceQrCard } from '@/services/attendanceQrService'

function formatTimestamp(value: string | null) {
  if (!value) return 'Never'

  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function AdminQRCodeGenerator() {
  const [cards, setCards] = useState<AttendanceQrCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [printSelection, setPrintSelection] = useState<string | null>(null)

  async function loadCards() {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const payload = await fetchAttendanceQrCards()
      setCards(Array.isArray(payload) ? payload : [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load the static QR cards.')
    } finally {
      setIsLoading(false)
    }
  }

  async function activateCard(cardId: string) {
    setIsUpdating(cardId)
    setErrorMessage(null)

    try {
      const payload = await activateAttendanceQrCard(cardId)
      setCards(payload)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not activate the selected QR card.')
    } finally {
      setIsUpdating(null)
    }
  }

  useEffect(() => {
    let isActive = true

    const loadInitialCards = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const payload = await fetchAttendanceQrCards()
        if (isActive) {
          setCards(Array.isArray(payload) ? payload : [])
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not load the static QR cards.')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialCards()

    return () => {
      isActive = false
    }
  }, [])

  const activeCard = useMemo(
    () => cards.find((card) => card.is_active) ?? null,
    [cards],
  )

  const cardsToPrint = printSelection === 'all'
    ? cards
    : cards.filter((card) => card.id === printSelection)

  useEffect(() => {
    if (!printSelection) return

    const clearPrintSelection = () => setPrintSelection(null)
    window.addEventListener('afterprint', clearPrintSelection)
    const frameId = window.requestAnimationFrame(() => window.print())

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('afterprint', clearPrintSelection)
    }
  }, [printSelection])

  function printCards(cardId?: string) {
    setPrintSelection(cardId ?? 'all')
  }

  return (
    <section id="qr-module" className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="attendance-qr-heading">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h3 id="attendance-qr-heading" className="font-bold text-slate-900">Static QR card management</h3>
          <p className="mt-1 text-sm text-slate-500">QR-001, QR-002, and QR-003</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadCards()}
            disabled={isLoading}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
          <button
            type="button"
            onClick={() => printCards()}
            disabled={!cards.length || isLoading}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Print cards
          </button>
        </div>
      </header>

      <div className="space-y-4 p-5">
        {activeCard && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="font-semibold">Active card:</span> {activeCard.qr_code} • {activeCard.label}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading QR cards...
          </div>
        ) : cards.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {cards.map((card) => (
              <div key={card.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{card.qr_code}</h4>
                    <p className="mt-1 text-sm text-slate-500">{card.label}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${card.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                    {card.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <QRCodeSVG value={card.qr_value} size={170} level="H" includeMargin />
                </div>

                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-medium text-slate-700">Value:</span> {card.qr_value}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">Activated:</span> {formatTimestamp(card.activated_at)}
                  </p>
                </div>

                <div className="mt-4 flex gap-2">
                  {!card.is_active && (
                    <button
                      type="button"
                      onClick={() => void activateCard(card.id)}
                      disabled={isUpdating === card.id}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdating === card.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {isUpdating === card.id ? 'Setting active...' : 'Set as Active'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => printCards(card.id)}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <Printer className="h-4 w-4" />
                    Print card
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : !errorMessage ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
            <p className="font-semibold text-slate-800">No QR cards found</p>
            <p className="mt-1 text-sm text-slate-500">
              Add QR-001, QR-002, and QR-003 in Supabase, then refresh this panel.
            </p>
          </div>
        ) : null}

        {errorMessage && (
          <div role="alert" className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{errorMessage}
            </p>
            <button
              type="button"
              onClick={() => void loadCards()}
              className="shrink-0 font-semibold underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {cards.length > 0 && (
        <div id="qr-print-layout" className="qr-print-layout">
          <header className="qr-print-header">
            <h1>Physical Attendance QR Cards</h1>
            <p>Official cards for shift check-in</p>
          </header>
          <div className="qr-print-grid">
            {cardsToPrint.map((card) => (
              <article className="qr-print-card" key={`print-${card.id}`}>
                <p className="qr-print-label">{card.label || 'Attendance card'}</p>
                <h2>{card.qr_code}</h2>
                <div className="qr-print-code">
                  <QRCodeSVG value={card.qr_value} size={220} level="H" includeMargin />
                </div>
                <p className="qr-print-instructions">Scan to clock-in for shift</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}