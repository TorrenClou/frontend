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
    formatTransferSpeed,
} from '@/lib/utils/formatters'
import { JobStatus, StorageRouteReason } from '@/types/enums'
import type { Job, JobCardProps, JobListProps } from '@/types/jobs'
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
        icon: <Clock className="h-5 w-5" />,
        badgeVariant: 'pending',
        label: 'Queued',
        color: 'text-warning-medium',
        bgColor: 'bg-warning/15',
        accentBar: 'bg-warning',
    },
    [JobStatus.DOWNLOADING]: {
        icon: <Download className="h-5 w-5" />,
        badgeVariant: 'processing',
        label: 'Downloading',
        color: 'text-primary-200',
        bgColor: 'bg-primary/20',
        accentBar: 'bg-primary',
    },
    [JobStatus.PENDING_UPLOAD]: {
        icon: <Clock className="h-5 w-5" />,
        badgeVariant: 'pending',
        label: 'Pending Upload',
        color: 'text-warning-medium',
        bgColor: 'bg-warning/15',
        accentBar: 'bg-warning',
    },
    [JobStatus.UPLOADING]: {
        icon: <Upload className="h-5 w-5" />,
        badgeVariant: 'info',
        label: 'Uploading',
        color: 'text-info-light',
        bgColor: 'bg-info/20',
        accentBar: 'bg-info-medium',
    },
    [JobStatus.TORRENT_DOWNLOAD_RETRY]: {
        icon: <RefreshCw className="h-5 w-5 animate-spin" />,
        badgeVariant: 'warning',
        label: 'Retrying Download',
        color: 'text-warning-medium',
        bgColor: 'bg-warning/20',
        accentBar: 'bg-warning',
    },
    [JobStatus.UPLOAD_RETRY]: {
        icon: <RefreshCw className="h-5 w-5 animate-spin" />,
        badgeVariant: 'warning',
        label: 'Retrying Upload',
        color: 'text-warning-medium',
        bgColor: 'bg-warning/20',
        accentBar: 'bg-warning',
    },
    [JobStatus.COMPLETED]: {
        icon: <CheckCircle className="h-5 w-5" />,
        badgeVariant: 'success',
        label: 'Completed',
        color: 'text-success-medium',
        bgColor: 'bg-success/15',
        accentBar: 'bg-success',
    },
    [JobStatus.FAILED]: {
        icon: <XCircle className="h-5 w-5" />,
        badgeVariant: 'destructive',
        label: 'Failed',
        color: 'text-danger-medium',
        bgColor: 'bg-danger/15',
        accentBar: 'bg-danger',
    },
    [JobStatus.TORRENT_FAILED]: {
        icon: <XCircle className="h-5 w-5" />,
        badgeVariant: 'destructive',
        label: 'Download Failed',
        color: 'text-danger-medium',
        bgColor: 'bg-danger/15',
        accentBar: 'bg-danger',
    },
    [JobStatus.UPLOAD_FAILED]: {
        icon: <XCircle className="h-5 w-5" />,
        badgeVariant: 'destructive',
        label: 'Upload Failed',
        color: 'text-danger-medium',
        bgColor: 'bg-danger/15',
        accentBar: 'bg-danger',
    },
    [JobStatus.GOOGLE_DRIVE_FAILED]: {
        icon: <AlertCircle className="h-5 w-5" />,
        badgeVariant: 'destructive',
        label: 'Drive Upload Failed',
        color: 'text-danger-medium',
        bgColor: 'bg-danger/15',
        accentBar: 'bg-danger',
    },
    [JobStatus.CANCELLED]: {
        icon: <Ban className="h-5 w-5" />,
        badgeVariant: 'secondary',
        label: 'Cancelled',
        color: 'text-surface-50',
        bgColor: 'bg-surface-300/60',
        accentBar: 'bg-surface-200',
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
            return { icon: <Film className="h-3.5 w-3.5 text-primary-200" />, label: 'Video' }
        case 'audio':
            return { icon: <Music className="h-3.5 w-3.5 text-info-light" />, label: 'Audio' }
        case 'archive':
            return { icon: <Archive className="h-3.5 w-3.5 text-warning-medium" />, label: 'Archive' }
        case 'document':
            return { icon: <FileText className="h-3.5 w-3.5 text-success-medium" />, label: 'Document' }
        case 'software':
            return { icon: <Package className="h-3.5 w-3.5 text-primary-100" />, label: 'Software' }
        default:
            return { icon: <File className="h-3.5 w-3.5 text-muted-foreground" />, label: 'Torrent' }
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
    const [copiedHash, setCopiedHash] = React.useState(false)

    const status = (job.status as JobStatus) || JobStatus.QUEUED
    const config = statusConfig[status] ?? statusConfig[JobStatus.QUEUED]

    const isDownloadingPhase = [
        JobStatus.DOWNLOADING,
        JobStatus.TORRENT_DOWNLOAD_RETRY,
    ].includes(status)

    const isUploadingPhase = [
        JobStatus.UPLOADING,
        JobStatus.UPLOAD_RETRY,
    ].includes(status)

    const isPastDownloadPhase = [
        JobStatus.PENDING_UPLOAD,
        JobStatus.UPLOADING,
        JobStatus.UPLOAD_RETRY,
        JobStatus.UPLOAD_FAILED,
        JobStatus.GOOGLE_DRIVE_FAILED,
        JobStatus.COMPLETED,
    ].includes(status)

    const isCompleted = status === JobStatus.COMPLETED
    const isFailed = [
        JobStatus.FAILED,
        JobStatus.TORRENT_FAILED,
        JobStatus.UPLOAD_FAILED,
        JobStatus.GOOGLE_DRIVE_FAILED,
    ].includes(status)
    const isDownloadFailed = status === JobStatus.TORRENT_FAILED
    const isUploadFailed = [
        JobStatus.UPLOAD_FAILED,
        JobStatus.GOOGLE_DRIVE_FAILED,
    ].includes(status)

    const isActive =
        job.isActive ??
        [
            JobStatus.QUEUED,
            JobStatus.DOWNLOADING,
            JobStatus.PENDING_UPLOAD,
            JobStatus.UPLOADING,
            JobStatus.TORRENT_DOWNLOAD_RETRY,
            JobStatus.UPLOAD_RETRY,
        ].includes(status)

    // Raw progress fallback for legacy callers
    const rawDownloadPct = Number(job.progressPercentage ?? job.progress ?? 0)
    const safeDownloadPct = Number.isFinite(rawDownloadPct)
        ? Math.min(100, Math.max(0, rawDownloadPct))
        : 0
    const rawUploadPct = Number(job.uploadProgressPercentage ?? 0)
    const safeUploadPct = Number.isFinite(rawUploadPct)
        ? Math.min(100, Math.max(0, rawUploadPct))
        : 0

    const downloadPct = isCompleted || isPastDownloadPhase ? 100 : safeDownloadPct
    const uploadPct = isCompleted ? 100 : safeUploadPct

    const effectiveBytesDownloaded =
        isCompleted || isPastDownloadPhase
            ? job.totalBytes
            : Math.min(job.totalBytes || job.bytesDownloaded, job.bytesDownloaded)
    const effectiveBytesUploaded = isCompleted
        ? job.totalBytes
        : Math.min(job.totalBytes || (job.bytesUploaded ?? 0), job.bytesUploaded ?? 0)

    const downloadSpeed = isDownloadingPhase
        ? formatTransferSpeed(job.downloadSpeedBytesPerSecond)
        : null
    const uploadSpeed = isUploadingPhase
        ? formatTransferSpeed(job.uploadSpeedBytesPerSecond)
        : null

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
        job.canForceStart ||
            status === JobStatus.QUEUED ||
            status === JobStatus.PENDING_UPLOAD
    )
    const canCancel = Boolean(job.canCancel || isActive)

    const handleCopyHash = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!job.infoHash) return
        navigator.clipboard.writeText(job.infoHash)
        setCopiedHash(true)
        toast.success('InfoHash copied to clipboard')
        setTimeout(() => setCopiedHash(false), 1800)
    }

    const showPipeline = isActive || isCompleted || isFailed

    return (
        <TooltipProvider delayDuration={200}>
            <div
                className={cn(
                    'group relative rounded-xl border border-surface-300/60 bg-surface-500/80 transition-colors duration-150',
                    'hover:border-surface-200/80 hover:bg-surface-400/40',
                    isActive && 'border-primary/35 bg-surface-tonal-500/60',
                    selected && 'ring-2 ring-primary border-primary/60 bg-primary/10',
                    className
                )}
            >
                {/* Crisp 1px left status hairline */}
                <div
                    className={cn(
                        'absolute left-0 top-3 bottom-3 w-px transition-colors duration-200',
                        config.accentBar
                    )}
                />

                <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                        {/* Optional Batch Selection Checkbox */}
                        {selectable && (
                            <div
                                className="pt-2.5 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <input
                                    type="checkbox"
                                    aria-label={`Select job ${displayTitle}`}
                                    checked={selected}
                                    onChange={(e) => onSelectChange?.(e.target.checked)}
                                    className="h-4 w-4 rounded border-surface-200 bg-surface-400 text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer accent-primary"
                                />
                            </div>
                        )}

                        {/* Status Icon */}
                        <Link
                            href={`/jobs/${job.id}`}
                            className={cn(
                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-150',
                                config.bgColor,
                                config.color
                            )}
                            aria-label={`View job #${job.id}`}
                        >
                            {config.icon}
                        </Link>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0 space-y-3">
                            {/* Top Row: Title + Metadata Chips + Status/Actions */}
                            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/jobs/${job.id}`}
                                            className="font-semibold text-base text-foreground hover:text-primary transition-colors truncate block"
                                        >
                                            {displayTitle}
                                        </Link>
                                        <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
                                            #{job.id}
                                        </span>
                                    </div>

                                    {/* Metadata & Routing Chip Strip */}
                                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                        {/* Category & Total Size */}
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-400/80 px-2 py-0.5 font-medium text-foreground/90">
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
                                                    'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono tabular-nums',
                                                    isSelective
                                                        ? 'bg-info/15 text-info-light border border-info/30'
                                                        : 'bg-surface-400/60 text-muted-foreground'
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
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-tonal-400/90 border border-surface-300/60 px-2 py-0.5 text-foreground/90">
                                            {isS3 ? (
                                                <Database className="h-3 w-3 text-warning-medium shrink-0" />
                                            ) : (
                                                <Cloud className="h-3 w-3 text-primary-200 shrink-0" />
                                            )}
                                            <span className="text-[11px] font-medium text-muted-foreground">
                                                {isS3 ? 'S3' : 'Drive'}:
                                            </span>
                                            <span className="font-medium truncate max-w-[160px]">
                                                {job.storageProfileName || 'Default Drive'}
                                            </span>
                                        </span>

                                        {/* Pinned Routing Badge */}
                                        {job.allowStorageFailover === false && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary-100">
                                                        <Pin className="h-3 w-3" />
                                                        Pinned
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Pinned to {job.storageProfileName || 'this drive'} — automatic failover is disabled.
                                                </TooltipContent>
                                            </Tooltip>
                                        )}

                                        {/* Failover Rerouted Badge */}
                                        {job.wasRerouted && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="inline-flex items-center gap-1 rounded-md border border-warning/40 bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-light">
                                                        <Shuffle className="h-3 w-3" />
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
                                            <span className="inline-flex items-center gap-1 rounded-md border border-warning/50 bg-warning/20 px-2 py-0.5 text-[11px] font-semibold text-warning-light">
                                                <AlertTriangle className="h-3 w-3" />
                                                Stalled
                                            </span>
                                        )}

                                        {/* Truncated InfoHash with 1-Click Copy */}
                                        {job.infoHash && (
                                            <button
                                                type="button"
                                                onClick={handleCopyHash}
                                                className={cn(
                                                    'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] select-none transition-[background-color,color,transform] duration-150 ease-out-quart active:scale-[0.97]',
                                                    copiedHash
                                                        ? 'bg-success/15 text-success-medium'
                                                        : 'bg-surface-400/60 hover:bg-surface-300/80 text-muted-foreground hover:text-foreground'
                                                )}
                                                title={`Copy InfoHash: ${job.infoHash}`}
                                            >
                                                <span>
                                                    {copiedHash
                                                        ? 'Copied'
                                                        : `${job.infoHash.slice(0, 8)}…`}
                                                </span>
                                                {copiedHash ? (
                                                    <Check className="h-3 w-3 text-success-medium" />
                                                ) : (
                                                    <Copy className="h-3 w-3 opacity-70" />
                                                )}
                                            </button>
                                        )}

                                        {/* Relative Timestamp */}
                                        <span className="text-muted-foreground/80 tabular-nums">
                                            {formatRelativeTime(
                                                job.createdAt ||
                                                    job.startedAt ||
                                                    new Date().toISOString()
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {/* Right Side: Status Badge + Inline Quick Actions */}
                                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                                    <Badge
                                        variant={config.badgeVariant}
                                        className="transition-colors duration-200"
                                    >
                                        {config.label}
                                    </Badge>

                                    {canForceStart && onForceStart && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={isForceStarting}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                onForceStart(job.id)
                                            }}
                                            className="h-7 px-2.5 text-xs border-primary/40 text-primary-100 hover:bg-primary/20"
                                            title="Re-dispatch job immediately to a worker"
                                        >
                                            {isForceStarting ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Play className="mr-1 h-3 w-3" />
                                                    Force Start
                                                </>
                                            )}
                                        </Button>
                                    )}

                                    {canRetry && onRetry && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={isRetrying}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                onRetry(job.id)
                                            }}
                                            className="h-7 px-2.5 text-xs border-primary/40 text-primary-100 hover:bg-primary/20"
                                        >
                                            {isRetrying ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
                                            className="h-7 px-2 text-xs text-muted-foreground hover:text-danger-light hover:bg-danger/15"
                                        >
                                            {isCancelling ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                'Cancel'
                                            )}
                                        </Button>
                                    )}

                                    <Link
                                        href={`/jobs/${job.id}`}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-surface-300/50 transition-colors active:scale-[0.97]"
                                        aria-label={`Open Job #${job.id} details`}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>

                            {/* Dual-Stage Progress Pipeline */}
                            {showPipeline && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                                    {/* Download Phase: BitTorrent Download */}
                                    <div
                                        className={cn(
                                            'rounded-lg border px-3 py-2 transition-colors duration-200',
                                            isDownloadingPhase
                                                ? 'border-primary/40 bg-primary/10'
                                                : isDownloadFailed
                                                  ? 'border-danger/40 bg-danger/10'
                                                  : 'border-surface-300/60 bg-surface-400/40'
                                        )}
                                    >
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="inline-flex items-center gap-1.5 font-medium text-foreground/90">
                                                <Download className="h-3.5 w-3.5 text-primary-200" />
                                                <span>Download Phase · BitTorrent</span>
                                            </span>
                                            <div className="flex items-center gap-2 font-mono tabular-nums">
                                                {downloadSpeed && (
                                                    <span className="inline-flex items-center gap-0.5 text-primary-100 font-semibold">
                                                        <ArrowDown className="h-3 w-3" />
                                                        {downloadSpeed}
                                                    </span>
                                                )}
                                                <span
                                                    className={cn(
                                                        'font-semibold',
                                                        downloadPct >= 100
                                                            ? 'text-success-medium'
                                                            : isDownloadFailed
                                                              ? 'text-danger-medium'
                                                              : 'text-primary-100'
                                                    )}
                                                >
                                                    {downloadPct.toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="h-1.5 w-full rounded-full bg-surface-300/80 overflow-hidden">
                                            <div
                                                className={cn(
                                                    'h-full w-full rounded-full transition-[transform,background-color] duration-500 ease-out-quint',
                                                    downloadPct >= 100
                                                        ? 'bg-success'
                                                        : isDownloadFailed
                                                          ? 'bg-danger'
                                                          : 'bg-primary'
                                                )}
                                                style={{ transform: `translateX(-${100 - downloadPct}%)` }}
                                            />
                                        </div>

                                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground font-mono tabular-nums">
                                            <span>
                                                {formatFileSize(effectiveBytesDownloaded)} /{' '}
                                                {formatFileSize(job.totalBytes)}
                                            </span>
                                            <span>
                                                {downloadEta
                                                    ? downloadEta
                                                    : downloadPct >= 100
                                                      ? 'Staged'
                                                      : isDownloadFailed
                                                        ? 'Failed'
                                                        : status === JobStatus.QUEUED
                                                          ? 'Queued'
                                                          : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Upload Phase: Cloud Upload */}
                                    <div
                                        className={cn(
                                            'rounded-lg border px-3 py-2 transition-colors duration-200',
                                            isUploadingPhase
                                                ? 'border-info/50 bg-info/10'
                                                : isUploadFailed
                                                  ? 'border-danger/40 bg-danger/10'
                                                  : isCompleted
                                                    ? 'border-success/30 bg-success/5'
                                                    : 'border-surface-300/60 bg-surface-400/40'
                                        )}
                                    >
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="inline-flex items-center gap-1.5 font-medium text-foreground/90 truncate">
                                                <Upload className="h-3.5 w-3.5 text-info-light shrink-0" />
                                                <span className="truncate">
                                                    Upload Phase · {job.storageProfileName || 'Cloud Upload'}
                                                </span>
                                            </span>
                                            <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                                                {uploadSpeed && (
                                                    <span className="inline-flex items-center gap-0.5 text-info-light font-semibold">
                                                        <ArrowUp className="h-3 w-3" />
                                                        {uploadSpeed}
                                                    </span>
                                                )}
                                                <span
                                                    className={cn(
                                                        'font-semibold',
                                                        uploadPct >= 100
                                                            ? 'text-success-medium'
                                                            : isUploadFailed
                                                              ? 'text-danger-medium'
                                                              : isUploadingPhase
                                                                ? 'text-info-light'
                                                                : 'text-muted-foreground'
                                                    )}
                                                >
                                                    {uploadPct.toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="h-1.5 w-full rounded-full bg-surface-300/80 overflow-hidden">
                                            <div
                                                className={cn(
                                                    'h-full w-full rounded-full transition-[transform,background-color] duration-500 ease-out-quint',
                                                    uploadPct >= 100
                                                        ? 'bg-success'
                                                        : isUploadFailed
                                                          ? 'bg-danger'
                                                          : 'bg-info-medium'
                                                )}
                                                style={{ transform: `translateX(-${100 - uploadPct}%)` }}
                                            />
                                        </div>

                                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground font-mono tabular-nums">
                                            <span>
                                                {formatFileSize(effectiveBytesUploaded)} /{' '}
                                                {formatFileSize(job.totalBytes)}
                                            </span>
                                            <span>
                                                {uploadEta
                                                    ? uploadEta
                                                    : uploadPct >= 100
                                                      ? 'Delivered'
                                                      : isUploadFailed
                                                        ? 'Failed'
                                                        : status === JobStatus.PENDING_UPLOAD
                                                          ? 'Awaiting worker'
                                                          : 'Waiting for Download Phase'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Inline Error / Current State Footnote */}
                            {job.errorMessage ? (
                                <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger-light">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-danger-medium" />
                                    <span className="line-clamp-2">{job.errorMessage}</span>
                                </div>
                            ) : (
                                job.currentState &&
                                isActive && (
                                    <p className="text-xs text-muted-foreground truncate">
                                        {job.currentState}
                                    </p>
                                )
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
