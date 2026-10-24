import api from './api'

export const ticketService = {
  // Tickets
  create: (data) => api.post('/tickets/', data).then((r) => r.data),
  getAll: (params) => api.get('/tickets/', { params }).then((r) => r.data),
  getMy: (params) => api.get('/tickets/my', { params }).then((r) => r.data),
  getById: (id) => api.get(`/tickets/${id}`).then((r) => r.data),
  update: (id, data) => api.patch(`/tickets/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/tickets/${id}`),

  // Comments
  getComments: (ticketId) => api.get(`/tickets/${ticketId}/comments`).then((r) => r.data),
  addComment: (ticketId, data) =>
    api.post(`/tickets/${ticketId}/comments`, data).then((r) => r.data),

  // AI Features
  aiSuggestCategory: (title, description) =>
    api.post('/tickets/ai/suggest-category', { title, description }).then((r) => r.data),

  getAssigned: (params) => api.get('/tickets/assigned', { params }).then((r) => r.data),
}
