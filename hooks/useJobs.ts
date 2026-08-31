'use client'

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
    getJobs,
    getJob,
    getJobStatistics,
    getJobQueueStatus,
    getJobTimeline,
    retryJob,
    cancelJob,
    changeJobStorageProfile,
    forceStartJob,
} from '@/lib/api/jobs'
import { useJobsStore } from '@/stores/jobsStore'
import type { JobsQueryParams, JobTimelineQueryParams } from '@/types/jobs'
import { paginatedJobsSchema, jobSchema, jobStatisticsSchema, paginatedJobTimelineSchema, getJobsErrorMessage } from '@/types/jobs'
import { extractApiError } from '@/lib/api/errors'

// ============================================
// Query Keys
// ============================================

export const jobsKeys = {
    all: ['jobs'] as const,
    lists: () => [...jobsKeys.all, 'list'] as const,
    list: (params: JobsQueryParams) => [...jobsKeys.lists(), params] as const,
    details: () => [...jobsKeys.all, 'detail'] as const,
    detail: (id: number) => [...jobsKeys.details(), id] as const,
    statistics: () => [...jobsKeys.all, 'statistics'] as const,
    queueStatus: () => [...jobsKeys.all, 'queue-status'] as const,
    timelines: () => [...jobsKeys.all, 'timeline'] as const,
    timeline: (id: number, params?: JobTimelineQueryParams) => [...jobsKeys.timelines(), id, params] as const,
}

// ============================================
// Query Hooks
// ============================================

/**
 * Hook to fetch paginated jobs list
 * Enhanced with refetch on focus, reconnect, and polling for active jobs
 *
 * @param params - Optional overrides for pageSize and status; when provided they
 *   take precedence over the Zustand store values so callers like DashboardPage
 *   can fetch with their own params without mutating shared store state.
 */
export function useJobs(params?: Pick<JobsQueryParams, 'pageSize' | 'status'>) {
    const { status } = useSession()
    const { currentPage, pageSize: storePageSize, selectedStatus } = useJobsStore()

    // Explicit overrides win over store values; use 'in' check so null is honoured.
    const pageSize = params?.pageSize ?? storePageSize
    const effectiveStatus =
        params !== undefined && 'status' in params ? (params.status ?? null) : selectedStatus

    return useQuery({
        queryKey: jobsKeys.list({ pageNumber: currentPage, pageSize, status: effectiveStatus }),
        queryFn: async () => {
            const data = await getJobs({
                pageNumber: currentPage,
                pageSize,
                status: effectiveStatus,
            })
            // Validate with Zod
            return paginatedJobsSchema.parse(data)
        },
        enabled: status === 'authenticated',
        staleTime: 5 * 1000, // 5 seconds - jobs update frequently
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        // Poll every 10 seconds if there are active jobs
        refetchInterval: (query) => {
            const data = query.state.data
            if (!data) return false
            const hasActiveJobs = data.items.some(job => 
                ['QUEUED', 'DOWNLOADING', 'PENDING_UPLOAD', 'UPLOADING', 'TORRENT_DOWNLOAD_RETRY', 'UPLOAD_RETRY'].includes(job.status)
            )
            return hasActiveJobs ? 10 * 1000 : false
        },
    })
}

/**
 * Hook to fetch a specific job by ID
 * Enhanced with refetch on focus, reconnect, and polling for active jobs
 */
export function useJob(jobId: number | null) {
    const { status } = useSession()

    return useQuery({
        queryKey: jobsKeys.detail(jobId ?? 0),
        queryFn: async () => {
            if (!jobId) {
                throw new Error('Invalid job ID')
            }
            const data = await getJob(jobId)
            // Validate with Zod
            return jobSchema.parse(data)
        },
        enabled: status === 'authenticated' && !!jobId,
        staleTime: 2 * 1000, // 2 seconds - job details update frequently
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        // Poll every 5 seconds if job is active
        refetchInterval: (query) => {
            const data = query.state.data
            if (!data) return false
            const isActive = ['QUEUED', 'DOWNLOADING', 'PENDING_UPLOAD', 'UPLOADING', 'TORRENT_DOWNLOAD_RETRY', 'UPLOAD_RETRY'].includes(data.status)
            return isActive ? 5 * 1000 : false
        },
    })
}

/**
 * Hook to fetch job statistics
 * Enhanced with refetch on focus
 */
export function useJobStatistics() {
    const { status } = useSession()

    return useQuery({
        queryKey: jobsKeys.statistics(),
        queryFn: async () => {
            const data = await getJobStatistics()
            // Validate with Zod
            return jobStatisticsSchema.parse(data)
        },
        enabled: status === 'authenticated',
        staleTime: 10 * 1000, // 10 seconds
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
    })
}

/**
 * Hook to fetch job timeline with pagination
 * Enhanced with refetch on focus, reconnect, and polling for active jobs
 */
