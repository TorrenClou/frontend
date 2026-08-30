// Enums matching backend DTOs

export enum StorageProviderType {
    GoogleDrive = "GoogleDrive",
    OneDrive = "OneDrive",
    S3 = "S3",
    Dropbox = "Dropbox"
}

export enum FileStatus {
    PENDING = "PENDING",
    DOWNLOADING = "DOWNLOADING",
    READY = "READY",
    CORRUPTED = "CORRUPTED",
    DELETED = "DELETED"
}

export enum JobStatus {
    QUEUED = "QUEUED",
    DOWNLOADING = "DOWNLOADING",
    PENDING_UPLOAD = "PENDING_UPLOAD",
    UPLOADING = "UPLOADING",
    TORRENT_DOWNLOAD_RETRY = "TORRENT_DOWNLOAD_RETRY",
    UPLOAD_RETRY = "UPLOAD_RETRY",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
    TORRENT_FAILED = "TORRENT_FAILED",
    UPLOAD_FAILED = "UPLOAD_FAILED",
    GOOGLE_DRIVE_FAILED = "GOOGLE_DRIVE_FAILED"
}

export enum JobType {
    Torrent = "Torrent"
}

/** Connection health of a storage profile, as reported by the backend health probe. */
export enum StorageHealthStatus {
    Unknown = "Unknown",
    Healthy = "Healthy",
    Degraded = "Degraded",
    Unhealthy = "Unhealthy"
}

/** Why a job last changed storage destination. */
export enum StorageRouteReason {
    None = "None",
    UserRouted = "UserRouted",
    FailoverNeedsReauth = "FailoverNeedsReauth",
    FailoverQuotaExceeded = "FailoverQuotaExceeded",
    FailoverUnhealthy = "FailoverUnhealthy",
    FailoverInactive = "FailoverInactive"
}
