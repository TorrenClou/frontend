'use client'

import * as React from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    formatFileSize,
    formatRelativeTime,
} from '@/lib/utils/formatters'
import { getJobPhaseProgress } from '@/lib/utils/job-progress'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { JobStatus, StorageRouteReason } from '@/types/enums'
import type { Job, JobCardProps, JobListProps } from '@/types/jobs'
import { UnifiedProgressPipeline } from './UnifiedProgressPipeline'
import {
    Clock,
    Download,
    Upload,
    CheckCircle,
    XCircle,
    Ban,
    ChevronRight,
    FolderOpen,
    FileText,
    RefreshCw,
    Cloud,
    AlertCircle,
    AlertTriangle,
    Film,
    Music,
    Archive,
    Package,
    File,
    Pin,
    Shuffle,
    Copy,
    Check,
    Play,
    ArrowDown,
    ArrowUp,
    Database,
    Layers,
    Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const statusConfig: Record<
    JobStatus,
    {
        icon: React.ReactNode
        badgeVariant:
            | 'default'
            | 'secondary'
            | 'destructive'
            | 'warning'
            | 'processing'
            | 'pending'
            | 'success'
            | 'info'
        label: string
        color: string
        bgColor: string
        accentBar: string
    }
> = {
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
        accentBar: 'bg-sky-500',
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
        accentBar: 'bg-violet-500',
    },
    [JobStatus.TORRENT_DOWNLOAD_RETRY]: {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        badgeVariant: 'warning',
        label: 'Retrying Download',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        accentBar: 'bg-orange-500',
    },
    [JobStatus.UPLOAD_RETRY]: {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        badgeVariant: 'warning',
        label: 'Retrying Upload',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        accentBar: 'bg-orange-500',
    },
    [JobStatus.COMPLETED]: {
        icon: <CheckCircle className="h-4 w-4" />,
        badgeVariant: 'success',
        label: 'Completed',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        accentBar: 'bg-emerald-500',
    },
    [JobStatus.FAILED]: {
        icon: <XCircle className="h-4 w-4" />,
        badgeVariant: 'destructive',
        label: 'Failed',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        accentBar: 'bg-rose-500',
    },
    [JobStatus.TORRENT_FAILED]: {
        icon: <XCircle className="h-4 w-4" />,
        badgeVariant: 'destructive',
        label: 'Download Failed',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        accentBar: 'bg-rose-500',
    },
    [JobStatus.UPLOAD_FAILED]: {
        icon: <XCircle className="h-4 w-4" />,
        badgeVariant: 'destructive',
        label: 'Upload Failed',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        accentBar: 'bg-rose-500',
    },
    [JobStatus.GOOGLE_DRIVE_FAILED]: {
        icon: <AlertCircle className="h-4 w-4" />,
        badgeVariant: 'destructive',
        label: 'Drive Upload Failed',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        accentBar: 'bg-rose-500',
    },
    [JobStatus.CANCELLED]: {
        icon: <Ban className="h-4 w-4" />,
        badgeVariant: 'secondary',
        label: 'Cancelled',
        color: 'text-zinc-400',
        bgColor: 'bg-zinc-500/10',
        accentBar: 'bg-zinc-600',
    },
}

const routeReasonShortLabel: Record<StorageRouteReason, string> = {
    [StorageRouteReason.None]: 'Rerouted',
    [StorageRouteReason.UserRouted]: 'Manually routed',
    [StorageRouteReason.FailoverNeedsReauth]: 'Auto-failover: auth expired',
    [StorageRouteReason.FailoverQuotaExceeded]: 'Auto-failover: quota full',
    [StorageRouteReason.FailoverUnhealthy]: 'Auto-failover: drive unhealthy',
    [StorageRouteReason.FailoverInactive]: 'Auto-failover: drive inactive',
}

