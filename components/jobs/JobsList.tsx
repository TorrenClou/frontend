'use client'

import { useJobs, usePrefetchNextPage } from '@/hooks/useJobs'
import { useJobsStore } from '@/stores/jobsStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/empty-state'
import { formatFileSize, formatRelativeTime, formatTransferSpeed } from '@/lib/utils/formatters'
import { JobStatus } from '@/types/enums'
import type { JobsListProps, Job } from '@/types/jobs'
import { cn } from '@/lib/utils'
import {
    Clock,
    Download,
    Upload,
    CheckCircle,
    XCircle,
    Ban,
    ChevronRight,
    FolderOpen,
    HardDrive,
    FileText,
    RefreshCw,
    AlertCircle,
    Cloud,
    ArrowDown,
    ArrowUp,
} from 'lucide-react'
import { useEffect } from 'react'

const statusConfig: Record<JobStatus, {
    icon: React.ReactNode
    badgeVariant: 'default' | 'secondary' | 'destructive' | 'warning' | 'processing' | 'pending' | 'success'
    label: string
    color: string
    bgColor: string
}> = {
    [JobStatus.QUEUED]: {
        icon: <Clock className="h-5 w-5" />,
        badgeVariant: 'pending',
        label: 'Queued',
        color: 'text-warning',
        bgColor: 'bg-warning/20',
    },
    [JobStatus.DOWNLOADING]: {
        icon: <Download className="h-5 w-5" />,
        badgeVariant: 'processing',
        label: 'Downloading',
        color: 'text-primary',
        bgColor: 'bg-primary/20',
    },
    [JobStatus.PENDING_UPLOAD]: {
        icon: <Clock className="h-5 w-5" />,
        badgeVariant: 'pending',
        label: 'Pending Upload',
        color: 'text-warning',
        bgColor: 'bg-warning/20',
    },
    [JobStatus.UPLOADING]: {
        icon: <Upload className="h-5 w-5" />,
        badgeVariant: 'secondary',
        label: 'Uploading',
        color: 'text-info',
        bgColor: 'bg-info/20',
    },
    [JobStatus.TORRENT_DOWNLOAD_RETRY]: {
        icon: <RefreshCw className="h-5 w-5" />,
        badgeVariant: 'processing',
        label: 'Retrying download',
        color: 'text-warning',
        bgColor: 'bg-warning/20',
    },
    [JobStatus.UPLOAD_RETRY]: {
        icon: <RefreshCw className="h-5 w-5" />,
        badgeVariant: 'processing',
        label: 'Retrying upload',
        color: 'text-warning',
        bgColor: 'bg-warning/20',
    },
    [JobStatus.COMPLETED]: {
        icon: <CheckCircle className="h-5 w-5" />,
        badgeVariant: 'success',
        label: 'Completed',
        color: 'text-success',
        bgColor: 'bg-success/20',
    },
    [JobStatus.FAILED]: {
        icon: <XCircle className="h-5 w-5" />,
        badgeVariant: 'destructive',
        label: 'Failed',
        color: 'text-danger',
        bgColor: 'bg-danger/20',
    },
    [JobStatus.TORRENT_FAILED]: {
        icon: <XCircle className="h-5 w-5" />,
        badgeVariant: 'destructive',
        label: 'Download failed',
        color: 'text-danger',
        bgColor: 'bg-danger/20',
    },
    [JobStatus.UPLOAD_FAILED]: {
        icon: <XCircle className="h-5 w-5" />,
        badgeVariant: 'destructive',
        label: 'Upload failed',
        color: 'text-danger',
        bgColor: 'bg-danger/20',
    },
    [JobStatus.GOOGLE_DRIVE_FAILED]: {
        icon: <AlertCircle className="h-5 w-5" />,
        badgeVariant: 'destructive',
        label: 'Google Drive upload failed',
        color: 'text-danger',
        bgColor: 'bg-danger/20',
    },
    [JobStatus.CANCELLED]: {
        icon: <Ban className="h-5 w-5" />,
        badgeVariant: 'secondary',
        label: 'Cancelled',
        color: 'text-surface-50',
        bgColor: 'bg-surface-300',
    },
}

interface JobItemCardProps {
    job: Job
    isSelected: boolean
    onSelect: (id: number) => void
}

