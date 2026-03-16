/**
 * Get the API base URL at runtime
 *
 * Priority (in order):
 * 1. NEXT_PUBLIC_API_URL env var (explicit override, highest priority)
 * 2. Window.__API_URL__ (injected by server during SSR)
 * 3. Construct from backend port (if NEXT_PUBLIC_API_PORT set)
 *    - Useful when frontend and backend on different ports of same hostname
 *    - Example: frontend :3000, backend :5000
 * 4. Fallback to localhost:47200/api for development
 */
export function getApiBaseUrl(): string {
  // 1. Explicit env var configuration (highest priority)
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl) {
    return envUrl
  }

  // 2. Check for server-injected URL (set by middleware/layout during SSR)
  if (typeof window !== 'undefined' && (window as any).__API_URL__) {
    return (window as any).__API_URL__
  }

  // 3. If backend port is specified, construct URL with same hostname as frontend
  // This handles docker-compose scenarios where frontend and backend are on different ports
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_PORT) {
    const { protocol, hostname } = window.location
    const apiPort = process.env.NEXT_PUBLIC_API_PORT
    return `${protocol}//${hostname}:${apiPort}/api`
  }

  // 4. Development fallback
  return 'http://localhost:47200/api'
}
