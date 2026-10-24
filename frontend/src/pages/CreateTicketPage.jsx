import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Sparkles, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { ticketService } from '../services/ticketService'

const CATEGORIES = [
  'Account & Access',
  'Technical Issue',
  'Billing & Payments',
  'Bug Report',
]

function normalizeDraftText(text) {
  const raw = (text || '').replace(/\r\n/g, '\n').trim()
  if (!raw) return ''

  const lines = raw
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const deduped = []
  for (const line of lines) {
    if (deduped[deduped.length - 1] !== line) {
      deduped.push(line)
    }
  }

  return deduped.join('\n')
}

export default function CreateTicketPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ title: '', description: '', category: '', priority: 'Medium' })
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    const preset = location.state
    if (!preset) {
      setForm({ title: '', description: '', category: '', priority: 'Medium' })
      return
    }

    setForm((current) => ({
      ...current,
      title: preset.title || '',
      description: normalizeDraftText(preset.description),
    }))
  }, [location.state])

  const set = (k) => (e) => {
    const val = e.target.value
    setForm((f) => ({ ...f, [k]: val }))

    // Trigger AI suggestion when title + description are filled
    if ((k === 'title' || k === 'description')) {
      clearTimeout(debounceRef.current)
      const newForm = { ...form, [k]: val }
      if (newForm.title.length > 5 && newForm.description.length > 10) {
        debounceRef.current = setTimeout(() => fetchAiSuggestion(newForm.title, newForm.description), 1000)
      }
    }
  }

  const fetchAiSuggestion = async (title, description) => {
    setAiLoading(true)
    try {
      const result = await ticketService.aiSuggestCategory(title, description)
      setAiSuggestion(result)
    } catch (e) {
      console.log('AI suggestion error:', e)
    } finally {
      setAiLoading(false)
    }
  }
  const applyAiCategory = () => {
    if (aiSuggestion) {
      setForm((f) => ({ ...f, category: aiSuggestion.suggested_category }))
      toast.success('AI category applied!')
    }
  }

  const createMutation = useMutation({
    mutationFn: () => ticketService.create({
      ...form,
      ai_suggested_category: aiSuggestion?.suggested_category || null,
    }),
    onSuccess: (ticket) => {
      toast.success('Ticket created successfully!')
      navigate(`/tickets/${ticket.id}`)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title || !form.description) return toast.error('Title and description are required')
    createMutation.mutate()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8">
        <h2 className="text-xl font-semibold mb-1">Create New Ticket</h2>
        <p className="text-sm text-gray-500 mb-6">Describe your issue and our AI will help categorize it automatically.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input className="input" placeholder="Brief summary of the issue" value={form.title} onChange={set('title')} required />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
            <textarea
              className="input min-h-32 resize-y"
              placeholder="Describe your issue in detail..."
              value={form.description}
              onChange={set('description')}
              required
            />
          </div>

          {/* AI Suggestion Card */}
          {(aiLoading || aiSuggestion) && (
            <div className="border border-brand-200 bg-brand-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-brand-600" />
                <span className="text-sm font-semibold text-brand-700">AI Category Suggestion</span>
                {aiLoading && <Loader2 size={14} className="animate-spin text-brand-500 ml-auto" />}
              </div>
              {aiSuggestion && !aiLoading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{aiSuggestion.suggested_category}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{aiSuggestion.reasoning}</p>
                    </div>
                    <span className={`badge ml-3 ${aiSuggestion.confidence === 'High' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {aiSuggestion.confidence} confidence
                    </span>
                  </div>
                  <button type="button" onClick={applyAiCategory} className="btn-primary text-xs py-1.5">
                    <CheckCircle size={14} /> Apply suggestion
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select className="input" value={form.category} onChange={set('category')}>
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select className="input" value={form.priority} onChange={set('priority')}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
