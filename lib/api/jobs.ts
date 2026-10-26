// Jobs API client with Zod validation
import apiClient from '../axios'
import {
    jobSchema,
    paginatedJobsSchema,
    jobStatisticsSchema,
    jobQueueStatusSchema,
    paginatedJobTimelineSchema,
} from '@/types/jobs'
import type {
    Job,
    UserJob,
    PaginatedJobs,
    JobQueryParameters,
    JobsQueryParams,
    JobStatistics,
    JobQueueStatus,
    JobTimelineEntry,
    PaginatedJobTimeline,
    JobTimelineQueryParams,
    BatchJobActionResult,
    BatchJobActionError,
} from '@/types/jobs'

// Re-export types for convenience
export type {
    Job,
    UserJob,
    PaginatedJobs,
    JobQueryParameters,
    JobsQueryParams,
    JobStatistics,
    JobQueueStatus,
    JobTimelineEntry,
    PaginatedJobTimeline,
    JobTimelineQueryParams,
    BatchJobActionResult,
    BatchJobActionError,
}
export { getJobsErrorMessage, jobsErrorMessages } from '@/types/jobs'

/**
 * Get all jobs for the current user with pagination, search, facet filters, and sorting.
 * Supports both `getJobs(params: JobQueryParameters)` and legacy `getJobs(pageNumber, pageSize, status)`.
 */
export async function getJobs(
    paramsOrPageNumber: JobQueryParameters | number = {},
    legacyPageSize?: number,
    legacyStatus?: string | null
): Promise<PaginatedJobs> {
    const params: JobQueryParameters =
        typeof paramsOrPageNumber === 'number'
            ? {
                  pageNumber: paramsOrPageNumber,
                  pageSize: legacyPageSize,
                  status: legacyStatus ?? undefined,
              }
            : paramsOrPageNumber

    const searchParams = new URLSearchParams()

    if (params.pageNumber) {
        searchParams.set('pageNumber', params.pageNumber.toString())
    }
    if (params.pageSize) {
        searchParams.set('pageSize', params.pageSize.toString())
    }
    if (params.status) {
        searchParams.set('status', params.status)
    }
    if (params.statuses) {
        searchParams.set('statuses', params.statuses)
    }
    if (params.phase && params.phase !== 'all') {
        searchParams.set('phase', params.phase)
    }
    if (params.search && params.search.trim().length > 0) {
        searchParams.set('search', params.search.trim())
    }
    if (params.provider) {
        searchParams.set('provider', params.provider)
    }
    if (params.storageProfileId !== undefined && params.storageProfileId !== null) {
        searchParams.set('storageProfileId', params.storageProfileId.toString())
    }
    if (params.category) {
        searchParams.set('category', params.category)
    }
    if (params.sizeBucket) {
        searchParams.set('sizeBucket', params.sizeBucket)
    }
    if (params.dateRange) {
        searchParams.set('dateRange', params.dateRange)
    }
    if (params.isPinned !== undefined && params.isPinned !== null) {
        searchParams.set('isPinned', String(params.isPinned))
    }
    if (params.wasRerouted !== undefined && params.wasRerouted !== null) {
        searchParams.set('wasRerouted', String(params.wasRerouted))
    }
    if (params.isStalled !== undefined && params.isStalled !== null) {
        searchParams.set('isStalled', String(params.isStalled))
    }
    if (params.isSelective !== undefined && params.isSelective !== null) {
        searchParams.set('isSelective', String(params.isSelective))
    }
    if (params.hasError !== undefined && params.hasError !== null) {
        searchParams.set('hasError', String(params.hasError))
    }
    if (params.sortBy) {
        searchParams.set('sortBy', params.sortBy)
    }
    if (params.sortDir) {
        searchParams.set('sortDir', params.sortDir)
    }

    const queryString = searchParams.toString()
    const url = `/jobs${queryString ? `?${queryString}` : ''}`
    const response = await apiClient.get<PaginatedJobs>(url)

    try {
        return paginatedJobsSchema.parse(response.data)
    } catch (error) {
        console.error('Job list validation error:', error)
        throw new Error('Invalid job data received from server. Please try again later.')
    }
}

/**
 * Get a specific job by ID
 */
export async function getJob(jobId: number): Promise<Job> {
    const response = await apiClient.get<Job>(`/jobs/${jobId}`)

    try {
        return jobSchema.parse(response.data)
    } catch (error) {
        console.error('Job detail validation error:', error)
        throw new Error('Invalid job data received from server. Please try again later.')
    }
}

/**
 * Get job statistics (total, active, completed, failed, facets, live speeds)
 */
export async function getJobStatistics(): Promise<JobStatistics> {
    const response = await apiClient.get<JobStatistics>('/jobs/statistics')

    try {
        return jobStatisticsSchema.parse(response.data)
    } catch (error) {
        console.error('Job statistics validation error:', error)
        throw new Error('Invalid statistics data received from server. Please try again later.')
    }
}

/**
 * Worker capacity and queue depth
 * GET /api/jobs/queue-status
 */
export async function getJobQueueStatus(): Promise<JobQueueStatus> {
    const response = await apiClient.get<JobQueueStatus>('/jobs/queue-status')
    return jobQueueStatusSchema.parse(response.data)
}

