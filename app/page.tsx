import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut, UserCheck, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import AttendanceWidget from '@/components/AttendanceWidget'
import AdminDashboard from '@/components/AdminDashboard'
import AgentHistoryWidget from '@/components/AgentHistoryWidget'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <header className="w-full bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold text-blue-600">NCC Attendance Dashboard</h1>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </form>
      </header>

      {/* Dashboard Body */}
      <div className="flex-1 p-8 max-w-5xl w-full mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {profile?.full_name || user.email || 'Agent'}!</h2>
          <p className="text-slate-500">You are successfully authenticated into the National Call Center system.</p>
          {profileError && (
            <p role="status" className="mt-3 text-sm text-amber-700">
              Profile details are temporarily unavailable.
            </p>
          )}
          {!profile && !profileError && (
            <p role="status" className="mt-3 text-sm text-amber-700">
              No profile has been assigned to this account yet.
            </p>
          )}
        </div>

        {profile?.role === 'admin' ? (
          <AdminDashboard adminName={profile.full_name || user.email || 'Administrator'} />
        ) : (
          <>
            <AttendanceWidget agentId={user.id} />
            <AgentHistoryWidget agentId={user.id} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={cn('bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4', profileError && 'border-amber-300')}>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Account Role</p>
                  <p className="text-lg font-bold capitalize">{profile?.role || 'Not assigned'}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Security Status</p>
                  <p className="text-lg font-bold text-green-600">Active &amp; Secured</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}