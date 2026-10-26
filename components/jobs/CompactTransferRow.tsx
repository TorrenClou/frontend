'use client'

import * as React from 'react'
import Link from 'next/link'
import { JobStatus } from '@/types/enums'
import type { Job } from '@/types/jobs'
import { getJobPhaseProgress } from '@/lib/utils/job-progress'
import { formatFileSize, formatRelativeTime } from '@/lib/utils/formatters'
import { UnifiedProgressPipeline } from './UnifiedProgressPipeline'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    ArrowDown,
    ArrowUp,
    ChevronRight,
    Play,
    RefreshCw,
    X,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock,
    Cloud,
    Database,
    Ban,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
    }
    if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        return `${hours}h ${mins}m`
    }
    return '>24h'
}

interface CompactTransferRowProps {
    job: Job
    onRetry?: (jobId: number) => void
    onForceStart?: (jobId: number) => void
    onCancel?: (jobId: number) => void
    isRetrying?: boolean
    isForceStarting?: boolean
    isCancelling?: boolean
    className?: string
}

export function CompactTransferRow({
    job,
    onRetry,
    onForceStart,
    onCancel,
    isRetrying = false,
    isForceStarting = false,
    isCancelling = false,
    className,
}: CompactTransferRowProps) {
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

    const displayTitle = job.requestFileName || job.fileName || `Job #${job.id}`
    const providerType =
        job.storageProviderType ||
        (job.storageProfileName?.toLowerCase().includes('s3') ? 'S3' : 'GoogleDrive')
    const isS3 = providerType?.toLowerCase() === 's3'

    const eta = isDownloadingPhase
        ? formatEta(
              Math.max(0, job.totalBytes - effectiveBytesDownloaded),
              job.downloadSpeedBytesPerSecond
          )
        : isUploadingPhase
          ? formatEta(
                Math.max(0, job.totalBytes - effectiveBytesUploaded),
                job.uploadSpeedBytesPerSecond
            )
          : null

    const canRetry = Boolean(job.canRetry || isFailed)
    const canForceStart = Boolean(
        (job.canForceStart ||
            status === JobStatus.QUEUED ||
            status === JobStatus.PENDING_UPLOAD) &&
            !isCancelled
    )
    const canCancel = Boolean((job.canCancel || isActive) && !isCancelled)

    // Status dot color & pulse
    const getStatusIndicator = () => {
        if (isCompleted) {
            return <CheckCircle2 className="h-4 w-4 text-success-medium shrink-0" />
        }
        if (isFailed) {
            return <AlertCircle className="h-4 w-4 text-danger-medium shrink-0" />
        }
        if (isCancelled) {
            return <Ban className="h-4 w-4 text-muted-foreground/80 shrink-0" />
        }
        if (isDownloadingPhase) {
            return (
                <span className="relative flex h-2.5 w-2.5 shrink-0 mx-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-100 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
            )
        }
        if (isUploadingPhase) {
            return (
                <span className="relative flex h-2.5 w-2.5 shrink-0 mx-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info-light opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-info-medium" />
                </span>
            )
        }
        return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
    }

    return (
        <TooltipProvider delayDuration={250}>
            <div
                className={cn(
                    'group relative rounded-lg border border-surface-300/40 bg-surface-500/70 p-3 sm:px-4 sm:py-3 transition-[background-color,border-color] duration-150 ease-out-quart hover:border-surface-200/60 hover:bg-surface-400/35',
                    isActive && 'border-primary/30 bg-surface-tonal-500/40',
                    className
                )}
            >
                <div className="flex flex-col gap-2">
                    {/* Top Row: Status Dot + Title + Inline Meta + Live Speed & Actions */}
                    <div className="flex items-center justify-between gap-3 min-w-0">
                        {/* Title & Metadata Strip */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {getStatusIndicator()}

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={`/jobs/${job.id}`}
                                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block"
                                    >
                                        {displayTitle}
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p className="font-semibold">{displayTitle}</p>
                                    <p className="text-xs text-muted-foreground font-mono">Job #{job.id}</p>
                                </TooltipContent>
                            </Tooltip>

                            {/* Storage Badge */}
                            <span className="hidden sm:inline-flex items-center gap-1 rounded bg-surface-400/50 px-1.5 py-0.5 text-[11px] text-muted-foreground shrink-0">
                                {isS3 ? (
                                    <Database className="h-3 w-3 text-warning-medium" />
                                ) : (
                                    <Cloud className="h-3 w-3 text-primary-200" />
                                )}
                                <span className="truncate max-w-[120px]">
                                    {job.storageProfileName || (isS3 ? 'S3' : 'Drive')}
                                </span>
                            </span>

                            {/* Size */}
                            <span className="text-xs font-mono text-muted-foreground/80 shrink-0 tabular-nums">
                                {formatFileSize(job.totalBytes)}
                            </span>
                        </div>

                        {/* Right Telemetry & Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Live Speed / Status / ETA Readout */}
                            {downloadSpeed && (
                                <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-primary-100 font-medium">
                                    <ArrowDown className="h-3 w-3 text-primary" />
                                    {downloadSpeed}
                                </span>
                            )}
                            {uploadSpeed && (
                                <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-info-light font-medium">
                                    <ArrowUp className="h-3 w-3 text-info-medium" />
                                    {uploadSpeed}
                                </span>
                            )}
                            {isCompleted && (
                                <span className="text-success-medium text-xs font-mono">Ready</span>
                            )}
                            {isFailed && (
                                <span className="text-danger-light text-xs font-mono">Failed</span>
                            )}
                            {isCancelled && (
                                <span className="text-muted-foreground/80 text-xs font-mono">Cancelled</span>
                            )}
                            {eta && (
                                <span className="hidden md:inline-block text-xs font-mono text-muted-foreground/80 tabular-nums">
                                    · {eta}
                                </span>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1">
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
                                        className="h-6 px-1.5 text-xs text-primary hover:bg-primary/10"
                                        title="Force start job"
                                    >
                                        {isForceStarting ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Play className="h-3 w-3" />
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
                                        className="h-6 px-1.5 text-xs text-primary hover:bg-primary/10"
                                        title="Retry job"
                                    >
                                        {isRetrying ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-3 w-3" />
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
                                        className="h-6 px-1.5 text-xs text-muted-foreground hover:text-danger hover:bg-danger/10"
                                        title="Cancel job"
                                    >
                                        {isCancelling ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <X className="h-3 w-3" />
                                        )}
                                    </Button>
                                )}

                                <Link
                                    href={`/jobs/${job.id}`}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label={`Open Job #${job.id}`}
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Progress Pipeline & Phase Footnote */}
                    {(isActive || isCompleted || isFailed || isCancelled) && (
                        <div className="space-y-1">
                            <UnifiedProgressPipeline job={job} size="sm" />
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono tabular-nums">
                                <span className="truncate">
                                    {isCancelled && 'Transfer cancelled'}
                                    {isDownloadingPhase && `BitTorrent DL: ${downloadPct.toFixed(0)}%`}
                                    {isUploadingPhase && `Cloud UL: ${uploadPct.toFixed(0)}%`}
                                    {isCompleted && 'Completed · Ready in Cloud'}
                                    {isFailed && (job.errorMessage || 'Transfer halted')}
                                    {status === JobStatus.QUEUED && 'Queued in transfer queue'}
                                    {status === JobStatus.PENDING_UPLOAD && 'Awaiting upload worker'}
                                </span>
                                <span className="text-muted-foreground/60 shrink-0">
                                    {formatRelativeTime(job.createdAt || new Date().toISOString())}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    )
}
