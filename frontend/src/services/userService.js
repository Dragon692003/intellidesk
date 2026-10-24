import api from './api'

export const userService = {
  getAll: () => api.get('/users/').then((r) => r.data),
  getUsers: () => api.get('/users/').then((r) => r.data),
  getAgents: () => api.get('/users/agents').then((r) => r.data),
  changeRole: (userId, role) => api.patch(`/users/${userId}/role?role=${role}`).then((r) => r.data),
  getDashboardStats: () => api.get('/users/dashboard/stats').then((r) => r.data),
}
