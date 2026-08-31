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
