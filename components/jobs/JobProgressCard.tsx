'use client'

import * as React from 'react'
import { formatFileSize } from '@/lib/utils/formatters'
import { getJobPhaseProgress } from '@/lib/utils/job-progress'
import type { Job } from '@/types/jobs'
import { JobStatus } from '@/types/enums'
import { Download, Upload, Gauge } from 'lucide-react'
import { UnifiedProgressPipeline } from './UnifiedProgressPipeline'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface JobProgressCardProps {
    job: Job
    className?: string
}

export function JobProgressCard({ job, className }: JobProgressCardProps) {
    const {
        status,
        isDownloadingPhase,
        isUploadingPhase,
        isPastDownloadPhase,
        isCompleted,
        isCancelled,
        isDownloadFailed,
        isUploadFailed,
        downloadPct,
        uploadPct,
        effectiveBytesDownloaded,
        effectiveBytesUploaded,
        downloadSpeed,
        uploadSpeed,
    } = getJobPhaseProgress(job)

    const isS3 = job.storageProviderType?.toLowerCase() === 's3' || job.storageProfileName?.toLowerCase().includes('s3')

    const downloadState = isCancelled
        ? { label: 'Cancelled', color: 'text-zinc-400', bg: 'bg-zinc-500/10' }
        : isCompleted || isPastDownloadPhase
          ? { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
          : isDownloadFailed
            ? { label: 'Download Failed', color: 'text-rose-400', bg: 'bg-rose-500/10' }
            : isDownloadingPhase
              ? { label: 'In Progress', color: 'text-sky-400', bg: 'bg-sky-500/10' }
              : { label: 'Queued', color: 'text-amber-400', bg: 'bg-amber-500/10' }

    const uploadState = isCancelled
        ? { label: 'Cancelled', color: 'text-zinc-400', bg: 'bg-zinc-500/10' }
        : isCompleted
          ? { label: 'Delivered', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
          : isUploadFailed
            ? { label: 'Upload Failed', color: 'text-rose-400', bg: 'bg-rose-500/10' }
            : isUploadingPhase
              ? { label: 'Uploading', color: 'text-violet-400', bg: 'bg-violet-500/10' }
              : status === JobStatus.PENDING_UPLOAD
                ? { label: 'Awaiting Worker', color: 'text-amber-300', bg: 'bg-amber-500/10' }
                : { label: 'Waiting for Download', color: 'text-muted-foreground', bg: 'bg-surface-400/50' }

    return (
        <Card className={cn('rounded-xl border border-surface-300/50 bg-surface-500/70 backdrop-blur-xs overflow-hidden', className)}>
            <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Header Row */}
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-semibold tracking-tight text-foreground">
                            Two-Stage Transfer Pipeline
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            BitTorrent peer-to-peer download staged and uploaded to cloud destination
                        </p>
                    </div>
                    <div className="text-right">
                        <span className={cn(
                            'font-mono text-sm font-bold tabular-nums',
                            isCompleted && 'text-emerald-400',
                            isDownloadingPhase && 'text-sky-400',
                            isUploadingPhase && 'text-violet-400'
                        )}>
                            {isCompleted ? '100%' : `${Math.round((downloadPct + uploadPct) / 2)}%`}
                        </span>
                        <p className="text-[11px] text-muted-foreground">Overall</p>
                    </div>
                </div>

                {/* Unified Segmented Pipeline Bar */}
                <div className="space-y-1.5">
                    <UnifiedProgressPipeline job={job} size="md" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono tabular-nums">
                        <span className={cn(isDownloadingPhase && 'text-sky-400 font-semibold')}>
                            Stage 1: BitTorrent ({downloadPct.toFixed(0)}%)
                        </span>
                        <span className={cn(isUploadingPhase && 'text-violet-400 font-semibold', isCompleted && 'text-emerald-400')}>
                            Stage 2: Cloud Storage ({uploadPct.toFixed(0)}%)
                        </span>
                    </div>
                </div>

                {/* Two Balanced Stage Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Stage 1: Download Card */}
                    <div className={cn(
                        'rounded-lg border border-surface-300/40 bg-surface-400/30 p-3.5 space-y-2.5 transition-colors',
                        isDownloadingPhase && 'border-sky-500/30 bg-sky-950/15'
                    )}>
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                <Download className="h-3.5 w-3.5 text-sky-400" />
                                <span>BitTorrent Download</span>
                            </span>
                            <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', downloadState.bg, downloadState.color)}>
                                {downloadState.label}
                            </span>
                        </div>

                        <div className="flex items-baseline justify-between font-mono tabular-nums">
                            <span className={cn(
                                'text-xl font-bold text-foreground',
                                isDownloadingPhase && 'text-sky-400',
                                (isCompleted || isPastDownloadPhase) && 'text-emerald-400'
                            )}>
                                {downloadPct.toFixed(1)}%
                            </span>
                            {downloadSpeed && (
                                <span className="inline-flex items-center gap-1 text-xs text-sky-400 font-semibold">
                                    <Gauge className="h-3 w-3" />
                                    {downloadSpeed}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono tabular-nums border-t border-surface-300/20 pt-2">
                            <span>Staged:</span>
                            <span className="text-foreground/90 font-medium">
                                {formatFileSize(effectiveBytesDownloaded)} / {formatFileSize(job.totalBytes)}
                            </span>
                        </div>
                    </div>

                    {/* Stage 2: Cloud Upload Card */}
                    <div className={cn(
                        'rounded-lg border border-surface-300/40 bg-surface-400/30 p-3.5 space-y-2.5 transition-colors',
                        isUploadingPhase && 'border-violet-500/30 bg-violet-950/15'
                    )}>
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground truncate mr-2">
                                <Upload className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                                <span className="truncate">
                                    Cloud Upload ({job.storageProfileName || (isS3 ? 'S3' : 'Drive')})
                                </span>
                            </span>
                            <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0', uploadState.bg, uploadState.color)}>
                                {uploadState.label}
                            </span>
                        </div>

                        <div className="flex items-baseline justify-between font-mono tabular-nums">
                            <span className={cn(
                                'text-xl font-bold text-foreground',
                                isUploadingPhase && 'text-violet-400',
                                isCompleted && 'text-emerald-400'
                            )}>
                                {uploadPct.toFixed(1)}%
                            </span>
                            {uploadSpeed && (
                                <span className="inline-flex items-center gap-1 text-xs text-violet-400 font-semibold">
                                    <Gauge className="h-3 w-3" />
                                    {uploadSpeed}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono tabular-nums border-t border-surface-300/20 pt-2">
                            <span>Delivered:</span>
                            <span className="text-foreground/90 font-medium">
                                {formatFileSize(effectiveBytesUploaded)} / {formatFileSize(job.totalBytes)}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