export function useJobTimeline(jobId: number | null, pageNumber: number = 1, pageSize: number = 10) {
    const { status } = useSession()
    
    // Get job data to check if it's active
    const { data: jobData } = useJob(jobId)

    return useQuery({
        queryKey: jobsKeys.timeline(jobId ?? 0, { pageNumber, pageSize }),
        queryFn: async () => {
            if (!jobId) {
                throw new Error('Invalid job ID')
            }
            const data = await getJobTimeline(jobId, { pageNumber, pageSize })
            // Validate with Zod
            return paginatedJobTimelineSchema.parse(data)
        },
        enabled: status === 'authenticated' && !!jobId,
        staleTime: 5 * 1000, // 5 seconds - timeline updates when job status changes
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        // Poll every 10 seconds only if job is active
        refetchInterval: () => {
            if (!jobData) return false
            const isActive = ['QUEUED', 'DOWNLOADING', 'PENDING_UPLOAD', 'UPLOADING', 'TORRENT_DOWNLOAD_RETRY', 'UPLOAD_RETRY'].includes(jobData.status)
            return isActive ? 10 * 1000 : false
        },
    })
}

/**
 * Hook to prefetch the next page of jobs
 */
export function usePrefetchNextPage() {
    const queryClient = useQueryClient()
    const { currentPage, pageSize, selectedStatus } = useJobsStore()

    return (hasNextPage: boolean) => {
        if (hasNextPage) {
            queryClient.prefetchQuery({
                queryKey: jobsKeys.list({
                    pageNumber: currentPage + 1,
                    pageSize,
                    status: selectedStatus
                }),
                queryFn: () => getJobs({
                    pageNumber: currentPage + 1,
                    pageSize,
                    status: selectedStatus,
                }),
            })
        }
    }
}

// ============================================
// Error Handler
// ============================================

function handleJobActionError(error: unknown): string {
    const extracted = extractApiError(error)
    if (extracted.code) {
        return getJobsErrorMessage(extracted.code, extracted.message)
    }
    return extracted.message
}

/**
 * Worker capacity and queue depth.
 *
 * Polled while a job is waiting, because the useful moment is when a slot frees up.
 */
export function useJobQueueStatus(enabled = true) {
    const { status } = useSession()

    return useQuery({
        queryKey: jobsKeys.queueStatus(),
        queryFn: getJobQueueStatus,
        enabled: enabled && status === 'authenticated',
        staleTime: 10 * 1000,
        refetchInterval: 30 * 1000,
    })
}

// ============================================
// Job Action Mutation Hooks
// ============================================

export interface RetryJobVariables {
    jobId: number
    /** Retry against a different drive. Omit to reuse the job's current destination. */
    storageProfileId?: number
}

/**
 * Hook for retrying a failed job, optionally against a different storage profile
 */
export function useRetryJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ jobId, storageProfileId }: RetryJobVariables) =>
            retryJob(jobId, storageProfileId),
        onSuccess: (_result, variables) => {
            // Invalidate job queries to refresh data
            queryClient.invalidateQueries({ queryKey: jobsKeys.all })
            toast.success(
                variables.storageProfileId
                    ? 'Job retry initiated on the selected drive'
                    : 'Job retry initiated successfully'
            )
        },
        onError: (error) => {
            const message = handleJobActionError(error)
            toast.error('Failed to retry job', { description: message })
        },
    })
}

export interface ChangeJobStorageProfileVariables {
    jobId: number
    storageProfileId: number
    /** false pins the job to this drive instead of allowing automatic failover. */
    allowFailover?: boolean
}

/**
 * Hook for pointing a job at a different storage profile before its upload runs
 */
export function useChangeJobStorageProfile() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ jobId, storageProfileId, allowFailover }: ChangeJobStorageProfileVariables) =>
            changeJobStorageProfile(jobId, storageProfileId, allowFailover ?? true),
        onSuccess: (job) => {
            queryClient.invalidateQueries({ queryKey: jobsKeys.all })
            toast.success('Destination updated', {
                description: `This job will upload to ${job.storageProfileName ?? 'the selected drive'}.`,
            })
        },
        onError: (error) => {
            const message = handleJobActionError(error)
            toast.error('Failed to change destination', { description: message })
        },
    })
}

/**
 * Hook for re-dispatching a job stuck waiting to be picked up by a worker
 */
export function useForceStartJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: forceStartJob,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: jobsKeys.all })
            toast.success('Job re-dispatched', {
                description: 'A worker should pick it up shortly.',
            })
        },
        onError: (error) => {
            const message = handleJobActionError(error)
            toast.error('Could not start job', { description: message })
        },
    })
}

/**
 * Hook for cancelling an active job
 */
export function useCancelJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: cancelJob,
        onSuccess: () => {
            // Invalidate job queries to refresh data
            queryClient.invalidateQueries({ queryKey: jobsKeys.all })
            toast.success('Job cancelled successfully')
        },
        onError: (error) => {
            const message = handleJobActionError(error)
            toast.error('Failed to cancel job', { description: message })
        },
    })
}
