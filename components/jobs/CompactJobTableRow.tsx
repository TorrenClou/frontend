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
    Pin,
    Shuffle,
    AlertTriangle,
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

export interface CompactJobTableRowProps {
    job: Job
    selectable?: boolean
    selected?: boolean
    onSelectChange?: (selected: boolean) => void
    onRetry?: (jobId: number) => void
    onForceStart?: (jobId: number) => void
    onCancel?: (jobId: number) => void
    isRetrying?: boolean
    isForceStarting?: boolean
    isCancelling?: boolean
    className?: string
}

export function CompactJobTableRow({
    job,
    selectable = false,
    selected = false,
    onSelectChange,
    onRetry,
    onForceStart,
    onCancel,
    isRetrying = false,
    isForceStarting = false,
    isCancelling = false,
    className,
}: CompactJobTableRowProps) {
    const {
        status,
        isDownloadingPhase,
        isUploadingPhase,
        isCompleted,
        isFailed,
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
        job.canForceStart ||
            status === JobStatus.QUEUED ||
            status === JobStatus.PENDING_UPLOAD
    )
    const canCancel = Boolean(job.canCancel || isActive)

    const getStatusDot = () => {
        if (isCompleted) {
            return <CheckCircle2 className="h-4 w-4 text-success-medium shrink-0" />
        }
        if (isFailed) {
            return <AlertCircle className="h-4 w-4 text-danger-medium shrink-0" />
        }
        if (isDownloadingPhase) {
            return (
                <span className="relative flex h-2.5 w-2.5 shrink-0 mx-0.5" title="Downloading from peers">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-100 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
            )
        }
        if (isUploadingPhase) {
            return (
                <span className="relative flex h-2.5 w-2.5 shrink-0 mx-0.5" title="Uploading to cloud storage">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info-light opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-info-medium" />
                </span>
            )
        }
        return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
    }

    return (
        <TooltipProvider delayDuration={200}>
            <div
                className={cn(
                    'group flex items-center justify-between gap-3 rounded-lg border border-surface-300/40 bg-surface-500/60 px-3 py-2.5 transition-[background-color,border-color] duration-150',
                    'hover:border-surface-200/60 hover:bg-surface-400/35',
                    isActive && 'border-primary/30 bg-surface-tonal-500/30',
                    selected && 'ring-1 ring-primary border-primary/50 bg-primary/[0.04]',
                    className
                )}
            >
                {/* Left: Checkbox + Status Dot + Filename + Badges */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {selectable && (
                        <div
                            className="shrink-0 flex items-center"
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

                    {getStatusDot()}

                    <div className="min-w-0 flex-1 flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link
                                    href={`/jobs/${job.id}`}
                                    className="text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block max-w-[280px] lg:max-w-[420px]"
                                >
                                    {displayTitle}
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <p className="font-semibold">{displayTitle}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                    Job #{job.id} · {formatFileSize(job.totalBytes)}
                                </p>
                            </TooltipContent>
                        </Tooltip>

                        {/* Trait indicators */}
                        {job.allowStorageFailover === false && (
                            <span title="Pinned to profile"><Pin className="h-3 w-3 text-primary-100 shrink-0" /></span>
                        )}
                        {job.wasRerouted && (
                            <span title="Failover rerouted"><Shuffle className="h-3 w-3 text-warning-light shrink-0" /></span>
                        )}
                        {job.isStalled && (
                            <span title="Transfer stalled"><AlertTriangle className="h-3 w-3 text-warning-medium shrink-0" /></span>
                        )}
                    </div>

                    {/* Storage Profile Pill */}
                    <span className="hidden md:inline-flex items-center gap-1 rounded bg-surface-400/40 px-1.5 py-0.5 text-[10px] text-muted-foreground shrink-0">
                        {isS3 ? (
                            <Database className="h-2.5 w-2.5 text-warning-medium" />
                        ) : (
                            <Cloud className="h-2.5 w-2.5 text-primary-200" />
                        )}
                        <span className="truncate max-w-[100px]">
                            {job.storageProfileName || (isS3 ? 'S3' : 'Drive')}
                        </span>
                    </span>

                    {/* Size */}
                    <span className="hidden sm:inline-block text-xs font-mono text-muted-foreground shrink-0 tabular-nums">
                        {formatFileSize(job.totalBytes)}
                    </span>
                </div>

                {/* Center: Slim Pipeline Progress */}
                <div className="hidden lg:flex w-44 shrink-0 flex-col gap-1">
                    <UnifiedProgressPipeline job={job} size="sm" />
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground/80 tabular-nums">
                        <span>DL {downloadPct.toFixed(0)}%</span>
                        <span>UL {uploadPct.toFixed(0)}%</span>
                    </div>
                </div>

                {/* Right: Live Telemetry + Inline Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Live Speed / ETA Readout */}
                    <div className="text-right font-mono text-xs tabular-nums min-w-[70px] sm:min-w-[90px]">
                        {downloadSpeed ? (
                            <span className="inline-flex items-center gap-0.5 text-primary-100 font-medium">
                                <ArrowDown className="h-3 w-3" />
                                {downloadSpeed}
                            </span>
                        ) : uploadSpeed ? (
                            <span className="inline-flex items-center gap-0.5 text-info-light font-medium">
                                <ArrowUp className="h-3 w-3" />
                                {uploadSpeed}
                            </span>
                        ) : isCompleted ? (
                            <span className="text-success-medium text-[11px]">Ready</span>
                        ) : isFailed ? (
                            <span className="text-danger-light text-[11px]">Failed</span>
                        ) : (
                            <span className="text-muted-foreground/60 text-[11px]">
                                {status === JobStatus.QUEUED ? 'Queued' : 'Waiting'}
                            </span>
                        )}
                        {eta && (
                            <div className="text-[10px] text-muted-foreground/70 hidden sm:block">
                                {eta}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5">
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
                                className="h-6 w-6 p-0 text-primary hover:bg-primary/10"
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
                                className="h-6 w-6 p-0 text-primary hover:bg-primary/10"
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
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-danger hover:bg-danger/10"
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
        </TooltipProvider>
    )
}

