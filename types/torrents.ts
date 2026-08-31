// Torrent API types with Zod validation schemas
import { z } from 'zod'

// ============================================
// Torrent File Schema
// ============================================

export const torrentFileSchema = z.object({
    index: z.number(),
    path: z.string(),
    size: z.number(),
})

export type TorrentFileDto = z.infer<typeof torrentFileSchema>

// ============================================
// Torrent Health Measurements Schema
// ============================================

export const torrentHealthMeasurementsSchema = z.object({
    seeders: z.number(),
    leechers: z.number(),
    completed: z.number(),
    seederRatio: z.number(),
    isComplete: z.boolean(),
    isDead: z.boolean(),
    isWeak: z.boolean(),
    isHealthy: z.boolean(),
    healthScore: z.number(),
})

export type TorrentHealthMeasurements = z.infer<typeof torrentHealthMeasurementsSchema>

// ============================================
// Torrent Analysis Response Schema (Step 1)
// ============================================

export const torrentAnalysisResponseSchema = z.object({
    torrentFileId: z.number(),
    fileName: z.string(),
    infoHash: z.string(),
    totalSizeInBytes: z.number(),
    files: z.array(torrentFileSchema),
    torrentHealth: torrentHealthMeasurementsSchema,
})

export type TorrentAnalysisResponse = z.infer<typeof torrentAnalysisResponseSchema>

// ============================================
// Create Job Request Schema (Step 2)
// ============================================

export const createJobRequestSchema = z.object({
    torrentFileId: z.number(),
    selectedFilePaths: z.array(z.string()).nullable().optional(),
    storageProfileId: z.number(),
})

export type CreateJobRequest = z.infer<typeof createJobRequestSchema>

// ============================================
// Job Creation Result Schema
// ============================================

export const jobCreationResultSchema = z.object({
    jobId: z.number(),
    storageProfileId: z.number(),
})

export type JobCreationResult = z.infer<typeof jobCreationResultSchema>

// ============================================
// Batch Job Creation Schemas (start many at once)
// ============================================

export const createJobItemSchema = z.object({
    torrentFileId: z.number(),
    /** null means every file in the torrent */
    selectedFilePaths: z.array(z.string()).nullable(),
    /** overrides the batch destination for this torrent only */
    storageProfileId: z.number().nullable().optional(),
})

export type CreateJobItem = z.infer<typeof createJobItemSchema>

export const createJobsRequestSchema = z.object({
    /** destination for items that do not set their own */
    storageProfileId: z.number().nullable().optional(),
    items: z.array(createJobItemSchema).min(1),
})

export type CreateJobsRequest = z.infer<typeof createJobsRequestSchema>

export const jobCreationOutcomeSchema = z.object({
    torrentFileId: z.number(),
    jobId: z.number().nullable(),
    success: z.boolean(),
    errorCode: z.string().nullable(),
    errorMessage: z.string().nullable(),
})

export type JobCreationOutcome = z.infer<typeof jobCreationOutcomeSchema>

export const batchJobCreationResultSchema = z.object({
    results: z.array(jobCreationOutcomeSchema),
    succeededCount: z.number(),
    failedCount: z.number(),
})

export type BatchJobCreationResult = z.infer<typeof batchJobCreationResultSchema>

// ============================================
// API Error Response Schema
// ============================================

export const apiErrorResponseSchema = z.object({
    code: z.string(),
    message: z.string(),
})

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>

// ============================================
// Error Messages
// ============================================

export const torrentErrorMessages: Record<string, string> = {
    // PascalCase - matching backend v2 format
    InvalidTorrent: 'The uploaded file is not a valid torrent file',
    Invalid: 'Request validation failed',
    TorrentNotFound: 'Torrent file not found',
    ProfileNotFound: 'Storage profile not found',
    Unauthorized: 'Please sign in to continue',
    AccessDenied: 'You do not have permission to perform this action',
    ActiveJobExists: 'An active job already exists for this torrent',
    // Batch start
    EmptyBatch: 'No torrents were provided',
    BatchTooLarge: 'Too many torrents in one batch',
    InvalidStorageProfile: 'No storage destination was selected',
    JobAlreadyExists: 'This torrent already has an active job',
    JobRetrying: 'This torrent has a job that is currently retrying',
    StorageUnhealthy: 'That drive is not accepting uploads right now',
    JobCreationFailed: 'This torrent could not be started',
}

export function getTorrentErrorMessage(code: string): string {
    return torrentErrorMessages[code] || 'An unexpected error occurred. Please try again.'
}
