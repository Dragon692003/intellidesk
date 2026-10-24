import api from './api'

export const chatService = {
  send: (message) => api.post('/chat', { message }).then((r) => r.data),
  getHistory: (limit = 50) => api.get('/chat/history', { params: { limit } }).then((r) => r.data),
}
