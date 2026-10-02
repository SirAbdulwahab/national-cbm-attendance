export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut, UserCheck, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import AttendanceWidget from '@/components/AttendanceWidget'
import AdminDashboard from '@/components/AdminDashboard'
import AgentHistoryWidget from '@/components/AgentHistoryWidget'
import DashboardSidebar from '@/components/DashboardSidebar'

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
      <div className="flex-1 p-4 md:p-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
          <DashboardSidebar role={profile?.role === 'admin' ? 'admin' : 'agent'} />

          <div className="flex-1">
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-2xl font-bold text-slate-900">Welcome back, {profile?.full_name || user.email || 'Agent'}!</h2>
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

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className={cn('flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm', profileError && 'border-amber-300')}>
                    <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                      <UserCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Account Role</p>
                      <p className="text-lg font-bold capitalize">{profile?.role || 'Not assigned'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="rounded-lg bg-green-50 p-3 text-green-600">
                      <ShieldCheck className="h-6 w-6" />
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
        </div>
      </div>
    </main>
  )
}