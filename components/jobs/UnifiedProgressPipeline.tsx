'use client'

import * as React from 'react'
import { getJobPhaseProgress } from '@/lib/utils/job-progress'
import type { Job } from '@/types/jobs'
import { cn } from '@/lib/utils'

interface UnifiedProgressPipelineProps {
    job: Job
    className?: string
    size?: 'sm' | 'md'
    showSummary?: boolean
}

export function UnifiedProgressPipeline({
    job,
    className,
    size = 'sm',
    showSummary = false,
}: UnifiedProgressPipelineProps) {
    const {
        downloadPct,
        uploadPct,
        isDownloadingPhase,
        isUploadingPhase,
        isPastDownloadPhase,
        isCompleted,
        isCancelled,
        isDownloadFailed,
        isUploadFailed,
    } = getJobPhaseProgress(job)

    const barHeight = size === 'md' ? 'h-2' : 'h-1.5'

    // Determine phase active states
    const dlActive = isDownloadingPhase
    const ulActive = isUploadingPhase

    return (
        <div className={cn('w-full space-y-1.5', className)}>
            {/* Split Dual-Stage Progress Bar Track */}
            <div
                className={cn(
                    'grid grid-cols-2 gap-1 w-full rounded-full bg-surface-400/60 p-0.5',
                    barHeight
                )}
                role="progressbar"
                aria-label={`Transfer progress for job #${job.id}`}
                aria-valuenow={Math.round((downloadPct + uploadPct) / 2)}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                {/* Stage 1: BitTorrent Download Segment */}
                <div
                    className="relative h-full w-full rounded-full bg-surface-300/40 overflow-hidden"
                    title={`BitTorrent Phase: ${downloadPct.toFixed(1)}%${isCancelled ? ' (Cancelled)' : ''}`}
                >
                    <div
                        className={cn(
                            'h-full w-full rounded-full transition-transform duration-300 ease-out-quint',
                            isCancelled
                                ? 'bg-muted-foreground/35'
                                : isDownloadFailed
                                  ? 'bg-danger'
                                  : isCompleted || isPastDownloadPhase
                                    ? 'bg-primary-300'
                                    : dlActive
                                      ? 'bg-primary'
                                      : 'bg-primary/50'
                        )}
                        style={{ transform: `translateX(-${100 - downloadPct}%)` }}
                    />
                </div>

                {/* Stage 2: Cloud Upload Segment */}
                <div
                    className="relative h-full w-full rounded-full bg-surface-300/40 overflow-hidden"
                    title={`Cloud Upload Phase: ${uploadPct.toFixed(1)}%${isCancelled ? ' (Cancelled)' : ''}`}
                >
                    <div
                        className={cn(
                            'h-full w-full rounded-full transition-transform duration-300 ease-out-quint',
                            isCancelled
                                ? 'bg-muted-foreground/25'
                                : isUploadFailed
                                  ? 'bg-danger'
                                  : isCompleted
                                    ? 'bg-success'
                                    : ulActive
                                      ? 'bg-info-medium'
                                      : 'bg-surface-300/60'
                        )}
                        style={{ transform: `translateX(-${100 - uploadPct}%)` }}
                    />
                </div>
            </div>

            {/* Optional Summary Footnote */}
            {showSummary && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono tabular-nums">
                    <span className="flex items-center gap-1.5 truncate">
                        <span
                            className={cn(
                                'inline-block h-1.5 w-1.5 rounded-full',
                                isCancelled
                                    ? 'bg-muted-foreground/40'
                                    : dlActive
                                      ? 'bg-primary animate-pulse'
                                      : isDownloadFailed
                                        ? 'bg-danger'
                                        : 'bg-muted-foreground/60'
                            )}
                        />
                        <span>BitTorrent: {downloadPct.toFixed(0)}%</span>
                    </span>
                    <span className="flex items-center gap-1.5 truncate">
                        <span
                            className={cn(
                                'inline-block h-1.5 w-1.5 rounded-full',
                                isCancelled
                                    ? 'bg-muted-foreground/40'
                                    : ulActive
                                      ? 'bg-info-medium animate-pulse'
                                      : isUploadFailed
                                        ? 'bg-danger'
                                        : isCompleted
                                          ? 'bg-success'
                                          : 'bg-muted-foreground/60'
                            )}
                        />
                        <span>Cloud: {uploadPct.toFixed(0)}%</span>
                    </span>
                </div>
            )}
        </div>
    )
}
