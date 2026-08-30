// Jobs API client with Zod validation
import apiClient from '../axios'
import {
    jobSchema,
    paginatedJobsSchema,
    jobStatisticsSchema,
    paginatedJobTimelineSchema,
} from '@/types/jobs'
import type {
    Job,
    PaginatedJobs,
    JobsQueryParams,
    JobStatistics,
    JobTimelineEntry,
    PaginatedJobTimeline,
    JobTimelineQueryParams,
} from '@/types/jobs'

// Re-export types for convenience
export type { Job, PaginatedJobs, JobsQueryParams, JobStatistics, JobTimelineEntry, PaginatedJobTimeline, JobTimelineQueryParams }
export { getJobsErrorMessage, jobsErrorMessages } from '@/types/jobs'

/**
 * Get all jobs for the current user with pagination and optional status filter
 */
export async function getJobs(params: JobsQueryParams = {}): Promise<PaginatedJobs> {
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

    const url = `/jobs${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const response = await apiClient.get<PaginatedJobs>(url)
    
    try {
        return paginatedJobsSchema.parse(response.data)
    } catch (error) {
        // Log validation errors for debugging
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
        // Log validation errors for debugging
        console.error('Job detail validation error:', error)
        throw new Error('Invalid job data received from server. Please try again later.')
    }
}

/**
 * Get job statistics (total, active, completed, failed counts)
 */
export async function getJobStatistics(): Promise<JobStatistics> {
    const response = await apiClient.get<JobStatistics>('/jobs/statistics')
    
    try {
        return jobStatisticsSchema.parse(response.data)
    } catch (error) {
        // Log validation errors for debugging
        console.error('Job statistics validation error:', error)
        throw new Error('Invalid statistics data received from server. Please try again later.')
    }
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
        // Log validation errors for debugging
        console.error('Job timeline validation error:', error)
        throw new Error('Invalid timeline data received from server. Please try again later.')
    }
}

// ============================================
// Job Action Response Type
// ============================================

export interface JobActionResponse {
    isSuccess: boolean
    value?: boolean
    error?: {
        code: string
        message: string
    }
}

// ============================================
// User Job Actions
// ============================================

/**
 * Retry a failed job
 * POST /api/jobs/{id}/retry
 *
 * @param storageProfileId - Send the retry to a different drive. Omit to reuse the
 *                           job's current destination.
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
 *
 * Rejected while the job is actively uploading — retry with a target instead.
 *
 * @param allowFailover - false pins the job to this drive, so it fails rather than
 *                        being rerouted automatically if the drive goes unhealthy.
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
 * Cancel an active job
 * POST /api/jobs/{id}/cancel
 */
export async function cancelJob(jobId: number): Promise<JobActionResponse> {
    const response = await apiClient.post<JobActionResponse>(`/jobs/${jobId}/cancel`)
    return response.data
}
