import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Bot, Loader2, Send, Sparkles, CheckCircle2, Ticket, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { chatService } from '../services/chatService'
import { useAuthStore } from '../store/authStore'

const FALLBACK_WARNING = 'AI Assistant is temporarily unavailable.'

function formatTime(value) {
  return new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function normalizeText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.')
    .trim()
}

function normalizeDraftText(text) {
  const raw = (text || '').replace(/\r\n/g, '\n').trim()
  if (!raw) return ''

  const lines = raw
    .split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean)

  const deduped = []
  for (const line of lines) {
    if (deduped[deduped.length - 1] !== line) {
      deduped.push(line)
    }
  }

  return deduped.join('\n')
}

function sentenceCase(text) {
  const normalized = normalizeText(text)
  if (!normalized) return normalized
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function extractUserMessages(turns) {
  return turns.map((turn) => normalizeText(turn.userMessage)).filter(Boolean)
}

function buildConversationDescription(turns) {
  const messages = extractUserMessages(turns)
  if (!messages.length) return 'User did not provide any details.'
  return normalizeDraftText(messages[messages.length - 1])
}

function removeLeadingPhrases(text) {
  return text
    .replace(/^(when i(?:'| a)?(?: tried| was trying| attempted) to)\s+/i, '')
    .replace(/^(i(?:'| a)?(?:m| am| was| have been) having trouble with)\s+/i, '')
    .replace(/^(i need help with)\s+/i, '')
    .replace(/^(please help(?: me)? with)\s+/i, '')
    .replace(/^(there is|there's)\s+/i, '')
    .trim()
}

function generateTicketTitle(turns) {
  const messages = extractUserMessages(turns)
  const lastMessage = messages[messages.length - 1] || 'IT support issue'
  const joined = normalizeText(messages.join(' ')).toLowerCase()

  if (joined.includes('payment') && joined.includes('ticket') && (joined.includes('error') || joined.includes('not created'))) {
    return 'Payment completed but ticket not created'
  }
  if (joined.includes('payment') && (joined.includes('error') || joined.includes('failed'))) {
    return 'Payment issue with application error'
  }
  if (joined.includes('vpn')) {
    return 'VPN connection issue'
  }
  if (joined.includes('printer')) {
    return 'Printer issue'
  }
  if (joined.includes('outlook')) {
    return 'Outlook issue'
  }
  if (joined.includes('wifi') || joined.includes('wi-fi') || joined.includes('network')) {
    return 'Network or Wi-Fi issue'
  }
  if (joined.includes('password')) {
    return 'Password access issue'
  }

  const candidate = removeLeadingPhrases(lastMessage)
  const firstSentence = candidate.split(/[.?!]/).find(Boolean) || candidate
  const trimmed = sentenceCase(firstSentence)
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed || 'IT support issue'
}

function makeTicketDraft(turns) {
  return {
    title: generateTicketTitle(turns),
    description: buildConversationDescription(turns),
  }
}

export default function AssistantPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [turns, setTurns] = useState([])
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const historyQuery = useQuery({
    queryKey: ['chat-history', user?.id],
    queryFn: () => chatService.getHistory(),
    enabled: Boolean(user?.id),
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (historyQuery.data) {
        setTurns(
          historyQuery.data.map((entry) => ({
            id: entry.id,
            userMessage: entry.message,
            aiReply: entry.ai_reply || '',
            assistantAvailable: entry.assistant_available !== false,
            warning: entry.assistant_available === false ? FALLBACK_WARNING : null,
            createdAt: entry.created_at,
            localPending: false,
          }))
        )
    }
  }, [historyQuery.data])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, sending])

  const isEmpty = useMemo(() => turns.length === 0 && !historyQuery.isLoading, [turns.length, historyQuery.isLoading])

  const sendMutation = useMutation({
    mutationFn: (message) => chatService.send(message),
  })

  const handleSend = async () => {
    const message = input.trim()
    if (!message || sending) return

    const tempId = crypto.randomUUID()
    setSending(true)
    setTurns((current) => [
      ...current,
      {
        id: tempId,
        userMessage: message,
        aiReply: '',
        assistantAvailable: true,
        warning: null,
        createdAt: new Date().toISOString(),
        localPending: true,
      },
    ])
    setInput('')

    try {
      const result = await sendMutation.mutateAsync(message)
      const assistantAvailable = result?.available !== false
      const warning = assistantAvailable ? null : (result?.warning || FALLBACK_WARNING)
      setTurns((current) =>
        current.map((turn) =>
          turn.id === tempId
            ? {
              ...turn,
              aiReply: assistantAvailable ? (result.reply || '') : '',
              assistantAvailable,
              warning,
              localPending: false,
            }
            : turn
        )
      )
      if (!assistantAvailable) {
        toast.error(warning || FALLBACK_WARNING)
      }
    } catch (error) {
      const status = error?.response?.status

      if (status === 401) {
        setTurns((current) => current.filter((turn) => turn.id !== tempId))
        return
      }

      setTurns((current) =>
        current.map((turn) =>
          turn.id === tempId ? { ...turn, aiReply: '', assistantAvailable: false, warning: FALLBACK_WARNING, localPending: false } : turn
        )
      )
      toast.error(FALLBACK_WARNING)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCreateTicket = (turnIndex) => {
    const draft = makeTicketDraft(turns.slice(0, turnIndex + 1))
    navigate('/tickets/new', { state: draft })
  }

  const handleSolved = () => {
    toast.success('Glad it is resolved. I am here if you need anything else.')
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="card h-full flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-brand-50 to-white">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-200">
                <Bot size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-gray-900">AI Support Assistant</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Ask about password resets, VPN, printer issues, Outlook, Windows, Wi-Fi, and other IT support topics.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/70">
            {historyQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Loading conversation...
                </div>
              </div>
            ) : isEmpty ? (
              <div className="h-full min-h-80 flex items-center justify-center">
                  <div className="max-w-md text-center bg-white border border-dashed border-brand-200 rounded-3xl p-8">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Start a support conversation</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Describe the IT issue you are facing and I will help you troubleshoot it before you create a ticket.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-4">
              {turns.map((turn, index) => {
                const time = formatTime(turn.createdAt)
                return (
                  <div key={turn.id} className="space-y-3">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-br-md bg-brand-600 text-white px-4 py-3 shadow-sm">
                        <p className="text-sm whitespace-pre-wrap leading-6">{turn.userMessage}</p>
                        <p className="text-[11px] text-brand-100 mt-2 text-right">{time}</p>
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-bl-md bg-white border border-gray-200 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-brand-600 mb-2">
                          <Bot size={14} />
                          AI Assistant
                        </div>
                        {turn.localPending ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 size={14} className="animate-spin text-brand-500" />
                            AI is typing...
                          </div>
                        ) : turn.assistantAvailable === false ? (
                          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <span>{turn.warning || FALLBACK_WARNING}</span>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-6">{turn.aiReply}</p>
                            <div className="flex flex-wrap gap-2 mt-4">
                              <button
                                type="button"
                                onClick={() => handleCreateTicket(index)}
                                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
                              >
                                <Ticket size={14} />
                                Create Ticket
                              </button>
                              <button
                                type="button"
                                onClick={handleSolved}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <CheckCircle2 size={14} />
                                Solved
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {sending && !turns.some((turn) => turn.localPending) ? (
                <div className="flex justify-start">
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-bl-md bg-white border border-gray-200 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 size={14} className="animate-spin text-brand-500" />
                      AI is typing...
                    </div>
                </div>
                </div>
              ) : null}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-gray-100 bg-white p-4 sm:p-6">
            <div className="flex flex-col gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                className="input min-h-24 resize-none"
                placeholder="Describe your IT issue... (Press Enter to send, Shift+Enter for a new line)"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-400">
                  Supported topics: passwords, VPN, printers, Outlook, Microsoft Office, Windows, Wi-Fi, network, email, and software installation.
                </p>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="btn-primary shrink-0 min-w-32 justify-center"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
