import {
    Clock,
    Download,
    Upload,
    CheckCircle,
    XCircle,
    RefreshCcw,
    AlertCircle,
} from 'lucide-react'
import { JobStatus } from '@/types/enums'
import { ReactNode } from 'react'

export interface JobStatusConfigItem {
    icon: ReactNode
    badgeVariant: 'default' | 'secondary' | 'destructive' | 'warning' | 'processing' | 'pending'
    label: string
    color: string
}

export const jobStatusConfig: Record<JobStatus, JobStatusConfigItem> = {
    [JobStatus.QUEUED]: {
        icon: <Clock className="h-6 w-6" />,
        badgeVariant: 'pending',
        label: 'Queued',
        color: 'text-warning-medium',
    },
    [JobStatus.DOWNLOADING]: {
        icon: <Download className="h-6 w-6" />,
        badgeVariant: 'processing',
        label: 'Downloading',
        color: 'text-primary',
    },
    [JobStatus.PENDING_UPLOAD]: {
        icon: <Clock className="h-6 w-6" />,
        badgeVariant: 'pending',
        label: 'Pending Upload',
        color: 'text-warning-medium',
    },
    [JobStatus.UPLOADING]: {
        icon: <Upload className="h-6 w-6" />,
        badgeVariant: 'secondary',
        label: 'Uploading',
        color: 'text-info-medium',
    },
    [JobStatus.TORRENT_DOWNLOAD_RETRY]: {
        icon: <RefreshCcw className="h-6 w-6" />,
        badgeVariant: 'processing',
        label: 'Retrying download',
        color: 'text-warning-medium',
    },
    [JobStatus.UPLOAD_RETRY]: {
        icon: <RefreshCcw className="h-6 w-6" />,
        badgeVariant: 'processing',
        label: 'Retrying upload',
        color: 'text-warning-medium',
    },
    [JobStatus.COMPLETED]: {
        icon: <CheckCircle className="h-6 w-6" />,
        badgeVariant: 'default',
        label: 'Completed',
        color: 'text-success-medium',
    },
    [JobStatus.FAILED]: {
        icon: <XCircle className="h-6 w-6" />,
        badgeVariant: 'destructive',
        label: 'Failed',
        color: 'text-danger-medium',
    },
    [JobStatus.TORRENT_FAILED]: {
        icon: <XCircle className="h-6 w-6" />,
        badgeVariant: 'destructive',
        label: 'Download failed',
        color: 'text-danger-medium',
    },
    [JobStatus.UPLOAD_FAILED]: {
        icon: <XCircle className="h-6 w-6" />,
        badgeVariant: 'destructive',
        label: 'Upload failed',
        color: 'text-danger-medium',
    },
    [JobStatus.GOOGLE_DRIVE_FAILED]: {
        icon: <AlertCircle className="h-6 w-6" />,
        badgeVariant: 'destructive',
        label: 'Google Drive upload failed',
        color: 'text-danger-medium',
    },
    [JobStatus.CANCELLED]: {
        icon: <XCircle className="h-6 w-6" />,
        badgeVariant: 'secondary',
        label: 'Cancelled',
        color: 'text-muted-foreground',
    },
}

export function getJobStatusConfig(status: JobStatus): JobStatusConfigItem {
    return jobStatusConfig[status] || jobStatusConfig[JobStatus.QUEUED]
}

export const ACTIVE_JOB_STATUSES = [
    JobStatus.QUEUED,
    JobStatus.DOWNLOADING,
    JobStatus.PENDING_UPLOAD,
    JobStatus.UPLOADING,
    JobStatus.TORRENT_DOWNLOAD_RETRY,
    JobStatus.UPLOAD_RETRY,
]

export const FAILED_JOB_STATUSES = [
    JobStatus.FAILED,
    JobStatus.TORRENT_FAILED,
    JobStatus.UPLOAD_FAILED,
    JobStatus.GOOGLE_DRIVE_FAILED,
]

export function isJobActive(status: JobStatus): boolean {
    return ACTIVE_JOB_STATUSES.includes(status)
}

export function isJobFailed(status: JobStatus): boolean {
    return FAILED_JOB_STATUSES.includes(status)
}