/**
 * Get the API base URL dynamically at runtime
 *
 * Priority:
 * 1. NEXT_PUBLIC_API_URL env var (if set, used as override)
 * 2. Current window location (recommended for production)
 * 3. Fallback for SSR environments
 */
export function getApiBaseUrl(): string {
  // If env var is set and doesn't point to localhost, use it
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl
  }

  // Client-side: use the current server's hostname
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location
    const baseUrl = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`
    return `${baseUrl}/api`
  }

  // SSR fallback: use env var or default
  return envUrl || 'http://localhost:47200/api'
}
