'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    RefreshCcw,
    StopCircle,
    Loader2,
    ArrowLeft,
    PlayCircle,
} from 'lucide-react'
import Link from 'next/link'
import type { Job } from '@/types/jobs'
import { getJobStatusConfig } from './JobStatusConfig'
import { JobStatus } from '@/types/enums'
import { useJobsStore } from '@/stores/jobsStore'
import { useJobQueueStatus } from '@/hooks/useJobs'

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

    // With every slot taken the job is waiting its turn, and re-dispatching only sends
    // it back to the same queue. Offering the button there is what misled users before.
    const slotsFull =
        job.status === JobStatus.QUEUED && !!queue && queue.downloadSlotsFull

    return (
        <div className="flex flex-col gap-4">
            {/* Back link */}
            <Link
                href="/jobs"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
                <ArrowLeft className="h-4 w-4" />
                Jobs
            </Link>

            {/* Title row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold tracking-tight">
                            Job{' '}
                            <span className="font-mono text-muted-foreground text-xl">
                                #{job.id}
                            </span>
                        </h1>
                        <Badge variant={config.badgeVariant}>
                            {config.label}
                        </Badge>
                    </div>
                    {job.requestFileName && (
                        <p className="text-sm text-muted-foreground">{job.requestFileName}</p>
                    )}
                    {job.currentState && (
                        <p className="text-xs text-muted-foreground">{job.currentState}</p>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 shrink-0">
                    {job.canForceStart && onForceStart && !slotsFull && (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onForceStart}
                                        disabled={isForceStarting}
                                    >
                                        {isForceStarting ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <PlayCircle className="mr-2 h-4 w-4" />
                                        )}
                                        Force Start
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-[240px]">
                                        Hand this job straight to a worker. Use it when a job has
                                        sat waiting far longer than it should.
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {job.canRetry && onRetry && (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onRetry}
                                        disabled={isRetrying}
                                    >
                                        {isRetrying ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                        )}
                                        Retry
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Retry this job from its current phase</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {job.canCancel && (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={openCancelModal}
                                        disabled={isCancelling}
                                        className="border-danger/50 text-danger hover:bg-danger/10 hover:text-danger"
                                    >
                                        {isCancelling ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <StopCircle className="mr-2 h-4 w-4" />
                                        )}
                                        Cancel Job
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Cancel this job</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </div>
        </div>
    )
}
