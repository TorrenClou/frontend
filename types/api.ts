// API Response Types - Complete DTOs matching backend
export type { TorrentAnalysisResponse } from './torrents'
export type { StorageProfile, OAuthCredential, GoogleDriveAuthResponse } from './storage'
export type { Job, UserJob } from './jobs'

// ============================================
// User Models
// ============================================

export interface User {
  id: number
  email: string
  fullName: string
}

export interface AuthResponse {
  accessToken: string
  email: string
  fullName: string
}

export interface BackendAuthResponse {
  accessToken: string
  user: BackendUserData
}

export interface BackendUserData {
  id: string
  name: string | null
  email: string | null
  image?: string | null
}

// ============================================
// Torrent Models
// ============================================

export interface TorrentFile {
  index: number
  path: string
  size: number
}

export interface TorrentHealthMeasurements {
  seeders: number
  leechers: number
  completed: number
  seederRatio: number
  isComplete: boolean
  isDead: boolean
  isWeak: boolean
  isHealthy: boolean
  healthScore: number
}

// ============================================
// Job Models
// ============================================

// Legacy type for backward compatibility
export interface TorrentJob {
  id: string
  filename: string
  size: number
  status: 'Downloading' | 'Uploading' | 'Completed' | 'Failed'
  progress: number
  createdAt: string
}

export interface JobCreationResult {
  jobId: number
  storageProfileId: number
}

// ============================================
// Create Job Request
// ============================================

export interface CreateJobRequest {
  torrentFileId: number
  selectedFilePaths?: string[] | null
  storageProfileId: number
}

// ============================================
// Pagination Models
// ============================================

export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}
