import Link from 'next/link'
import { Activity, BarChart3, CalendarClock, History, QrCode, Settings, ShieldCheck } from 'lucide-react'

type DashboardSidebarProps = {
  role: 'admin' | 'agent'
}

export default function DashboardSidebar({ role }: DashboardSidebarProps) {
  const items = role === 'admin'
    ? [
        { id: 'admin-overview-module', label: 'Overview', icon: BarChart3 },
        { id: 'qr-module', label: 'QR Tools', icon: QrCode },
        { id: 'export-module', label: 'Reports', icon: Activity },
        { id: 'settings-module', label: 'Settings', icon: Settings },
      ]
    : [
        { id: 'attendance-module', label: 'Attendance', icon: CalendarClock },
        { id: 'history-module', label: 'History', icon: History },
      ]

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="sticky top-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Modules</p>
        </div>

        <nav className="p-3" aria-label="Dashboard modules">
          <ul className="space-y-2">
            {items.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </a>
              </li>
            ))}

            <li className="pt-2">
              <Link
                href="/auth/signout"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-50 text-red-600">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                Sign out
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  )
}
