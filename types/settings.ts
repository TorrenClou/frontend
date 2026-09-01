// Settings and maintenance types with Zod validation
import { z } from 'zod'

// ============================================
// User Settings
// ============================================

export const userSettingsSchema = z.object({
    /** Delete a job's local download directory once every file has been uploaded. */
    deleteAfterUpload: z.boolean(),
})

export type UserSettings = z.infer<typeof userSettingsSchema>

export const updateUserSettingsRequestSchema = z.object({
    deleteAfterUpload: z.boolean(),
})

export type UpdateUserSettingsRequest = z.infer<typeof updateUserSettingsRequestSchema>

// ============================================
// System Settings (instance-wide)
// ============================================

export const systemSettingsSchema = z.object({
    /** Reroute an upload to another healthy drive when its destination fails. */
    enableFailover: z.boolean(),
    /** Cap on automatic reroutes per job, so one job cannot walk every drive you own. */
    maxFailoverAttempts: z.number(),
    /** Consecutive upload failures before a drive is marked unhealthy. */
    failureThreshold: z.number(),
    healthCacheTtlSeconds: z.number(),
    quotaHeadroomRatio: z.number(),
    degradedFreeQuotaRatio: z.number(),
    probeTimeoutSeconds: z.number(),

    /** Concurrent transfers. A download holds its worker for the whole transfer. */
    hangfireWorkerCount: z.number(),
    enablePrometheus: z.boolean(),
    enableTracing: z.boolean(),

    /**
     * Field names that only take effect after a restart. Sent by the server so the UI
     * does not keep its own copy of the list in sync.
     */
    requiresRestart: z.array(z.string()),
})

export type SystemSettings = z.infer<typeof systemSettingsSchema>

export const updateSystemSettingsRequestSchema = systemSettingsSchema.omit({
    requiresRestart: true,
})

export type UpdateSystemSettingsRequest = z.infer<typeof updateSystemSettingsRequestSchema>

export const changePasswordRequestSchema = z.object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(12, 'Password must be at least 12 characters'),
})

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>

// ============================================
// Downloads Volume Maintenance
// ============================================

export const downloadDirectorySchema = z.object({
    jobId: z.number().nullable(),
    directoryName: z.string(),
    sizeBytes: z.number(),
    jobStatus: z.string().nullable(),
    torrentName: z.string().nullable(),
    completedAt: z.string().nullable(),
})

export type DownloadDirectory = z.infer<typeof downloadDirectorySchema>

export const downloadStoragePreviewSchema = z.object({
    /** Directories for COMPLETED or CANCELLED jobs — what Purge deletes. */
    purgeable: z.array(downloadDirectorySchema),
    purgeableCount: z.number(),
    purgeableBytes: z.number(),
    /** Still running, retrying or failed — kept, because those jobs may still need them. */
    retainedCount: z.number(),
    retainedBytes: z.number(),
    /** No matching job row. Counted so the space is visible, never deleted. */
    orphanedCount: z.number(),
    orphanedBytes: z.number(),
    totalBytes: z.number(),
    warning: z.string().nullable(),
})

export type DownloadStoragePreview = z.infer<typeof downloadStoragePreviewSchema>

export const purgeDownloadsResultSchema = z.object({
    deletedCount: z.number(),
    freedBytes: z.number(),
    failedCount: z.number(),
    failures: z.array(z.string()),
})

export type PurgeDownloadsResult = z.infer<typeof purgeDownloadsResultSchema>
