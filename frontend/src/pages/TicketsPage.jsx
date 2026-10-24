import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PlusCircle, Search, BarChart3 } from 'lucide-react'
import { ticketService } from '../services/ticketService'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '../store/authStore'

const CATEGORY_BADGES = {
  'Account & Access': 'bg-blue-100 text-blue-700',
  'Technical Issue': 'bg-red-100 text-red-700',
  'Billing & Payments': 'bg-green-100 text-green-700',
  'Bug Report': 'bg-orange-100 text-orange-700',
}

function StatusBadge({ status }) {
  const map = {
    Open: 'bg-blue-100 text-blue-700',
    'In Progress': 'bg-yellow-100 text-yellow-700',
    Resolved: 'bg-green-100 text-green-700',
    Closed: 'bg-gray-100 text-gray-600',
  }
  return <span className={`badge ${map[status] || 'bg-gray-100'}`}>{status}</span>
}

function PriorityBadge({ priority }) {
  const map = { High: 'bg-red-100 text-red-700', Medium: 'bg-orange-100 text-orange-700', Low: 'bg-green-100 text-green-700' }
  return <span className={`badge ${map[priority] || ''}`}>{priority}</span>
}

function CategoryBadge({ category }) {
  return <span className={`badge ${CATEGORY_BADGES[category] || 'bg-gray-100 text-gray-600'}`}>{category || 'Uncategorized'}</span>
}

export default function TicketsPage({ myOnly }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const { user } = useAuthStore()
  const isAgent = user?.role === 'agent'
  const showAssignedOnly = myOnly || isAgent

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', showAssignedOnly, statusFilter, priorityFilter, user?.id],
    queryFn: () => {
      const params = { status: statusFilter || undefined, priority: priorityFilter || undefined }
      if (myOnly) return ticketService.getMy(params)
      if (isAgent) return ticketService.getAssigned(params)
      return ticketService.getAll(params)
    },
  })

  const filtered = tickets.filter((t) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
  )

  const statusSummary = ['Open', 'In Progress', 'Resolved', 'Closed'].map((status) => ({
    status,
    count: tickets.filter((t) => t.status === status).length,
  }))

  return (
    <div className="space-y-4">
      {showAssignedOnly && (
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-brand-600" />
            <h3 className="font-semibold text-gray-900">{isAgent ? 'Your Assigned Ticket Status' : 'Your Ticket Status'}</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statusSummary.map((item) => (
              <div key={item.status} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500 mb-1">{item.status}</p>
                <p className="text-2xl font-bold text-gray-900">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {['Open', 'In Progress', 'Resolved', 'Closed'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input w-auto" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All Priorities</option>
            {['High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <Link to="/tickets/new" className="btn-primary shrink-0">
          <PlusCircle size={16} /> New Ticket
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Assigned Agent</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading tickets...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No tickets found</td></tr>
              ) : filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/tickets/${t.id}`} className="font-medium text-gray-900 hover:text-brand-600 transition-colors">
                      {t.title}
                    </Link>
                    {t.ai_suggested_category && (
                      <span className="ml-2 text-xs text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">
                        AI: {t.ai_suggested_category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <CategoryBadge category={t.category} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{t.assigned_agent_name || 'Unassigned'}</div>
                    {t.assigned_agent_category ? (
                      <p className="text-xs text-gray-500 mt-1">Handles {t.assigned_agent_category}</p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">No agent assigned</p>
                    )}
                  </td>
                  <td className="px-4 py-4"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-4"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-4 text-gray-400">
                    {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