function inferMediaCategory(job: Job): string {
    if (job.mediaCategory) {
        return job.mediaCategory.toLowerCase()
    }
    const name = (job.requestFileName || job.fileName || '').toLowerCase()
    if (/\.(mp4|mkv|avi|mov|webm|m4v|ts|flv|wmv)(\.torrent)?$/.test(name)) return 'video'
    if (/\.(mp3|flac|wav|aac|ogg|m4a|opus)(\.torrent)?$/.test(name)) return 'audio'
    if (/\.(zip|rar|7z|tar|gz|bz2|xz|tgz)(\.torrent)?$/.test(name)) return 'archive'
    if (/\.(pdf|epub|mobi|doc|docx|txt|md|djvu)(\.torrent)?$/.test(name)) return 'document'
    if (/\.(iso|exe|msi|dmg|pkg|deb|rpm|apk|appimage)(\.torrent)?$/.test(name)) return 'software'
    return 'other'
}

function getCategoryMeta(category: string): { icon: React.ReactNode; label: string } {
    switch (category) {
        case 'video':
            return { icon: <Film className="h-3 w-3 text-sky-400" />, label: 'Video' }
        case 'audio':
            return { icon: <Music className="h-3 w-3 text-violet-400" />, label: 'Audio' }
        case 'archive':
            return { icon: <Archive className="h-3 w-3 text-amber-400" />, label: 'Archive' }
        case 'document':
            return { icon: <FileText className="h-3 w-3 text-emerald-400" />, label: 'Document' }
        case 'software':
            return { icon: <Package className="h-3 w-3 text-sky-400" />, label: 'Software' }
        default:
            return { icon: <File className="h-3 w-3 text-muted-foreground" />, label: 'Torrent' }
    }
}

function formatEta(remainingBytes: number, speedBytesPerSecond?: number | null): string | null {
    if (
        !speedBytesPerSecond ||
        speedBytesPerSecond <= 0 ||
        !Number.isFinite(speedBytesPerSecond) ||
        remainingBytes <= 0
    ) {
        return null
    }
    const seconds = Math.ceil(remainingBytes / speedBytesPerSecond)
    if (!Number.isFinite(seconds) || seconds <= 0) return null
    if (seconds < 60) return `${seconds}s left`
    if (seconds < 3600) {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return secs > 0 ? `${mins}m ${secs}s left` : `${mins}m left`
    }
    if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        return `${hours}h ${mins}m left`
    }
    return '> 24h left'
}

