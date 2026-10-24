import api from './api'

export const authService = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  register: (name, email, password, role = 'user') =>
    api.post('/auth/register', { name, email, password, role }).then((r) => r.data),

  getMe: () => api.get('/auth/me').then((r) => r.data),

  refresh: (refresh_token) =>
    api.post('/auth/refresh', { refresh_token }).then((r) => r.data),
}
