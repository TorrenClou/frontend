// Settings and maintenance API client with Zod validation
import apiClient from '../axios'
import {
    userSettingsSchema,
    downloadStoragePreviewSchema,
    purgeDownloadsResultSchema,
    type UserSettings,
    type UpdateUserSettingsRequest,
    type DownloadStoragePreview,
    type PurgeDownloadsResult,
} from '@/types/settings'

export type { UserSettings, UpdateUserSettingsRequest, DownloadStoragePreview, PurgeDownloadsResult }

/**
 * Current user preferences
 * GET /api/settings
 */
export async function getUserSettings(): Promise<UserSettings> {
    const response = await apiClient.get<UserSettings>('/settings')
    return userSettingsSchema.parse(response.data)
}

/**
 * Update user preferences
 * PUT /api/settings
 */
export async function updateUserSettings(
    request: UpdateUserSettingsRequest
): Promise<UserSettings> {
    const response = await apiClient.put<UserSettings>('/settings', request)
    return userSettingsSchema.parse(response.data)
}

/**
 * What the downloads volume currently holds
 * GET /api/maintenance/downloads
 *
 * Read-only: reports what a purge would delete, what it would keep, and any
 * directories with no matching job.
 */
export async function getDownloadStorage(): Promise<DownloadStoragePreview> {
    const response = await apiClient.get<DownloadStoragePreview>('/maintenance/downloads')
    return downloadStoragePreviewSchema.parse(response.data)
}

/**
 * Delete the download directories of completed and cancelled jobs
 * POST /api/maintenance/downloads/purge
 *
 * Destructive. Only ever removes COMPLETED and CANCELLED job directories.
 */
export async function purgeDownloads(): Promise<PurgeDownloadsResult> {
    const response = await apiClient.post<PurgeDownloadsResult>('/maintenance/downloads/purge')
    return purgeDownloadsResultSchema.parse(response.data)
}
