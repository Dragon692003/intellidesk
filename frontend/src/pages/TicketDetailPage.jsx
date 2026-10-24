import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Loader2, Send, ArrowLeft, Bot, User, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow, format } from 'date-fns'
import { ticketService } from '../services/ticketService'
import { userService } from '../services/userService'
import { useAuthStore } from '../store/authStore'

const CATEGORY_BADGES = {
  'Account & Access': 'bg-blue-100 text-blue-700',
  'Technical Issue': 'bg-red-100 text-red-700',
  'Billing & Payments': 'bg-green-100 text-green-700',
  'Bug Report': 'bg-orange-100 text-orange-700',
}

const AGENT_CATEGORY_BY_EMAIL = {
  'kushisonu32@gmail.com': 'Account & Access',
  'isti@gmail.com': 'Technical Issue',
  'ameen@gmail.com': 'Billing & Payments',
  'yashu@gmail.com': 'Bug Report',
}

const statusColors = {
  Open: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-600',
}

const priorityColors = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-orange-100 text-orange-700',
  Low: 'bg-green-100 text-green-700',
}

function CategoryBadge({ category }) {
  return <span className={`badge ${CATEGORY_BADGES[category] || 'bg-gray-100 text-gray-600'}`}>{category || 'Uncategorized'}</span>
}

export default function TicketDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [comment, setComment] = useState('')
  const [statusEdit, setStatusEdit] = useState('')
  const [assignedAgentId, setAssignedAgentId] = useState('')

  const isAgent = user?.role === 'agent' || user?.role === 'admin'
  const isAdmin = user?.role === 'admin'

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketService.getById(id),
  })

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => ticketService.getComments(id),
  })

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: userService.getAgents,
    enabled: isAdmin,
  })

  useEffect(() => {
    if (!ticket) return
    setStatusEdit(ticket.status || '')
    setAssignedAgentId(ticket.assigned_agent_id || '')
  }, [ticket])

  const agentOptions = useMemo(() => {
    return agents.map((agent) => ({
      ...agent,
      handledCategory: AGENT_CATEGORY_BY_EMAIL[agent.email] || 'Unassigned',
    }))
  }, [agents])

  const commentMutation = useMutation({
    mutationFn: (data) => ticketService.addComment(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['comments', id])
      qc.invalidateQueries(['ticket', id])
      setComment('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data) => ticketService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['ticket', id])
      toast.success('Ticket updated')
    },
  })

  const submitComment = () => {
    if (!comment.trim()) return
    commentMutation.mutate({ comment, ai_generated: false })
  }

  const saveAssignment = () => {
    updateMutation.mutate({ assigned_agent_id: assignedAgentId || null })
  }

  const ticketErrorStatus = error?.response?.status

  if (isLoading) return <div className="flex justify-center py-20 text-gray-400">Loading ticket...</div>
  if (ticketErrorStatus === 403) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Access denied</h2>
        <p className="text-sm text-gray-500 mt-2">
          You can only view and manage tickets assigned to your category.
        </p>
        <button onClick={() => navigate('/tickets')} className="btn-primary mt-4">
          Back to tickets
        </button>
      </div>
    )
  }
  if (!ticket) return <div className="text-center py-20 text-gray-400">Ticket not found</div>

  const selectedAgent = agentOptions.find((agent) => agent.id === ticket.assigned_agent_id)
  const resolvedAssignedName = ticket.assigned_agent_name || selectedAgent?.name || 'Unassigned'
  const resolvedAssignedCategory = ticket.assigned_agent_category || selectedAgent?.handledCategory || 'Unassigned'
  const hasAssignmentChanged = assignedAgentId !== (ticket.assigned_agent_id || '')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} /> Back to tickets
      </button>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{ticket.title}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`badge ${statusColors[ticket.status]}`}>{ticket.status}</span>
              <span className={`badge ${priorityColors[ticket.priority]}`}>{ticket.priority}</span>
              <CategoryBadge category={ticket.category} />
              {ticket.ai_suggested_category && ticket.ai_suggested_category !== ticket.category && (
                <span className="badge bg-brand-100 text-brand-700">
                  <Sparkles size={10} className="mr-1" /> AI: {ticket.ai_suggested_category}
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Assigned Agent</p>
                <p className="mt-1 font-medium text-gray-900">{resolvedAssignedName}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Agent Handles</p>
                <p className="mt-1 font-medium text-gray-900">{resolvedAssignedCategory}</p>
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          </div>

          <div className="shrink-0 space-y-3 min-w-56">
            {isAgent && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Update Status</label>
                <select
                  className="input text-sm"
                  value={statusEdit || ticket.status}
                  onChange={(e) => setStatusEdit(e.target.value)}
                >
                  {['Open', 'In Progress', 'Resolved', 'Closed'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={() => updateMutation.mutate({ status: statusEdit || ticket.status })}
                  className="btn-primary w-full justify-center text-xs py-1.5"
                  disabled={updateMutation.isPending}
                >
                  Save Status
                </button>
              </div>
            )}

            {isAdmin && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Reassign Agent</label>
                <div className="relative">
                  <select
                    className="input text-sm pr-10"
                    value={assignedAgentId}
                    onChange={(e) => setAssignedAgentId(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {agentOptions.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} - {agent.handledCategory}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <button
                  onClick={saveAssignment}
                  className="btn-secondary w-full justify-center text-xs py-1.5"
                  disabled={updateMutation.isPending || !hasAssignmentChanged}
                >
                  {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  {updateMutation.isPending ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4 border-t border-gray-100 pt-4">
          Created {format(new Date(ticket.created_at), 'PPpp')} · Updated {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
        </p>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Conversation ({comments.length})</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {comments.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">No replies yet. Be the first to respond.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className={`px-6 py-4 ${c.is_agent_reply ? 'bg-blue-50/50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${c.is_agent_reply ? 'bg-brand-600' : 'bg-gray-200'}`}>
                    {c.is_agent_reply ? <Bot size={14} className="text-white" /> : <User size={14} className="text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{c.is_agent_reply ? 'Agent' : 'Customer'}</span>
                      {c.ai_generated && (
                        <span className="badge bg-brand-100 text-brand-600 text-xs">
                          <Sparkles size={10} className="mr-1" /> AI-assisted
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.comment}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-3">Add Reply</h3>

        <textarea
          className="input min-h-28 resize-y mb-3"
          placeholder="Type your reply..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="flex justify-end">
          <button
            onClick={submitComment}
            className="btn-primary"
            disabled={!comment.trim() || commentMutation.isPending}
          >
            {commentMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
            {commentMutation.isPending ? 'Sending...' : 'Send Reply'}
          </button>
        </div>
      </div>
    </div>
  )
}
