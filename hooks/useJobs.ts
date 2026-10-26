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
    retryFailedJobs,
    cancelJobs,
} from '@/lib/api/jobs'
import { useJobsStore } from '@/stores/jobsStore'
import type { JobQueryParameters, JobTimelineQueryParams } from '@/types/jobs'
import {
    paginatedJobsSchema,
    jobSchema,
    jobStatisticsSchema,
    paginatedJobTimelineSchema,
    getJobsErrorMessage,
} from '@/types/jobs'
import { extractApiError } from '@/lib/api/errors'

// ============================================
// Query Keys
// ============================================

export const jobsKeys = {
    all: ['jobs'] as const,
    lists: () => [...jobsKeys.all, 'list'] as const,
    list: (params: JobQueryParameters) => [...jobsKeys.lists(), params] as const,
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
 * Hook to fetch paginated jobs list with rich search, facets, and sorting.
 * Enhanced with refetch on focus, reconnect, and polling for active jobs.
 */
export function useJobs(params?: JobQueryParameters) {
    const { status } = useSession()
    const { currentPage, pageSize: storePageSize, selectedStatus } = useJobsStore()

    const pageNumber = params?.pageNumber ?? currentPage
    const pageSize = params?.pageSize ?? storePageSize
    const effectiveStatus =
        params !== undefined && 'status' in params ? (params.status ?? null) : selectedStatus

    const queryParams: JobQueryParameters = {
        ...params,
        pageNumber,
        pageSize,
        status: effectiveStatus,
    }

    return useQuery({
        queryKey: jobsKeys.list(queryParams),
        queryFn: async () => {
            const data = await getJobs(queryParams)
            return paginatedJobsSchema.parse(data)
        },
        enabled: status === 'authenticated',
        staleTime: 5 * 1000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        refetchInterval: (query) => {
            const data = query.state.data
            if (!data) return false
            const hasActiveJobs = data.items.some((job) =>
                ['QUEUED', 'DOWNLOADING', 'PENDING_UPLOAD', 'UPLOADING', 'TORRENT_DOWNLOAD_RETRY', 'UPLOAD_RETRY'].includes(job.status)
            )
            return hasActiveJobs ? 5 * 1000 : false
        },
    })
}

/**
 * Hook to fetch a specific job by ID
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
            return jobSchema.parse(data)
        },
        enabled: status === 'authenticated' && !!jobId,
        staleTime: 2 * 1000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
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
 */
export function useJobStatistics() {
    const { status } = useSession()

    return useQuery({
        queryKey: jobsKeys.statistics(),
        queryFn: async () => {
            const data = await getJobStatistics()
            return jobStatisticsSchema.parse(data)
        },
        enabled: status === 'authenticated',
        staleTime: 5 * 1000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        refetchInterval: (query) => {
            const data = query.state.data
            if (!data) return false
            return (data.activeJobs ?? 0) > 0 ? 5 * 1000 : false
        },
    })
}

/**
 * Hook to fetch job timeline with pagination
 */
export function useJobTimeline(jobId: number | null, pageNumber: number = 1, pageSize: number = 10) {
    const { status } = useSession()
    const { data: jobData } = useJob(jobId)

    return useQuery({
        queryKey: jobsKeys.timeline(jobId ?? 0, { pageNumber, pageSize }),
        queryFn: async () => {
            if (!jobId) {
                throw new Error('Invalid job ID')
            }
            const data = await getJobTimeline(jobId, { pageNumber, pageSize })
            return paginatedJobTimelineSchema.parse(data)
        },
        enabled: status === 'authenticated' && !!jobId,
        staleTime: 5 * 1000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
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

    return (hasNextPage: boolean, extraParams?: JobQueryParameters) => {
        if (hasNextPage) {
            const nextParams: JobQueryParameters = {
                ...extraParams,
                pageNumber: (extraParams?.pageNumber ?? currentPage) + 1,
                pageSize: extraParams?.pageSize ?? pageSize,
                status: extraParams && 'status' in extraParams ? extraParams.status : selectedStatus,
            }
            queryClient.prefetchQuery({
                queryKey: jobsKeys.list(nextParams),
                queryFn: () => getJobs(nextParams),
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
            queryClient.invalidateQueries({ queryKey: jobsKeys.all })
            toast.success(
                variables.storageProfileId
                    ? 'Job retry initiated on the selected drive'
                    : 'Job retry initiated'
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
            queryClient.invalidateQueries({ queryKey: jobsKeys.all })
            toast.success('Job cancelled')
        },
        onError: (error) => {
            const message = handleJobActionError(error)
            toast.error('Failed to cancel job', { description: message })
        },
    })
}

/**
 * Hook for batch-retrying failed jobs (selected IDs or all failed jobs)
 */
export function useRetryFailedJobs() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (request?: { jobIds?: number[]; targetStorageProfileId?: number }) =>
            retryFailedJobs(request),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: jobsKeys.all })
            if (result.succeededCount > 0 && result.failedCount === 0) {
                toast.success(
                    `Retrying ${result.succeededCount} job${result.succeededCount === 1 ? '' : 's'}`
                )
            } else if (result.succeededCount > 0 && result.failedCount > 0) {
                toast.warning(
                    `Retried ${result.succeededCount} of ${result.totalRequested} jobs (${result.failedCount} could not be retried)`
                )
            } else if (result.totalRequested === 0) {
                toast.info('No failed jobs needed retrying')
            } else {
                const firstErr = result.errors[0]?.message
                toast.error('Could not retry selected jobs', {
                    description: firstErr || 'Verify that your storage destination is active.',
                })
            }
        },
        onError: (error) => {
            const message = handleJobActionError(error)
            toast.error('Batch retry failed', { description: message })
        },
    })
}

/**
 * Hook for batch-cancelling active jobs
 */
export function useBatchCancelJobs() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (request: { jobIds: number[] }) => cancelJobs(request),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: jobsKeys.all })
            if (result.succeededCount > 0 && result.failedCount === 0) {
                toast.success(
                    `Cancelled ${result.succeededCount} job${result.succeededCount === 1 ? '' : 's'}`
                )
            } else if (result.succeededCount > 0 && result.failedCount > 0) {
                toast.warning(
                    `Cancelled ${result.succeededCount} of ${result.totalRequested} jobs (${result.failedCount} could not be cancelled)`
                )
            } else {
                const firstErr = result.errors[0]?.message
                toast.error('Could not cancel selected jobs', {
                    description: firstErr || 'Jobs may have already completed or been cancelled.',
                })
            }
        },
        onError: (error) => {
            const message = handleJobActionError(error)
            toast.error('Batch cancel failed', { description: message })
        },
    })
}
