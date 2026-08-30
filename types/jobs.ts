// Jobs Types with Zod Validation
import { z } from 'zod'
import { JobStatus, JobType, StorageRouteReason } from './enums'
import type { UserJob } from './api'

// ============================================
// Zod Schemas
// ============================================

// Map of numeric enum values to string values (matching backend enum order)
const jobStatusNumberMap: Record<number, string> = {
    0: 'QUEUED',
    1: 'DOWNLOADING',
    2: 'PENDING_UPLOAD',
    3: 'UPLOADING',
    4: 'TORRENT_DOWNLOAD_RETRY',
    5: 'UPLOAD_RETRY',
    6: 'COMPLETED',
    7: 'FAILED',
    8: 'CANCELLED',
    9: 'TORRENT_FAILED',
    10: 'UPLOAD_FAILED',
    11: 'GOOGLE_DRIVE_FAILED',
}

const validStatusStrings = [
    'QUEUED',
    'DOWNLOADING',
    'PENDING_UPLOAD',
    'UPLOADING',
    'TORRENT_DOWNLOAD_RETRY',
    'UPLOAD_RETRY',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'TORRENT_FAILED',
    'UPLOAD_FAILED',
    'GOOGLE_DRIVE_FAILED',
] as const

// Schema that accepts both numeric enum values and string values
export const jobStatusSchema = z.preprocess(
    (val) => {
        // If it's a number, convert to string using the map
        if (typeof val === 'number') {
            return jobStatusNumberMap[val] ?? val
        }
        // If it's a string that represents a number, convert it
        if (typeof val === 'string' && /^\d+$/.test(val)) {
            const numVal = parseInt(val, 10)
            return jobStatusNumberMap[numVal] ?? val
        }
        // If it's already a string, return as-is
        return val
    },
    z.enum(validStatusStrings)
)

export const jobTypeSchema = z.enum(['Torrent'])

export const jobSchema = z.object({
    id: z.number().int().positive(),
    storageProfileId: z.number().int().positive(),
    storageProfileName: z.string().nullable(),
    // Set once a job has been moved off the profile it was created with.
    originalStorageProfileId: z.number().int().positive().nullable().optional().default(null),
    originalStorageProfileName: z.string().nullable().optional().default(null),
    allowStorageFailover: z.boolean().optional().default(true),
    failoverAttempts: z.number().int().nonnegative().optional().default(0),
    lastRouteReason: z.nativeEnum(StorageRouteReason).optional().default(StorageRouteReason.None),
    wasRerouted: z.boolean().optional().default(false),
    status: jobStatusSchema,
    type: jobTypeSchema,
    requestFileId: z.number().int().positive(),
    requestFileName: z.string().nullable(),
    errorMessage: z.string().nullable(),
    currentState: z.string().nullable(),
    bytesDownloaded: z.number().int().nonnegative(),
    bytesUploaded: z.number().int().nonnegative().default(0),
    totalBytes: z.number().int().nonnegative(),
    selectedFilePaths: z.array(z.string()).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().nullable().optional(),
    startedAt: z.string().datetime().nullable().optional(),
    completedAt: z.string().datetime().nullable().optional(),
    progressPercentage: z.number().transform((val) => Math.min(100, Math.max(0, val))),
    uploadProgressPercentage: z.number().transform((val) => Math.min(100, Math.max(0, val))).default(0),
    isActive: z.boolean(),
    // Action state properties
    canRetry: z.boolean().optional().default(false),
    canCancel: z.boolean().optional().default(false),
    // Left undefined rather than defaulted: an absent field means "this server did not
    // tell us", which is not the same as "no". Callers derive the answer from status.
    canChangeStorageProfile: z.boolean().optional(),
})

export const paginatedJobsSchema = z.object({
    items: z.array(jobSchema),
    totalCount: z.number().int().nonnegative(),
    pageNumber: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasPreviousPage: z.boolean(),
    hasNextPage: z.boolean(),
})

export const jobStatisticsSchema = z.object({
    totalJobs: z.number().int().nonnegative(),
    activeJobs: z.number().int().nonnegative(),
    completedJobs: z.number().int().nonnegative(),
    failedJobs: z.number().int().nonnegative(),
    downloadingJobs: z.number().int().nonnegative().optional(),
    // Available filters for the current user, as returned by the backend
    statusFilters: z.array(z.object({
        status: jobStatusSchema,
        count: z.number().int().nonnegative(),
    })),
})

export const jobsQueryParamsSchema = z.object({
    pageNumber: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().min(1).max(50).optional(),
    status: jobStatusSchema.nullable().optional(),
})

// ============================================
// Timeline Types
// ============================================

export enum StatusChangeSource {
    Worker = 'Worker',
    User = 'User',
    System = 'System',
    Recovery = 'Recovery',
}

// Map of numeric enum values to string values (if backend sends numeric)
const statusChangeSourceNumberMap: Record<number, string> = {
    0: 'Worker',
    1: 'User',
    2: 'System',
    3: 'Recovery',
}

