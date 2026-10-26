'use client'

import * as React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    RefreshCw,
    StopCircle,
    Loader2,
    ArrowLeft,
    Play,
    Cloud,
    Database,
} from 'lucide-react'
import type { Job } from '@/types/jobs'
import { getJobStatusConfig } from './JobStatusConfig'
import { JobStatus } from '@/types/enums'
import { useJobsStore } from '@/stores/jobsStore'
import { useJobQueueStatus } from '@/hooks/useJobs'
import { formatRelativeTime } from '@/lib/utils/formatters'

interface JobHeaderProps {
    job: Job
    onRetry?: () => void
    onForceStart?: () => void
    isRetrying?: boolean
    isForceStarting?: boolean
    isCancelling?: boolean
}

export function JobHeader({
    job,
    onRetry,
    onForceStart,
    isRetrying,
    isForceStarting,
    isCancelling,
}: JobHeaderProps) {
    const config = getJobStatusConfig(job.status as JobStatus)
    const { openCancelModal } = useJobsStore()
    const { data: queue } = useJobQueueStatus(job.canForceStart)

    const slotsFull =
        job.status === JobStatus.QUEUED && Boolean(queue?.downloadSlotsFull)

    const displayTitle = job.requestFileName || job.fileName || `Job #${job.id}`
    const isS3 = job.storageProviderType?.toLowerCase() === 's3' || job.storageProfileName?.toLowerCase().includes('s3')

    return (
        <div className="flex flex-col gap-3 sm:gap-4">
            {/* Back link */}
            <Link
                href="/jobs"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Transfers
            </Link>

            {/* Title & Actions Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    {/* Content-First Title Row */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate max-w-[680px]">
                            {displayTitle}
                        </h1>
                        <span className="font-mono text-xs text-muted-foreground bg-surface-400/50 border border-surface-300/40 rounded px-1.5 py-0.5 tabular-nums">
                            #{job.id}
                        </span>
                        <Badge variant={config.badgeVariant} className="text-xs h-5.5 px-2">
                            {config.label}
                        </Badge>
                    </div>

                    {/* Metadata Subtitle Strip */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1">
                            {isS3 ? (
                                <Database className="h-3 w-3 text-warning-medium" />
                            ) : (
                                <Cloud className="h-3 w-3 text-primary-200" />
                            )}
                            <span className="font-medium text-foreground/80">
                                {job.storageProfileName || 'Storage Destination'}
                            </span>
                        </span>
                        <span>·</span>
                        <span>
                            Started {formatRelativeTime(job.createdAt || new Date().toISOString())}
                        </span>
                        {job.currentState && (
                            <>
                                <span>·</span>
                                <span className="text-foreground/70 font-mono text-[11px]">
                                    {job.currentState}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {job.canForceStart && onForceStart && !slotsFull && (
                        <TooltipProvider delayDuration={150}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onForceStart}
                                        disabled={isForceStarting}
                                        className="h-8.5 text-xs border-primary/40 text-primary-100 hover:bg-primary/15"
                                    >
                                        {isForceStarting ? (
                                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Play className="mr-1.5 h-3.5 w-3.5" />
                                        )}
                                        Force Start
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-[240px]">
                                        Dispatch this job straight to a worker immediately.
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    {job.canRetry && onRetry && (
                        <TooltipProvider delayDuration={150}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onRetry}
                                        disabled={isRetrying}
                                        className="h-8.5 text-xs border-primary/40 text-primary-100 hover:bg-primary/15"
                                    >
                                        {isRetrying ? (
                                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                        )}
                                        Retry
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Retry this transfer from its current phase</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    {job.canCancel && (
                        <TooltipProvider delayDuration={150}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={openCancelModal}
                                        disabled={isCancelling}
                                        className="h-8.5 text-xs border-danger/40 text-danger-light hover:bg-danger/15"
                                    >
                                        {isCancelling ? (
                                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <StopCircle className="mr-1.5 h-3.5 w-3.5" />
                                        )}
                                        Cancel Transfer
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Halt and cancel this transfer job</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </div>
        </div>
    )
}
