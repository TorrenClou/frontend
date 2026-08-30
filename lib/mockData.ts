// Mock data generators for UI-only implementation
import {
    StorageProviderType,
    StorageHealthStatus,
    JobStatus,
    JobType,
} from '@/types/enums'

import type {
    TorrentFile,
    TorrentAnalysisResponse,
    StorageProfile,
    UserJob,
    PaginatedResult,
} from '@/types/api'

// ============================================
// Mock Torrent Data
// ============================================

export const mockTorrentFiles: TorrentFile[] = [
    { index: 0, path: 'Ubuntu 22.04.3 LTS/ubuntu-22.04.3-desktop-amd64.iso', size: 4800000000 },
    { index: 1, path: 'Ubuntu 22.04.3 LTS/README.txt', size: 2048 },
    { index: 2, path: 'Ubuntu 22.04.3 LTS/SHA256SUMS', size: 512 },
]

export const mockTorrentAnalysis: TorrentAnalysisResponse = {
    torrentFileId: 42,
    fileName: 'Ubuntu 22.04.3 LTS Desktop',
    infoHash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
    totalSizeInBytes: 4800002560,
    files: mockTorrentFiles,
    torrentHealth: {
        seeders: 1250,
        leechers: 85,
        completed: 45000,
        seederRatio: 14.71,
        isComplete: true,
        isDead: false,
        isWeak: false,
        isHealthy: true,
        healthScore: 92,
    },
}

// ============================================
// Mock Storage Profiles
// ============================================

export const mockStorageProfiles: StorageProfile[] = [
    {
        id: 1,
        profileName: 'My Google Drive',
        providerType: StorageProviderType.GoogleDrive,
        email: 'user@gmail.com',
        isDefault: true,
        isActive: true,
        needsReauth: false,
        isConfigured: true,
        healthStatus: StorageHealthStatus.Healthy,
        isUsable: true,
        healthMessage: null,
        lastHealthCheckAt: new Date().toISOString(),
        quotaTotalBytes: 15 * 1024 * 1024 * 1024,
        quotaUsedBytes: 4 * 1024 * 1024 * 1024,
        quotaFreeBytes: 11 * 1024 * 1024 * 1024,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 2,
        profileName: 'Work OneDrive',
        providerType: StorageProviderType.OneDrive,
        email: null,
        isDefault: false,
        isActive: true,
        needsReauth: false,
        isConfigured: true,
        healthStatus: StorageHealthStatus.Unknown,
        isUsable: true,
        healthMessage: null,
        lastHealthCheckAt: null,
        quotaTotalBytes: null,
        quotaUsedBytes: null,
        quotaFreeBytes: null,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 3,
        profileName: 'Backup Dropbox',
        providerType: StorageProviderType.Dropbox,
        email: null,
        isDefault: false,
        isActive: false,
        needsReauth: false,
        isConfigured: true,
        healthStatus: StorageHealthStatus.Unhealthy,
        isUsable: false,
        healthMessage: 'This storage profile is disconnected.',
        lastHealthCheckAt: null,
        quotaTotalBytes: null,
        quotaUsedBytes: null,
        quotaFreeBytes: null,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
]

// ============================================
// Mock Jobs
// ============================================

export const mockJobs: UserJob[] = [
    {
        id: 1,
        storageProfileId: 1,
        status: JobStatus.COMPLETED,
        type: JobType.Torrent,
        requestFileId: 1,
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
        bytesDownloaded: 4800000000,
        totalBytes: 4800000000,
        selectedFilePaths: ['Ubuntu 22.04.3 LTS/ubuntu-22.04.3-desktop-amd64.iso'],
        progress: 100,
        fileName: 'Ubuntu 22.04.3 LTS Desktop',
        storageProfileName: 'My Google Drive',
    },
    {
        id: 2,
        storageProfileId: 1,
        status: JobStatus.DOWNLOADING,
        type: JobType.Torrent,
        requestFileId: 2,
        currentState: 'Downloading files...',
        startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        bytesDownloaded: 1200000000,
        totalBytes: 3500000000,
        selectedFilePaths: ['Big Buck Bunny 4K/movie.mp4', 'Big Buck Bunny 4K/subtitles.srt', 'Big Buck Bunny 4K/readme.txt'],
        progress: 34.3,
        fileName: 'Big Buck Bunny 4K',
        storageProfileName: 'My Google Drive',
    },
    {
        id: 3,
        storageProfileId: 1,
        status: JobStatus.UPLOADING,
        type: JobType.Torrent,
        requestFileId: 3,
        currentState: 'Uploading to Google Drive...',
        startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        bytesDownloaded: 800000000,
        totalBytes: 800000000,
        selectedFilePaths: ['Sintel 1080p/sintel.mp4'],
        progress: 85,
        fileName: 'Sintel 1080p',
        storageProfileName: 'My Google Drive',
    },
    {
        id: 4,
        storageProfileId: 2,
        status: JobStatus.QUEUED,
        type: JobType.Torrent,
        requestFileId: 4,
        bytesDownloaded: 0,
        totalBytes: 2100000000,
        selectedFilePaths: ['Blender 4.0 Portable/blender.exe'],
        progress: 0,
        fileName: 'Blender 4.0 Portable',
        storageProfileName: 'Work OneDrive',
    },
    {
        id: 5,
        storageProfileId: 1,
        status: JobStatus.FAILED,
        type: JobType.Torrent,
        requestFileId: 5,
        errorMessage: 'Connection timeout: Unable to connect to peers',
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        bytesDownloaded: 500000000,
        totalBytes: 5000000000,
        selectedFilePaths: ['LibreOffice 7.6/installer.exe', 'LibreOffice 7.6/readme.txt'],
        progress: 10,
        fileName: 'LibreOffice 7.6',
        storageProfileName: 'My Google Drive',
    },
]

// ============================================
// Pagination Helper
// ============================================

export function paginateData<T>(
    data: T[],
    pageNumber: number = 1,
    pageSize: number = 10
): PaginatedResult<T> {
    const totalCount = data.length
    const totalPages = Math.ceil(totalCount / pageSize)
    const startIndex = (pageNumber - 1) * pageSize
    const endIndex = startIndex + pageSize
    const items = data.slice(startIndex, endIndex)

    return {
        items,
        totalCount,
        pageNumber,
        pageSize,
        totalPages,
        hasPreviousPage: pageNumber > 1,
        hasNextPage: pageNumber < totalPages,
    }
}
