// Health API — public endpoints, no auth required
// Base URL is determined dynamically at runtime based on the current server
// This ensures the frontend always queries the same server it's being served from

import { getApiBaseUrl } from '../api-base'

export type HealthStatus = 'operational' | 'degraded' | 'down' | 'loading'
export type ServiceStatus = 'healthy' | 'unhealthy' | 'timeout'

export interface ReadinessResponse {
    timestamp: string
    isHealthy: boolean
    database: ServiceStatus
    redis: ServiceStatus
    version: string
    databaseResponseTimeMs: number | null
    redisResponseTimeMs: number | null
}

export interface ReadinessResult {
    status: HealthStatus
    data: ReadinessResponse | null
}

/**
 * Fetch /api/health/ready
 * The request is sent with cache: 'no-store' so every call hits the server.
 * Client-side caching and polling frequency (staleTime) is managed by useHealth.
 */
export async function getReadiness(): Promise<ReadinessResult> {
    try {
        const apiBase = getApiBaseUrl()
        const res = await fetch(`${apiBase}/health/ready`, {
            cache: 'no-store',
        })
        const data: ReadinessResponse = await res.json()

        const status: HealthStatus = res.ok
            ? 'operational'
            : data.database === 'timeout' || data.redis === 'timeout'
                ? 'degraded'
                : 'down'

        return { status, data }
    } catch {
        return { status: 'down', data: null }
    }
}
