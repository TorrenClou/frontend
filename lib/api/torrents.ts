// Torrent API client with Zod validation
import apiClient from '../axios'
import {
    torrentAnalysisResponseSchema,
    jobCreationResultSchema,
    batchJobCreationResultSchema,
    type TorrentAnalysisResponse,
    type JobCreationResult,
    type CreateJobsRequest,
    type BatchJobCreationResult,
} from '@/types/torrents'

// Re-export types for convenience
export type { TorrentAnalysisResponse, JobCreationResult, CreateJobsRequest, BatchJobCreationResult }
export { getTorrentErrorMessage, torrentErrorMessages } from '@/types/torrents'

/**
 * Analyze a torrent file
 * POST /api/torrents/analyze
 * 
 * Uploads a .torrent file and returns metadata including file list,
 * health info, and a torrentFileId for use in job creation.
 * 
 * @param file - The .torrent file to analyze
 * @returns Torrent analysis response with files, health, and torrentFileId
 */
export async function analyzeTorrentFile(file: File): Promise<TorrentAnalysisResponse> {
    const formData = new FormData()
    formData.append('TorrentFile', file)

    const response = await apiClient.post<TorrentAnalysisResponse>(
        '/torrents/analyze',
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }
    )

    return torrentAnalysisResponseSchema.parse(response.data)
}

/**
 * Create a download job from an analyzed torrent
 * POST /api/torrents/create-job (authenticated)
 * 
 * @param torrentFileId - The torrent file ID from analyze response
 * @param selectedFilePaths - Array of file paths to download (null = all files)
 * @param storageProfileId - Storage profile ID (required)
 * @returns Job creation result with job ID
 */
export async function createJob(
    torrentFileId: number,
    selectedFilePaths: string[] | null,
    storageProfileId: number
): Promise<JobCreationResult> {
    const response = await apiClient.post<JobCreationResult>(
        '/torrents/create-job',
        {
            torrentFileId,
            selectedFilePaths,
            storageProfileId,
        }
    )

    return jobCreationResultSchema.parse(response.data)
}

/**
 * Start several analysed torrents in one call
 * POST /api/torrents/create-jobs
 *
 * Each item carries its own file selection and may override the batch destination.
 * The response reports every item individually — a rejected torrent (duplicate,
 * already running, unreachable drive) does not stop the rest, so callers must read
 * `results` rather than assume success.
 */
export async function createJobs(
    request: CreateJobsRequest
): Promise<BatchJobCreationResult> {
    const response = await apiClient.post<BatchJobCreationResult>(
        '/torrents/create-jobs',
        request
    )

    return batchJobCreationResultSchema.parse(response.data)
}
