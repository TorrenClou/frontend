'use client'

import * as React from 'react'
import { formatFileSize } from '@/lib/utils/formatters'
import { getJobPhaseProgress } from '@/lib/utils/job-progress'
import type { Job } from '@/types/jobs'
import { JobStatus } from '@/types/enums'
import { Download, Upload, Gauge, CheckCircle2, AlertCircle, Clock, Cloud, Database } from 'lucide-react'
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
        isFailed,
        isDownloadFailed,
        isUploadFailed,
        isActive,
        downloadPct,
        uploadPct,
        effectiveBytesDownloaded,
        effectiveBytesUploaded,
        downloadSpeed,
        uploadSpeed,
    } = getJobPhaseProgress(job)

    const isS3 = job.storageProviderType?.toLowerCase() === 's3' || job.storageProfileName?.toLowerCase().includes('s3')

    const downloadState = isCompleted || isPastDownloadPhase
        ? { label: 'Completed', color: 'text-success-medium', bg: 'bg-success/10' }
        : isDownloadFailed
          ? { label: 'Download Failed', color: 'text-danger-light', bg: 'bg-danger/10' }
          : isDownloadingPhase
            ? { label: 'In Progress', color: 'text-primary-100', bg: 'bg-primary/10' }
            : { label: 'Queued', color: 'text-muted-foreground', bg: 'bg-surface-400/50' }

    const uploadState = isCompleted
        ? { label: 'Delivered', color: 'text-success-medium', bg: 'bg-success/10' }
        : isUploadFailed
          ? { label: 'Upload Failed', color: 'text-danger-light', bg: 'bg-danger/10' }
          : isUploadingPhase
            ? { label: 'Uploading', color: 'text-info-light', bg: 'bg-info/10' }
            : status === JobStatus.PENDING_UPLOAD
              ? { label: 'Awaiting Worker', color: 'text-warning-medium', bg: 'bg-warning/10' }
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
                        <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                            {isCompleted ? '100%' : `${Math.round((downloadPct + uploadPct) / 2)}%`}
                        </span>
                        <p className="text-[11px] text-muted-foreground">Overall</p>
                    </div>
                </div>

                {/* Unified Segmented Pipeline Bar */}
                <div className="space-y-1.5">
                    <UnifiedProgressPipeline job={job} size="md" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono tabular-nums">
                        <span>Stage 1: BitTorrent ({downloadPct.toFixed(0)}%)</span>
                        <span>Stage 2: Cloud Storage ({uploadPct.toFixed(0)}%)</span>
                    </div>
                </div>

                {/* Two Balanced Stage Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Stage 1: Download Card */}
                    <div className="rounded-lg border border-surface-300/40 bg-surface-400/30 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                <Download className="h-3.5 w-3.5 text-primary-100" />
                                <span>BitTorrent Download</span>
                            </span>
                            <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', downloadState.bg, downloadState.color)}>
                                {downloadState.label}
                            </span>
                        </div>

                        <div className="flex items-baseline justify-between font-mono tabular-nums">
                            <span className="text-xl font-bold text-foreground">
                                {downloadPct.toFixed(1)}%
                            </span>
                            {downloadSpeed && (
                                <span className="inline-flex items-center gap-1 text-xs text-primary-100 font-semibold">
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
                    <div className="rounded-lg border border-surface-300/40 bg-surface-400/30 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground truncate mr-2">
                                <Upload className="h-3.5 w-3.5 text-info-light shrink-0" />
                                <span className="truncate">
                                    Cloud Upload ({job.storageProfileName || (isS3 ? 'S3' : 'Drive')})
                                </span>
                            </span>
                            <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0', uploadState.bg, uploadState.color)}>
                                {uploadState.label}
                            </span>
                        </div>

                        <div className="flex items-baseline justify-between font-mono tabular-nums">
                            <span className="text-xl font-bold text-foreground">
                                {uploadPct.toFixed(1)}%
                            </span>
                            {uploadSpeed && (
                                <span className="inline-flex items-center gap-1 text-xs text-info-light font-semibold">
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
