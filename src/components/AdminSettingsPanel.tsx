'use client'

import { useState, useEffect } from 'react'
import { fetchSystemSettings, updateSystemSettings, grantAgentException } from '@/services/adminSettingsService'
import { Settings, UserCheck, Send } from 'lucide-react'

interface AdminSettingsProps {
  agents: any[]
  onRefresh: () => void
}

export default function AdminSettingsPanel({ agents, onRefresh }: AdminSettingsProps) {
  const [resumption, setResumption] = useState('08:00')
  const [closing, setClosing] = useState('17:00')
  const [threshold, setThreshold] = useState(15)
  const [loading, setLoading] = useState(false)

  // Exception form state
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [exceptionDate, setExceptionDate] = useState(new Date().toISOString().split('T')[0])
  const [exceptionNote, setExceptionNote] = useState('')
  const [excuseLoading, setExcuseLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const data = await fetchSystemSettings()
      if (data) {
        setResumption(data.resumption_time?.slice(0, 5) || '08:00')
        setClosing(data.closing_time?.slice(0, 5) || '17:00')
        setThreshold(data.late_threshold_minutes || 15)
      }
    }
    load()
  }, [])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      // Calls the service without passing a hardcoded ID string
      await updateSystemSettings(resumption, closing, Number(threshold))
      alert('System settings updated successfully!')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGrantExceptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAgentId || !exceptionNote) {
      alert('Please select an agent and provide an exception note.')
      return
    }
    try {
      setExcuseLoading(true)
      await grantAgentException(selectedAgentId, exceptionDate, exceptionNote)
      alert('Exception / Permission granted successfully!')
      setExceptionNote('')
      onRefresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setExcuseLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Shift Settings Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-blue-600" /> Shift & Punctuality Configuration
        </h3>
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Resumption Time</label>
            <input
              type="time"
              value={resumption}
              onChange={(e) => setResumption(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Closing Time</label>
            <input
              type="time"
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Late Threshold (Minutes)</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Saving...' : 'Save System Settings'}
          </button>
        </form>
      </div>

      {/* Grant Exceptions / Permission Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
          <UserCheck className="w-5 h-5 text-green-600" /> Grant Permission / Exception
        </h3>
        <form onSubmit={handleGrantExceptionSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Agent</label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Choose Agent --</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>{ag.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={exceptionDate}
              onChange={(e) => setExceptionDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason / Note (e.g., Medical leave, approved call)</label>
            <textarea
              value={exceptionNote}
              onChange={(e) => setExceptionNote(e.target.value)}
              placeholder="Enter approval details..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
          </div>
          <button
            type="submit"
            disabled={excuseLoading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> {excuseLoading ? 'Granting...' : 'Grant Excused Status'}
          </button>
        </form>
      </div>
    </div>
  )
}