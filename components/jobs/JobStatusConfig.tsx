import {
    Clock,
    Download,
    Upload,
    CheckCircle2,
    RefreshCw,
    AlertCircle,
    Ban,
} from 'lucide-react'
import { JobStatus } from '@/types/enums'
import { ReactNode } from 'react'

export interface JobStatusConfigItem {
    icon: ReactNode
    badgeVariant: 'default' | 'secondary' | 'destructive' | 'warning' | 'processing' | 'pending' | 'success' | 'info'
    label: string
    color: string
    bgColor: string
    accentBar: string
}

export const jobStatusConfig: Record<JobStatus, JobStatusConfigItem> = {
    [JobStatus.QUEUED]: {
        icon: <Clock className="h-4 w-4" />,
        badgeVariant: 'pending',
        label: 'Queued',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        accentBar: 'bg-amber-400',
    },
    [JobStatus.DOWNLOADING]: {
        icon: <Download className="h-4 w-4" />,
        badgeVariant: 'processing',
        label: 'Downloading',
        color: 'text-sky-400',
        bgColor: 'bg-sky-500/10',
        accentBar: 'bg-sky-400',
    },
    [JobStatus.PENDING_UPLOAD]: {
        icon: <Clock className="h-4 w-4" />,
        badgeVariant: 'pending',
        label: 'Pending Upload',
        color: 'text-amber-300',
        bgColor: 'bg-amber-500/10',
        accentBar: 'bg-amber-400',
    },
    [JobStatus.UPLOADING]: {
        icon: <Upload className="h-4 w-4" />,
        badgeVariant: 'info',
        label: 'Uploading',
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10',
        accentBar: 'bg-violet-400',
    },
    [JobStatus.TORRENT_DOWNLOAD_RETRY]: {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        badgeVariant: 'warning',
        label: 'Retrying Download',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        accentBar: 'bg-orange-400',
    },
    [JobStatus.UPLOAD_RETRY]: {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        badgeVariant: 'warning',
        label: 'Retrying Upload',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        accentBar: 'bg-orange-400',
    },
    [JobStatus.COMPLETED]: {
        icon: <CheckCircle2 className="h-4 w-4" />,
        badgeVariant: 'success',
        label: 'Completed',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        accentBar: 'bg-emerald-400',
    },
    [JobStatus.FAILED]: {
        icon: <AlertCircle className="h-4 w-4" />,
        badgeVariant: 'destructive',
        label: 'Failed',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        accentBar: 'bg-rose-400',
    },
    [JobStatus.TORRENT_FAILED]: {
        icon: <AlertCircle className="h-4 w-4" />,
        badgeVariant: 'destructive',
        label: 'Download Failed',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        accentBar: 'bg-rose-400',
    },
    [JobStatus.UPLOAD_FAILED]: {
        icon: <AlertCircle className="h-4 w-4" />,
        badgeVariant: 'destructive',
        label: 'Upload Failed',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        accentBar: 'bg-rose-400',
    },
    [JobStatus.GOOGLE_DRIVE_FAILED]: {
        icon: <AlertCircle className="h-4 w-4" />,
        badgeVariant: 'destructive',
        label: 'Drive Upload Failed',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        accentBar: 'bg-rose-400',
    },
    [JobStatus.CANCELLED]: {
        icon: <Ban className="h-4 w-4" />,
        badgeVariant: 'secondary',
        label: 'Cancelled',
        color: 'text-zinc-400',
        bgColor: 'bg-zinc-500/10',
        accentBar: 'bg-zinc-500',
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
