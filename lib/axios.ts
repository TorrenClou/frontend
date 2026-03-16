import axios from 'axios'
import { getSession, signOut } from 'next-auth/react'
import { getApiBaseUrl } from './api-base'

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const session = await getSession()
    if (session?.backendToken) {
      config.headers.Authorization = `Bearer ${session.backendToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await signOut({ redirect: false })
      } finally {
        // Always redirect to login even if signOut rejects.
        // Guard against SSR environments where window is absent.
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient

