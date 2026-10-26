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
                {/* Stage 1: BitTorrent Download Segment (Electric Sky) */}
                <div
                    className="relative h-full w-full rounded-full bg-surface-300/40 overflow-hidden"
                    title={`BitTorrent Phase: ${downloadPct.toFixed(1)}%${isCancelled ? ' (Cancelled)' : ''}`}
                >
                    <div
                        className={cn(
                            'h-full w-full rounded-full transition-transform duration-300 ease-out-quint',
                            isCancelled
                                ? 'bg-zinc-600/40'
                                : isDownloadFailed
                                  ? 'bg-rose-500'
                                  : isCompleted || isPastDownloadPhase
                                    ? 'bg-sky-500/75'
                                    : dlActive
                                      ? 'bg-sky-500'
                                      : 'bg-sky-500/35'
                        )}
                        style={{ transform: `translateX(-${100 - downloadPct}%)` }}
                    />
                </div>

                {/* Stage 2: Cloud Upload Segment (Vibrant Violet -> Emerald Green on completion) */}
                <div
                    className="relative h-full w-full rounded-full bg-surface-300/40 overflow-hidden"
                    title={`Cloud Upload Phase: ${uploadPct.toFixed(1)}%${isCancelled ? ' (Cancelled)' : ''}`}
                >
                    <div
                        className={cn(
                            'h-full w-full rounded-full transition-transform duration-300 ease-out-quint',
                            isCancelled
                                ? 'bg-zinc-600/30'
                                : isUploadFailed
                                  ? 'bg-rose-500'
                                  : isCompleted
                                    ? 'bg-emerald-500'
                                    : ulActive
                                      ? 'bg-violet-500'
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
                                    ? 'bg-zinc-500'
                                    : dlActive
                                      ? 'bg-sky-400 animate-pulse'
                                      : isDownloadFailed
                                        ? 'bg-rose-400'
                                        : isCompleted || isPastDownloadPhase
                                          ? 'bg-sky-400/80'
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
                                    ? 'bg-zinc-500'
                                    : ulActive
                                      ? 'bg-violet-400 animate-pulse'
                                      : isUploadFailed
                                        ? 'bg-rose-400'
                                        : isCompleted
                                          ? 'bg-emerald-400'
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