export function JobCard({
    job,
    className,
    selectable = false,
    selected = false,
    onSelectChange,
    onRetry,
    onForceStart,
    onCancel,
    isRetrying = false,
    isForceStarting = false,
    isCancelling = false,
}: JobCardProps) {
    const { copied: copiedHash, copy: copyToClipboard } = useCopyToClipboard(1800)

    const {
        status,
        isDownloadingPhase,
        isUploadingPhase,
        isCompleted,
        isFailed,
        isCancelled,
        isActive,
        downloadPct,
        uploadPct,
        effectiveBytesDownloaded,
        effectiveBytesUploaded,
        downloadSpeed,
        uploadSpeed,
    } = getJobPhaseProgress(job)

    const config = statusConfig[status] ?? statusConfig[JobStatus.QUEUED]

    const downloadEta = isDownloadingPhase
        ? formatEta(
              Math.max(0, job.totalBytes - effectiveBytesDownloaded),
              job.downloadSpeedBytesPerSecond
          )
        : null
    const uploadEta = isUploadingPhase
        ? formatEta(
              Math.max(0, job.totalBytes - effectiveBytesUploaded),
              job.uploadSpeedBytesPerSecond
          )
        : null

    const category = inferMediaCategory(job)
    const categoryMeta = getCategoryMeta(category)

    const displayTitle = job.requestFileName || job.fileName || `Job #${job.id}`
    const providerType =
        job.storageProviderType ||
        (job.storageProfileName?.toLowerCase().includes('s3') ? 'S3' : 'GoogleDrive')
    const isS3 = providerType?.toLowerCase() === 's3'

    const totalFiles = job.totalFilesCount ?? (job.selectedFilePaths?.length || 0)
    const selectedFiles = job.selectedFilesCount ?? (job.selectedFilePaths?.length || 0)
    const isSelective =
        Boolean(job.isSelective) ||
        (totalFiles > 0 && selectedFiles > 0 && selectedFiles < totalFiles)

    const canRetry = Boolean(job.canRetry || isFailed)
    const canForceStart = Boolean(
        (job.canForceStart ||
            status === JobStatus.QUEUED ||
            status === JobStatus.PENDING_UPLOAD) &&
            !isCancelled
    )
    const canCancel = Boolean((job.canCancel || isActive) && !isCancelled)

    const handleCopyHash = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!job.infoHash) return
        void copyToClipboard(job.infoHash).then((ok) => {
            if (ok) toast.success('InfoHash copied to clipboard')
        })
    }

    const showPipeline = isActive || isCompleted || isFailed || isCancelled

    return (
        <TooltipProvider delayDuration={200}>
            <div
                className={cn(
                    'group relative rounded-xl border border-surface-300/50 bg-surface-500/70 backdrop-blur-xs transition-[background-color,border-color] duration-150',
                    'hover:border-surface-200/70 hover:bg-surface-400/35',
                    isDownloadingPhase && 'border-sky-500/30 bg-sky-950/20',
                    isUploadingPhase && 'border-violet-500/30 bg-violet-950/20',
                    status === JobStatus.QUEUED && 'border-amber-500/20 bg-amber-950/10',
                    selected && 'ring-1 ring-primary border-primary/60 bg-primary/[0.04]',
                    className
                )}
            >
                {/* 1px Left hairline indicator */}
                <div
                    className={cn(
                        'absolute left-0 top-3 bottom-3 w-0.5 rounded-r transition-colors duration-200',
                        config.accentBar
                    )}
                />

                <div className="p-4 sm:p-4.5">
                    <div className="flex items-start gap-3 sm:gap-3.5">
                        {/* Optional Batch Selection Checkbox */}
                        {selectable && (
                            <div
                                className="pt-2 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <input
                                    type="checkbox"
                                    aria-label={`Select job ${displayTitle}`}
                                    checked={selected}
                                    onChange={(e) => onSelectChange?.(e.target.checked)}
                                    className="h-4 w-4 rounded border-surface-200 bg-surface-400 text-primary focus:ring-2 focus:ring-primary/40 cursor-pointer accent-primary"
                                />
                            </div>
                        )}

                        {/* Status Icon */}
                        <Link
                            href={`/jobs/${job.id}`}
                            className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-300/40 transition-colors duration-150',
                                config.bgColor,
                                config.color
                            )}
                            aria-label={`View job #${job.id}`}
                        >
                            {config.icon}
                        </Link>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0 space-y-2.5">
                            {/* Top Row: Title + Metadata Chips + Status/Actions */}
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/jobs/${job.id}`}
                                            className="font-semibold text-sm sm:text-base text-foreground hover:text-primary transition-colors truncate block"
                                        >
                                            {displayTitle}
                                        </Link>
                                        <span className="text-xs font-mono tabular-nums text-muted-foreground/70 shrink-0">
                                            #{job.id}
                                        </span>
                                    </div>

                                    {/* Metadata & Routing Chip Strip */}
                                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                        {/* Category & Total Size */}
                                        <span className="inline-flex items-center gap-1 rounded bg-surface-400/60 px-1.5 py-0.5 text-[11px] font-medium text-foreground/80">
                                            {categoryMeta.icon}
                                            <span>{categoryMeta.label}</span>
                                            <span className="text-surface-100">·</span>
                                            <span className="font-mono tabular-nums">
                                                {formatFileSize(job.totalBytes)}
                                            </span>
                                        </span>

                                        {/* File Count / Selective Indicator */}
                                        {(totalFiles > 0 || isSelective) && (
                                            <span
                                                className={cn(
                                                    'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-mono tabular-nums',
                                                    isSelective
                                                        ? 'bg-violet-500/10 text-violet-400 border border-violet-500/25'
                                                        : 'bg-surface-400/40 text-muted-foreground'
                                                )}
                                                title={
                                                    isSelective
                                                        ? `Selective transfer: ${selectedFiles} of ${totalFiles} files selected`
                                                        : `${totalFiles} files in torrent`
                                                }
                                            >
                                                <Layers className="h-3 w-3 shrink-0" />
                                                {isSelective && totalFiles > 0
                                                    ? `${selectedFiles} / ${totalFiles} files`
                                                    : `${totalFiles} file${totalFiles === 1 ? '' : 's'}`}
                                            </span>
                                        )}

                                        {/* Storage Provider + Profile Badge */}
                                        <span className="inline-flex items-center gap-1 rounded bg-surface-400/40 border border-surface-300/40 px-1.5 py-0.5 text-[11px] text-foreground/80">
                                            {isS3 ? (
                                                <Database className="h-3 w-3 text-amber-400 shrink-0" />
                                            ) : (
                                                <Cloud className="h-3 w-3 text-sky-400 shrink-0" />
                                            )}
                                            <span className="text-muted-foreground">
                                                {isS3 ? 'S3' : 'Drive'}:
                                            </span>
                                            <span className="font-medium truncate max-w-[140px]">
                                                {job.storageProfileName || 'Default'}
                                            </span>
                                        </span>

                                        {/* Pinned Routing Badge */}
                                        {job.allowStorageFailover === false && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="inline-flex items-center gap-0.5 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary-100">
                                                        <Pin className="h-2.5 w-2.5" />
                                                        Pinned
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Pinned to {job.storageProfileName || 'this drive'} — automatic failover disabled.
                                                </TooltipContent>
                                            </Tooltip>
                                        )}

                                        {/* Failover Rerouted Badge */}
                                        {job.wasRerouted && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="inline-flex items-center gap-0.5 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                                                        <Shuffle className="h-2.5 w-2.5" />
                                                        <span>
                                                            {job.originalStorageProfileName
                                                                ? `${job.originalStorageProfileName} → ${job.storageProfileName}`
                                                                : 'Rerouted'}
                                                        </span>
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {routeReasonShortLabel[
                                                        job.lastRouteReason as StorageRouteReason
                                                    ] || 'Rerouted to healthy storage profile'}
                                                </TooltipContent>
                                            </Tooltip>
                                        )}

                                        {/* Stalled Warning Badge */}
                                        {job.isStalled && (
                                            <span className="inline-flex items-center gap-0.5 rounded border border-orange-500/40 bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400">
                                                <AlertTriangle className="h-2.5 w-2.5" />
                                                Stalled
                                            </span>
                                        )}

                                        {/* Truncated InfoHash with 1-Click Copy */}
                                        {job.infoHash && (
                                            <button
                                                type="button"
                                                onClick={handleCopyHash}
                                                className={cn(
                                                    'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] select-none transition-all duration-150',
                                                    copiedHash
                                                        ? 'bg-emerald-500/15 text-emerald-400'
                                                        : 'bg-surface-400/40 hover:bg-surface-300/70 text-muted-foreground hover:text-foreground'
                                                )}
                                                title={`Copy InfoHash: ${job.infoHash}`}
                                            >
                                                <span>
                                                    {copiedHash
                                                        ? 'Copied'
                                                        : `${job.infoHash.slice(0, 8)}…`}
                                                </span>
                                                {copiedHash ? (
                                                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                                                ) : (
                                                    <Copy className="h-2.5 w-2.5 opacity-60" />
                                                )}
                                            </button>
                                        )}

                                        {/* Relative Timestamp */}
                                        <span className="text-muted-foreground/60 tabular-nums">
                                            {formatRelativeTime(
                                                job.createdAt ||
                                                    job.startedAt ||
                                                    new Date().toISOString()
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {/* Right Side: Status Badge + Inline Quick Actions */}
                                <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                                    <Badge
                                        variant={config.badgeVariant}
                                        className="transition-colors duration-150 text-[11px] h-6 px-2"
                                    >
                                        {config.label}
                                    </Badge>

                                    {canForceStart && onForceStart && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            disabled={isForceStarting}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                onForceStart(job.id)
                                            }}
                                            className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
                                            title="Force start job"
                                        >
                                            {isForceStarting ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <>
                                                    <Play className="mr-1 h-3 w-3" />
                                                    Force
                                                </>
                                            )}
                                        </Button>
                                    )}

                                    {canRetry && onRetry && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            disabled={isRetrying}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                onRetry(job.id)
                                            }}
                                            className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
                                        >
                                            {isRetrying ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <>
                                                    <RefreshCw className="mr-1 h-3 w-3" />
                                                    Retry
                                                </>
                                            )}
                                        </Button>
                                    )}

                                    {canCancel && onCancel && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            disabled={isCancelling}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                onCancel(job.id)
                                            }}
                                            className="h-6 px-1.5 text-xs text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                                        >
                                            {isCancelling ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                'Cancel'
                                            )}
                                        </Button>
                                    )}

                                    <Link
                                        href={`/jobs/${job.id}`}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                                        aria-label={`Open Job #${job.id} details`}
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>

                            {/* Unified Dual-Stage Progress Pipeline */}
                            {showPipeline && (
                                <div className="space-y-1 pt-0.5">
                                    <UnifiedProgressPipeline job={job} size="sm" showSummary />
                                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono tabular-nums">
                                        <span className="flex items-center gap-2">
                                            <span className={cn(isDownloadingPhase && 'text-sky-400 font-medium')}>{formatFileSize(effectiveBytesDownloaded)} DL</span>
                                            <span>·</span>
                                            <span className={cn(isUploadingPhase && 'text-violet-400 font-medium', isCompleted && 'text-emerald-400')}>{formatFileSize(effectiveBytesUploaded)} UL</span>
                                            <span>·</span>
                                            <span>Total: {formatFileSize(job.totalBytes)}</span>
                                        </span>
                                        <span className="flex items-center gap-2">
                                            {downloadSpeed && (
                                                <span className="text-sky-400 font-medium inline-flex items-center gap-0.5">
                                                    <ArrowDown className="h-3 w-3" />
                                                    {downloadSpeed}
                                                </span>
                                            )}
                                            {uploadSpeed && (
                                                <span className="text-violet-400 font-medium inline-flex items-center gap-0.5">
                                                    <ArrowUp className="h-3 w-3" />
                                                    {uploadSpeed}
                                                </span>
                                            )}
                                            {(downloadEta || uploadEta) && (
                                                <span className="text-muted-foreground/80">
                                                    ({downloadEta || uploadEta})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Inline Error Footnote */}
                            {job.errorMessage && (
                                <div className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-400">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-400" />
                                    <span className="line-clamp-2">{job.errorMessage}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    )
}

export function JobList({
    jobs,
    title = 'Recent Jobs',
    limit,
    showViewAll = true,
    emptyMessage = 'No jobs yet',
    className,
    onRetry,
    onForceStart,
    onCancel,
}: JobListProps) {
    const displayedJobs = limit ? jobs.slice(0, limit) : jobs

    return (
        <Card className={className}>
            <div className="flex items-center justify-between p-6 pb-4">
                <h2 className="text-lg font-semibold">{title}</h2>
                {showViewAll && jobs.length > 0 && (
                    <Link href="/jobs" className="text-sm text-primary hover:underline">
                        View All
                    </Link>
                )}
            </div>
            <CardContent className="pt-0">
                {displayedJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FolderOpen className="mb-3 h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">{emptyMessage}</p>
                        <Button asChild variant="outline" size="sm" className="mt-4">
                            <Link href="/torrents/upload">Upload Torrent</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayedJobs.map((job) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                onRetry={onRetry}
                                onForceStart={onForceStart}
                                onCancel={onCancel}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
