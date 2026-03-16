/**
 * Get the API base URL at runtime.
 *
 * Client-side: uses a relative /proxy/api path — the browser sends the request
 * to the same host/port it loaded the page from, and Next.js rewrites it
 * server-side to BACKEND_URL. This means the correct server IP is always used
 * regardless of where the container is running.
 *
 * Server-side (SSR/auth): calls the backend directly via BACKEND_URL.
 */
export function getApiBaseUrl(): string {
  // Client-side: relative URL — proxied by Next.js to BACKEND_URL
  // Works on any server IP/hostname automatically, no hardcoding needed
  if (typeof window !== 'undefined') {
    return '/proxy/api'
  }

  // Server-side (SSR, NextAuth): direct connection via runtime env var
  return `${process.env.BACKEND_URL || 'http://localhost:47200'}/api`
}
