'use client'

import { useQuery } from '@tanstack/react-query'
import { getReadiness } from '@/lib/api/health'

export const healthKeys = {
    ready: ['health', 'ready'] as const,
}

/**
 * Polls /api/health/ready every 30 seconds.
 * Server caches the response for 10 seconds, so frequent polling is fine.
 */
export function useHealth() {
    return useQuery({
        queryKey: healthKeys.ready,
        queryFn: getReadiness,
        refetchInterval: 30_000,
        refetchIntervalInBackground: false,
        staleTime: 10_000,
        retry: 1,
    })
}

export const useHealthReady = useHealth
