// Jobs Types with Zod Validation
import { z } from 'zod'
import { JobStatus, JobType, StorageRouteReason } from './enums'

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
        if (typeof val === 'number') {
            return jobStatusNumberMap[val] ?? val
        }
        if (typeof val === 'string' && /^\d+$/.test(val)) {
            const numVal = parseInt(val, 10)
            return jobStatusNumberMap[numVal] ?? val
        }
        return val
    },
    z.enum(validStatusStrings)
)

const routeReasonNumberMap: Record<number, StorageRouteReason> = {
    0: StorageRouteReason.None,
    1: StorageRouteReason.UserRouted,
    2: StorageRouteReason.FailoverNeedsReauth,
    3: StorageRouteReason.FailoverQuotaExceeded,
    4: StorageRouteReason.FailoverUnhealthy,
    5: StorageRouteReason.FailoverInactive,
}

export const storageRouteReasonSchema = z.preprocess(
    (val) => {
        if (val === null || val === undefined) return StorageRouteReason.None
        if (typeof val === 'number') {
            return routeReasonNumberMap[val] ?? StorageRouteReason.None
        }
        if (typeof val === 'string' && /^\d+$/.test(val)) {
            const numVal = parseInt(val, 10)
            return routeReasonNumberMap[numVal] ?? StorageRouteReason.None
        }
        return val
    },
    z.nativeEnum(StorageRouteReason).catch(StorageRouteReason.None)
)

export const jobTypeSchema = z.preprocess(
    (val) => (val === 0 || val === '0' || !val ? 'Torrent' : val),
    z.enum(['Torrent']).catch('Torrent')
)

export type MediaCategory = 'video' | 'audio' | 'archive' | 'document' | 'software' | 'other' | string