function JobItemCard({ job, isSelected, onSelect }: JobItemCardProps) {
    const config = statusConfig[job.status as JobStatus]
    const isActive = job.isActive

    return (
        <Card
            onClick={() => onSelect(job.id)}
            className={cn(
                'group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50',
                isActive && 'border-l-4 border-l-primary',
                job.status === JobStatus.COMPLETED && 'border-l-4 border-l-success',
                (job.status === JobStatus.FAILED ||
                    job.status === JobStatus.TORRENT_FAILED ||
                    job.status === JobStatus.UPLOAD_FAILED ||
                    job.status === JobStatus.GOOGLE_DRIVE_FAILED) && 'border-l-4 border-l-danger',
                isSelected && 'ring-2 ring-primary bg-primary/5'
            )}
        >
            <CardContent className="p-5">
                <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors',
                        config.bgColor,
                        config.color
                    )}>
                        {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                        {/* Title Row */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                                    {job.requestFileName || `Job #${job.id}`}
                                </h3>
                                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5" />
                                        {formatFileSize(job.totalBytes)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <HardDrive className="h-3.5 w-3.5" />
                                        {job.storageProfileName || 'Unknown'}
                                    </span>
                                    <span>
                                        {job.startedAt
                                            ? formatRelativeTime(job.startedAt)
                                            : formatRelativeTime(job.createdAt)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Badge variant={config.badgeVariant}>{config.label}</Badge>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        </div>

                        {/* Progress Bar for Active Jobs */}
                        {isActive && job.totalBytes > 0 && (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {job.currentState || config.label}
                                    </span>
                                    <span className="font-medium text-primary">
                                        {job.progressPercentage.toFixed(1)}%
                                    </span>
                                </div>
                                <Progress value={job.progressPercentage} className="h-2" />
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{formatFileSize(job.bytesDownloaded)} downloaded</span>
                                    <div className="flex items-center gap-3">
                                        {(() => {
                                            // Whichever phase is moving. Both can be zero
                                            // between phases, in which case nothing shows.
                                            const down = formatTransferSpeed(job.downloadSpeedBytesPerSecond)
                                            const up = formatTransferSpeed(job.uploadSpeedBytesPerSecond)
                                            return (
                                                <>
                                                    {down && (
                                                        <span className="flex items-center gap-1 font-mono text-primary">
                                                            <ArrowDown className="h-3 w-3" />
                                                            {down}
                                                        </span>
                                                    )}
                                                    {up && (
                                                        <span className="flex items-center gap-1 font-mono text-info-medium">
                                                            <ArrowUp className="h-3 w-3" />
                                                            {up}
                                                        </span>
                                                    )}
                                                </>
                                            )
                                        })()}
                                        <span>{formatFileSize(job.totalBytes - job.bytesDownloaded)} remaining</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {job.errorMessage && (
                            <div className="flex items-start gap-2 p-2 bg-danger/10 border border-danger/20 rounded-lg">
                                <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                                <p className="text-sm text-danger">{job.errorMessage}</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function JobsList({ className }: JobsListProps) {
    const { data, isLoading, error, refetch } = useJobs()
    const { selectedJobId, setSelectedJobId } = useJobsStore()
    const prefetchNextPage = usePrefetchNextPage()

    // Prefetch next page when data is loaded
    useEffect(() => {
        if (data?.hasNextPage) {
            prefetchNextPage(true)
        }
    }, [data?.hasNextPage, prefetchNextPage])

    if (isLoading) {
        return (
            <div className={cn('space-y-4', className)}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-xl bg-muted" />
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                            <div className="h-5 w-48 bg-muted rounded" />
                                            <div className="h-4 w-32 bg-muted rounded" />
                                        </div>
                                        <div className="h-6 w-20 bg-muted rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <Card className="border-danger/50">
                <CardContent className="p-6 text-center">
                    <AlertCircle className="h-12 w-12 text-danger mx-auto mb-4" />
                    <p className="text-danger mb-4">
                        {error instanceof Error ? error.message : 'Failed to load jobs'}
                    </p>
                    <Button onClick={() => refetch()} variant="outline" size="sm">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry
                    </Button>
                </CardContent>
            </Card>
        )
    }

    if (!data || data.items.length === 0) {
        return (
            <EmptyState
                icon={FolderOpen}
                title="No jobs found"
                description="Upload a torrent to start a new download job"
            />
        )
    }

    return (
        <div className={cn('space-y-4', className)}>
            {data.items.map((job) => (
                <JobItemCard
                    key={job.id}
                    job={job}
                    isSelected={selectedJobId === job.id}
                    onSelect={setSelectedJobId}
                />
            ))}
        </div>
    )
}
