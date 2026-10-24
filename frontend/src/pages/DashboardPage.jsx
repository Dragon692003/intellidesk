import { useQuery } from '@tanstack/react-query'
import { Ticket, Users, CheckCircle, Clock, AlertCircle, TrendingUp, Loader2, AlertTriangle } from 'lucide-react'
import { userService } from '../services/userService'
import { ticketService } from '../services/ticketService'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    Open: 'bg-blue-100 text-blue-700',
    'In Progress': 'bg-yellow-100 text-yellow-700',
    Resolved: 'bg-green-100 text-green-700',
    Closed: 'bg-gray-100 text-gray-600',
  }
  return <span className={`badge ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

function PriorityBadge({ priority }) {
  const map = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-orange-100 text-orange-700',
    Low: 'bg-green-100 text-green-700',
  }
  return <span className={`badge ${map[priority] || ''}`}>{priority}</span>
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: userService.getDashboardStats,
  })
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets-recent'],
    queryFn: () => ticketService.getAll({ limit: 5 }),
  })

  return (
    <div className="space-y-6">
      {statsError && (
        <div className="card border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle size={16} />
          Dashboard metrics are temporarily unavailable. Check that your account has support access.
        </div>
      )}

      {statsLoading ? (
        <div className="card px-4 py-6 text-sm text-gray-500 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          Loading dashboard metrics...
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tickets" value={stats?.total} icon={Ticket} color="bg-brand-600" />
        <StatCard label="Open" value={stats?.open} icon={AlertCircle} color="bg-blue-500" sub="Awaiting response" />
        <StatCard label="In Progress" value={stats?.in_progress} icon={Clock} color="bg-yellow-500" sub="Being worked on" />
        <StatCard label="Resolved" value={stats?.resolved} icon={CheckCircle} color="bg-green-500" sub="Closed successfully" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User/Agent stats */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Users size={18} /> Team</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Users</span>
              <span className="font-medium">{stats?.total_users ?? '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Support Agents</span>
              <span className="font-medium">{stats?.total_agents ?? '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Closed Tickets</span>
              <span className="font-medium">{stats?.closed ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* AI Feature callout */}
        <div className="card p-6 bg-gradient-to-br from-brand-600 to-brand-800 text-white col-span-2">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">AI Features Active</h3>
              <p className="text-brand-100 text-sm mb-3">
                IntelliDesk uses GPT-4o to auto-categorize incoming tickets and generate smart reply drafts for agents — saving hours every day.
              </p>
              <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">✨ Auto Category</span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">💡 Reply Suggestions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Recent Tickets</h3>
          <Link to="/tickets" className="text-sm text-brand-600 hover:underline">View all →</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {ticketsLoading ? (
            <div className="px-6 py-8 text-sm text-gray-400 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Loading recent tickets...
            </div>
          ) : tickets?.length ? tickets.map((t) => (
            <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.category || t.ai_suggested_category || 'Uncategorized'} · {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
              </div>
            </Link>
          )) : (
            <p className="text-center text-gray-400 py-8 text-sm">No tickets yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