// Schema for status change source with preprocessing to handle both string and numeric values
export const statusChangeSourceSchema = z.preprocess(
    (val) => {
        // If it's a number, convert to string using the map
        if (typeof val === 'number') {
            return statusChangeSourceNumberMap[val] ?? val
        }
        // If it's a string that represents a number, convert it
        if (typeof val === 'string' && /^\d+$/.test(val)) {
            const numVal = parseInt(val, 10)
            return statusChangeSourceNumberMap[numVal] ?? val
        }
        // If it's already a string, return as-is (case-insensitive matching)
        if (typeof val === 'string') {
            const upperVal = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()
            if (['Worker', 'User', 'System', 'Recovery'].includes(upperVal)) {
                return upperVal
            }
            return val
        }
        return val
    },
    z.enum(['Worker', 'User', 'System', 'Recovery'])
)

export const jobTimelineEntrySchema = z.object({
    fromStatus: jobStatusSchema.nullable(),
    toStatus: jobStatusSchema,
    source: statusChangeSourceSchema,
    sourceName: z.string(),
    errorMessage: z.string().nullable(),
    metadataJson: z.string().nullable(),
    changedAt: z.string().datetime(),
    durationFromPrevious: z.string().nullable(), // ISO 8601 duration format
})

export const paginatedJobTimelineSchema = z.object({
    items: z.array(jobTimelineEntrySchema),
    totalCount: z.number().int().nonnegative(),
    pageNumber: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasPreviousPage: z.boolean(),
    hasNextPage: z.boolean(),
})

// ============================================
// Inferred Types from Schemas
// ============================================

export type Job = z.infer<typeof jobSchema>
export type PaginatedJobs = z.infer<typeof paginatedJobsSchema>
export type JobStatistics = z.infer<typeof jobStatisticsSchema>
export type JobTimelineEntry = z.infer<typeof jobTimelineEntrySchema>
export type PaginatedJobTimeline = z.infer<typeof paginatedJobTimelineSchema>

// Manual type for query params (avoiding Zod default inference issues)
export interface JobsQueryParams {
    pageNumber?: number
    pageSize?: number
    status?: 'QUEUED' | 'DOWNLOADING' | 'PENDING_UPLOAD' | 'UPLOADING' | 'TORRENT_DOWNLOAD_RETRY' | 'UPLOAD_RETRY' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TORRENT_FAILED' | 'UPLOAD_FAILED' | 'GOOGLE_DRIVE_FAILED' | null
}

export interface JobTimelineQueryParams {
    pageNumber?: number
    pageSize?: number
}

// ============================================
// Component Props Types
// ============================================

export interface JobCardProps {
    job: UserJob
    className?: string
}

export interface JobListProps {
    jobs: UserJob[]
    title?: string
    limit?: number
    showViewAll?: boolean
    emptyMessage?: string
    className?: string
}

export interface JobDetailProps {
    job: Job
    className?: string
}

export interface JobsFiltersProps {
    className?: string
}

export interface JobsListProps {
    className?: string
}

export interface JobsPaginationProps {
    className?: string
}

// ============================================
// Status Labels and Colors
// ============================================

export const statusLabels: Record<JobStatus, string> = {
    [JobStatus.QUEUED]: 'Queued',
    [JobStatus.DOWNLOADING]: 'Downloading',
    [JobStatus.PENDING_UPLOAD]: 'Pending Upload',
    [JobStatus.UPLOADING]: 'Uploading',
    [JobStatus.TORRENT_DOWNLOAD_RETRY]: 'Retrying download',
    [JobStatus.UPLOAD_RETRY]: 'Retrying upload',
    [JobStatus.COMPLETED]: 'Completed',
    [JobStatus.FAILED]: 'Failed',
    [JobStatus.CANCELLED]: 'Cancelled',
    [JobStatus.TORRENT_FAILED]: 'Download failed',
    [JobStatus.UPLOAD_FAILED]: 'Upload failed',
    [JobStatus.GOOGLE_DRIVE_FAILED]: 'Google Drive upload failed',
}

// ============================================
// Error Messages
// ============================================

export const jobsErrorMessages: Record<string, string> = {
    // General errors (PascalCase - matching backend v2 format)
    'NotFound': 'Job not found.',
    'JobNotFound': 'Job not found.',
    'Unauthorized': 'You are not authorized to perform this action.',
    'FetchError': 'Failed to fetch jobs. Please try again.',

    // Retry errors
    'JobCompleted': 'Cannot retry a completed job.',
    'JobCancelled': 'Cannot retry a cancelled job.',
    'JobActive': 'Job is currently active. Wait for it to complete or fail before retrying.',
    'StorageInactive': 'The storage profile for this job is no longer active.',

    // Cancel errors
    'JobAlreadyCancelled': 'This job has already been cancelled.',
    'JobNotCancellable': 'This job cannot be cancelled in its current state.',
}

export function getJobsErrorMessage(code: string, fallback?: string): string {
    return jobsErrorMessages[code] || fallback || 'An unexpected error occurred'
}
