import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

const API_BASE_URL = 'http://localhost:8000/api/v1'
const AUTH_STORAGE_KEY = 'intellidesk-auth'
const SESSION_EXPIRED_MESSAGE = 'Your session expired. Please sign in again.'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise = null

function readStoredAuth() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    return parsed?.state || null
  } catch (error) {
    console.error('[API] Failed to read stored auth state', error)
    return null
  }
}

function persistAuthState(user, token, refreshToken) {
  const nextState = { user, token, refreshToken }
  useAuthStore.getState().setAuth(user, token, refreshToken)

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ state: nextState, version: 0 }))
  } catch (error) {
    console.error('[API] Failed to persist auth state', error)
  }
}

function clearAuthState() {
  try {
    useAuthStore.getState().logout()
  } catch (error) {
    console.error('[API] Failed to clear auth store', error)
  }

  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch (error) {
    console.error('[API] Failed to clear auth storage', error)
  }
}

function buildRequestLabel(config = {}) {
  const method = (config.method || 'get').toUpperCase()
  const url = config.url || 'unknown-endpoint'
  return `${method} ${url}`
}

function extractBackendMessage(error) {
  const detail = error?.response?.data?.detail
  const message = error?.response?.data?.message

  if (typeof detail === 'string') return detail
  if (typeof message === 'string') return message
  if (Array.isArray(detail)) return detail.map((item) => item?.msg).filter(Boolean).join(', ')
  if (typeof error?.message === 'string') return error.message

  return 'Unexpected error'
}

function shouldSuppressToasts(error) {
  return Boolean(error?.config?.meta?.silentErrors)
}

function isAuthEndpoint(url = '') {
  return /\/auth\/(login|register|refresh)$/i.test(url)
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    const stored = readStoredAuth()
    const refreshToken = stored?.refreshToken || useAuthStore.getState().refreshToken

    if (!refreshToken) {
      throw new Error('Missing refresh token')
    }

    refreshPromise = refreshClient
      .post('/auth/refresh', { refresh_token: refreshToken })
      .then((response) => response.data)
      .then((tokens) => {
        const currentUser = useAuthStore.getState().user || stored?.user || null
        persistAuthState(currentUser, tokens.access_token, tokens.refresh_token)
        return tokens
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

api.interceptors.request.use((config) => {
  config.headers = config.headers || {}

  try {
    const stored = readStoredAuth()
    const token = stored?.token || useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (error) {
    console.error('[API] Token attachment failed', error)
  }

  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status
    const requestLabel = buildRequestLabel(error?.config)
    const backendMessage = extractBackendMessage(error)
    const suppressToasts = shouldSuppressToasts(error)

    console.error(`[API] ${status || 'NETWORK'} ${requestLabel}: ${backendMessage}`)

    if (status === 401) {
      if (isAuthEndpoint(error?.config?.url)) {
        if (error?.config?.url?.toLowerCase().includes('/auth/login')) {
          return Promise.reject(error)
        }

        clearAuthState()
        if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
        return Promise.reject(error)
      }

      const originalRequest = error.config || {}
      if (originalRequest._retry) {
        clearAuthState()
        if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        const tokens = await refreshAccessToken()
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        console.error(`[API] 401 ${requestLabel}: token refresh failed`, refreshError)
        clearAuthState()
        toast.error(SESSION_EXPIRED_MESSAGE)
        if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
        return Promise.reject(error)
      }
    }

    if (suppressToasts) {
      return Promise.reject(error)
    }

    if (status >= 500) {
      toast.error('Something went wrong. Please try again.')
    } else if (status && status !== 401) {
      toast.error(typeof backendMessage === 'string' ? backendMessage : 'Request failed')
    } else if (!status) {
      toast.error('Unable to reach the server. Please try again.')
    }

    return Promise.reject(error)
  }
)

export default api