/**
 * Get job timeline (complete history of status changes) with pagination
 * GET /api/jobs/{id}/timeline?pageNumber=&pageSize=
 */
export async function getJobTimeline(jobId: number, params: JobTimelineQueryParams = {}): Promise<PaginatedJobTimeline> {
    const searchParams = new URLSearchParams()

    if (params.pageNumber) {
        searchParams.set('pageNumber', params.pageNumber.toString())
    }
    if (params.pageSize) {
        searchParams.set('pageSize', params.pageSize.toString())
    }

    const queryString = searchParams.toString()
    const url = `/jobs/${jobId}/timeline${queryString ? `?${queryString}` : ''}`
    const response = await apiClient.get<PaginatedJobTimeline>(url)

    try {
        return paginatedJobTimelineSchema.parse(response.data)
    } catch (error) {
        console.error('Job timeline validation error:', error)
        throw new Error('Invalid timeline data received from server. Please try again later.')
    }
}

// ============================================
// Job Action Response Types
// ============================================

export interface JobActionResponse {
    isSuccess: boolean
    value?: boolean
    error?: {
        code: string
        message: string
    }
}

function normalizeBatchResult(raw: unknown): BatchJobActionResult {
    const payload =
        raw && typeof raw === 'object' && 'value' in raw && (raw as { value?: unknown }).value
            ? (raw as { value: Record<string, unknown> }).value
            : (raw as Record<string, unknown> | undefined)

    const errorsRaw = Array.isArray(payload?.errors) ? payload.errors : []
    const errors: BatchJobActionError[] = errorsRaw.map((entry) => {
        if (typeof entry === 'string') {
            return { message: entry }
        }
        if (entry && typeof entry === 'object') {
            const obj = entry as Record<string, unknown>
            return {
                jobId: typeof obj.jobId === 'number' ? obj.jobId : undefined,
                code: typeof obj.code === 'string' ? obj.code : undefined,
                message: typeof obj.message === 'string' ? obj.message : 'Batch action failed for job',
            }
        }
        return { message: 'Batch action failed' }
    })

    return {
        totalRequested: typeof payload?.totalRequested === 'number' ? payload.totalRequested : 0,
        succeededCount: typeof payload?.succeededCount === 'number' ? payload.succeededCount : 0,
        failedCount: typeof payload?.failedCount === 'number' ? payload.failedCount : 0,
        succeededJobIds: Array.isArray(payload?.succeededJobIds)
            ? payload.succeededJobIds.filter((id): id is number => typeof id === 'number')
            : [],
        errors,
    }
}

// ============================================
// User Job Actions
// ============================================

/**
 * Retry a failed job
 * POST /api/jobs/{id}/retry
 */
export async function retryJob(
    jobId: number,
    storageProfileId?: number
): Promise<JobActionResponse> {
    const response = await apiClient.post<JobActionResponse>(
        `/jobs/${jobId}/retry`,
        storageProfileId ? { storageProfileId } : {}
    )
    return response.data
}

/**
 * Point a job at a different storage profile before its upload runs
 * PATCH /api/jobs/{id}/storage-profile
 */
export async function changeJobStorageProfile(
    jobId: number,
    storageProfileId: number,
    allowFailover = true
): Promise<Job> {
    const response = await apiClient.patch<Job>(`/jobs/${jobId}/storage-profile`, {
        storageProfileId,
        allowFailover,
    })

    try {
        return jobSchema.parse(response.data)
    } catch (error) {
        console.error('Job detail validation error:', error)
        throw new Error('Invalid job data received from server. Please try again later.')
    }
}

/**
 * Re-dispatch a job stuck waiting to be picked up
 * POST /api/jobs/{id}/force-start
 */
export async function forceStartJob(jobId: number): Promise<JobActionResponse> {
    const response = await apiClient.post<JobActionResponse>(`/jobs/${jobId}/force-start`)
    return response.data
}

/**
 * Cancel an active job
 * POST /api/jobs/{id}/cancel
 */
export async function cancelJob(jobId: number): Promise<JobActionResponse> {
    const response = await apiClient.post<JobActionResponse>(`/jobs/${jobId}/cancel`)
    return response.data
}

/**
 * Batch retry failed jobs (or all failed jobs when jobIds is omitted)
 * POST /api/jobs/batch/retry-failed
 */
export async function retryFailedJobs(request?: {
    jobIds?: number[]
    targetStorageProfileId?: number
}): Promise<BatchJobActionResult> {
    const response = await apiClient.post('/jobs/batch/retry-failed', request ?? {})
    return normalizeBatchResult(response.data)
}

/**
 * Batch cancel selected active jobs
 * POST /api/jobs/batch/cancel
 */
export async function cancelJobs(request: {
    jobIds: number[]
}): Promise<BatchJobActionResult> {
    const response = await apiClient.post('/jobs/batch/cancel', request)
    return normalizeBatchResult(response.data)
}

export const batchCancelJobs = cancelJobs

export const jobsApi = {
    getJobs,
    getJob,
    getJobStatistics,
    getJobQueueStatus,
    getJobTimeline,
    retryJob,
    changeJobStorageProfile,
    forceStartJob,
    cancelJob,
    retryFailedJobs,
    cancelJobs,
    batchCancelJobs,
}