export const jobSchema = z.object({
    id: z.number().int().positive(),
    storageProfileId: z.number().int().positive(),
    storageProfileName: z.string().nullable().optional().default(null),
    storageProviderType: z.string().nullable().optional().default(null),
    // Set once a job has been moved off the profile it was created with.
    originalStorageProfileId: z.number().int().positive().nullable().optional().default(null),
    originalStorageProfileName: z.string().nullable().optional().default(null),
    allowStorageFailover: z.boolean().optional().default(true),
    failoverAttempts: z.number().int().nonnegative().optional().default(0),
    lastRouteReason: storageRouteReasonSchema.optional().default(StorageRouteReason.None),
    wasRerouted: z.boolean().optional().default(false),
    status: jobStatusSchema,
    type: jobTypeSchema,
    requestFileId: z.number().int().positive(),
    requestFileName: z.string().nullable().optional().default(null),
    infoHash: z.string().nullable().optional().default(null),
    errorMessage: z.string().nullable().optional().default(null),
    currentState: z.string().nullable().optional().default(null),
    lastHeartbeat: z.string().nullable().optional().default(null),
    bytesDownloaded: z.number().nonnegative().default(0),
    bytesUploaded: z.number().nonnegative().optional().default(0),
    totalBytes: z.number().nonnegative().default(0),
    // Live transfer rates written by the workers. Meaningful only during the matching
    // phase — a finished job reports 0.
    downloadSpeedBytesPerSecond: z.number().nonnegative().optional().default(0),
    uploadSpeedBytesPerSecond: z.number().nonnegative().optional().default(0),
    selectedFilePaths: z.array(z.string()).nullable().optional().default(null),
    totalFilesCount: z.number().int().nonnegative().optional(),
    selectedFilesCount: z.number().int().nonnegative().optional(),
    mediaCategory: z.string().nullable().optional(),
    isStalled: z.boolean().optional().default(false),
    isSelective: z.boolean().optional().default(false),
    createdAt: z.string(),
    updatedAt: z.string().nullable().optional(),
    startedAt: z.string().nullable().optional(),
    completedAt: z.string().nullable().optional(),
    progressPercentage: z.number().default(0).transform((val) => Math.min(100, Math.max(0, Number.isFinite(val) ? val : 0))),
    uploadProgressPercentage: z.number().optional().default(0).transform((val) => Math.min(100, Math.max(0, Number.isFinite(val) ? val : 0))),
    isActive: z.boolean().default(false),
    // Action state properties
    canRetry: z.boolean().optional().default(false),
    canCancel: z.boolean().optional().default(false),
    // Left undefined rather than defaulted: an absent field means "this server did not
    // tell us", which is not the same as "no". Callers derive the answer from status.
    canChangeStorageProfile: z.boolean().optional(),
    // True while the job is waiting on a queue hand-off and can be re-dispatched.
    canForceStart: z.boolean().optional().default(false),
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

/**
 * Worker capacity and queue depth. A download holds its worker for the whole
 * transfer, so capacity is a hard ceiling on concurrent torrents.
 */
export const jobQueueStatusSchema = z.object({
    downloadCapacity: z.number().int().nonnegative(),
    activeDownloads: z.number().int().nonnegative(),
    queuedDownloads: z.number().int().nonnegative(),
    uploadCapacity: z.number().int().nonnegative(),
    activeUploads: z.number().int().nonnegative(),
    downloadSlotsFull: z.boolean(),
})

export const profileJobCountSchema = z.object({
    storageProfileId: z.number().int(),
    profileName: z.string(),
    providerType: z.string(),
    count: z.number().int().nonnegative(),
})

export const jobStatisticsSchema = z.object({
    totalJobs: z.number().int().nonnegative().default(0),
    activeJobs: z.number().int().nonnegative().default(0),
    completedJobs: z.number().int().nonnegative().default(0),
    failedJobs: z.number().int().nonnegative().default(0),
    queuedJobs: z.number().int().nonnegative().optional().default(0),
    downloadingJobs: z.number().int().nonnegative().optional().default(0),
    pendingUploadJobs: z.number().int().nonnegative().optional().default(0),
    uploadingJobs: z.number().int().nonnegative().optional().default(0),
    retryingJobs: z.number().int().nonnegative().optional().default(0),
    cancelledJobs: z.number().int().nonnegative().optional().default(0),
    pinnedJobs: z.number().int().nonnegative().optional().default(0),
    reroutedJobs: z.number().int().nonnegative().optional().default(0),
    stalledJobs: z.number().int().nonnegative().optional().default(0),
    selectiveJobs: z.number().int().nonnegative().optional().default(0),
    totalBytesTransferred: z.number().nonnegative().optional().default(0),
    totalDownloadSpeedBytesPerSecond: z.number().nonnegative().optional().default(0),
    totalUploadSpeedBytesPerSecond: z.number().nonnegative().optional().default(0),
    providerCounts: z.record(z.string(), z.number()).optional().default({}),
    categoryCounts: z.record(z.string(), z.number()).optional().default({}),
    sizeBucketCounts: z.record(z.string(), z.number()).optional().default({}),
    profileCounts: z.array(profileJobCountSchema).optional().default([]),
    // Available filters for the current user, as returned by the backend
    statusFilters: z.array(z.object({
        status: jobStatusSchema,
        count: z.number().int().nonnegative(),
    })).optional().default([]),
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

const statusChangeSourceNumberMap: Record<number, string> = {
    0: 'Worker',
    1: 'User',
    2: 'System',
    3: 'Recovery',
}

export const statusChangeSourceSchema = z.preprocess(
    (val) => {
        if (typeof val === 'number') {
            return statusChangeSourceNumberMap[val] ?? val
        }
        if (typeof val === 'string' && /^\d+$/.test(val)) {
            const numVal = parseInt(val, 10)
            return statusChangeSourceNumberMap[numVal] ?? val
        }
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
    changedAt: z.string(),
    durationFromPrevious: z.string().nullable(),
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

export type BaseJob = z.infer<typeof jobSchema>

/**
 * Unified Job DTO across the frontend.
 * Includes legacy optional display fields (`fileName`, `progress`) so any caller
 * constructed against the older `UserJob` shape remains 100% compatible without
 * lossy `toUserJob` conversions.
 */
export interface Job extends BaseJob {
    fileName?: string | null
    progress?: number
    timeline?: JobTimelineEntry[] | null
}

export type UserJob = Job

export type PaginatedJobs = Omit<z.infer<typeof paginatedJobsSchema>, 'items'> & {
    items: Job[]
}
export type JobStatistics = z.infer<typeof jobStatisticsSchema>
export type JobQueueStatus = z.infer<typeof jobQueueStatusSchema>
export type JobTimelineEntry = z.infer<typeof jobTimelineEntrySchema>
export type PaginatedJobTimeline = z.infer<typeof paginatedJobTimelineSchema>

export type JobPhaseFilter =
    | 'all'
    | 'active'
    | 'downloading'
    | 'uploading'
    | 'queued'
    | 'retrying'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | string

export type JobSortField =
    | 'createdAt'
    | 'size'
    | 'progress'
    | 'speed'
    | 'name'
    | 'completedAt'
    | 'updatedAt'
    | string

export type SortDirection = 'asc' | 'desc'

export interface JobQueryParameters {
    pageNumber?: number
    pageSize?: number
    status?: JobStatus | string | null
    statuses?: string | null
    phase?: JobPhaseFilter | null
    search?: string | null
    provider?: 'GoogleDrive' | 'S3' | string | null
    storageProfileId?: number | null
    category?: MediaCategory | null
    sizeBucket?: 'small' | 'medium' | 'large' | 'xl' | string | null
    dateRange?: 'today' | '7d' | '30d' | '90d' | string | null
    isPinned?: boolean | null
    wasRerouted?: boolean | null
    isStalled?: boolean | null
    isSelective?: boolean | null
    hasError?: boolean | null
    sortBy?: JobSortField | null
    sortDir?: SortDirection | null
}

export type JobsQueryParams = JobQueryParameters

export interface JobTimelineQueryParams {
    pageNumber?: number
    pageSize?: number
}

export interface BatchJobActionError {
    jobId?: number
    code?: string
    message: string
}

export interface BatchJobActionResult {
    totalRequested: number
    succeededCount: number
    failedCount: number
    succeededJobIds: number[]
    errors: BatchJobActionError[]
}

// ============================================
// Component Props Types
// ============================================

export interface JobCardProps {
    job: Job
    className?: string
    selectable?: boolean
    selected?: boolean
    onSelectChange?: (checked: boolean) => void
    onRetry?: (jobId: number) => void
    onForceStart?: (jobId: number) => void
    onCancel?: (jobId: number) => void
    isRetrying?: boolean
    isForceStarting?: boolean
    isCancelling?: boolean
}

export interface JobListProps {
    jobs: Job[]
    title?: string
    limit?: number
    showViewAll?: boolean
    emptyMessage?: string
    className?: string
    onRetry?: (jobId: number) => void
    onForceStart?: (jobId: number) => void
    onCancel?: (jobId: number) => void
}

export interface JobDetailProps {
    job: Job
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
