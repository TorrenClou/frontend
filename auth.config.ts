import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import axios from 'axios'
import https from 'https'
import type { BackendAuthResponse } from '@/types/api'

/**
 * Get the backend URL for server-side auth requests
 * Prioritizes explicit BACKEND_URL env var, fallback to localhost for development
 */
function getBackendUrl(): string {
  // If explicitly configured, use it (allows pointing to different backend server)
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:47200'
  }

  // Production: BACKEND_URL should be set
  console.warn(
    'BACKEND_URL not configured. Please set BACKEND_URL environment variable in production. ' +
    'Falling back to localhost:47200'
  )
  return 'http://localhost:47200'
}

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Runtime type validation — reject non-string or empty values early
        if (
          typeof credentials?.email !== 'string' || !credentials.email ||
          typeof credentials?.password !== 'string' || !credentials.password
        ) {
          return null
        }

        const email = credentials.email
        const password = credentials.password

        try {
          // Only disable TLS verification in development (e.g. self-signed certs on localhost)
          const httpsAgent =
            process.env.NODE_ENV === 'development' || process.env.ALLOW_INSECURE_TLS === 'true'
              ? new https.Agent({ rejectUnauthorized: false })
              : new https.Agent()

          // Get backend URL - prioritize explicit env var, fallback to localhost for dev
          const baseUrl = getBackendUrl()
          const response = await axios.post<BackendAuthResponse>(
            `${baseUrl}/api/auth/login`,
            { email, password },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              httpsAgent,
            }
          )

          const data = response.data

          // Return user object with backend token
          return {
            id: data.user?.id || email,
            email: data.user?.email || email,
            name: data.user?.name || data.user?.email || null,
            image: data.user?.image ?? null,
            backendToken: data.accessToken,
          }
        } catch (error) {
          // Log only non-sensitive identifiers — never log response body or credentials
          const status = (error as any).response?.status
          const code = (error as any).code
          console.error('Backend auth error', {
            name: (error as Error).name,
            message: (error as Error).message,
            status,
            code,
          })
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.backendToken = (user as any).backendToken
        token.user = {
          id: user.id || '',
          name: user.name ?? null,
          email: user.email ?? null,
          image: user.image ?? null,
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.backendToken) {
        session.backendToken = token.backendToken as string
      }
      if (token.user) {
        const tokenUser = token.user as { id?: string; name?: string | null; email?: string | null; image?: string | null }
        if (session.user) {
          session.user.id = tokenUser.id || session.user.id
          session.user.name = tokenUser.name ?? session.user.name ?? null
          session.user.email = tokenUser.email ?? session.user.email ?? null
          session.user.image = tokenUser.image ?? null
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
} satisfies NextAuthConfig
