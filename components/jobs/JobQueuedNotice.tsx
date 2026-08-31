'use client'

import { Button } from '@/components/ui/button'
import { Clock, Loader2, PlayCircle } from 'lucide-react'
import { JobStatus } from '@/types/enums'
import type { Job } from '@/types/jobs'

/**
 * A job only sits in QUEUED or PENDING_UPLOAD until a worker claims it off the Redis
 * stream. Past a couple of minutes that hand-off has almost certainly been lost, and
 * nothing recovers it on its own — so surface the manual re-dispatch.
 */
const STUCK_AFTER_MS = 2 * 60 * 1000

interface JobQueuedNoticeProps {
    job: Job
    onForceStart: () => void
    isForceStarting?: boolean
}

export function JobQueuedNotice({ job, onForceStart, isForceStarting }: JobQueuedNoticeProps) {
    if (!job.canForceStart) return null

    const status = job.status as JobStatus
    const isUploadPhase = status === JobStatus.PENDING_UPLOAD

    // updatedAt moves on every write, so it approximates "entered this state".
    const since = job.updatedAt ?? job.createdAt
    const waitingMs = since ? Date.now() - new Date(since).getTime() : 0
    const looksStuck = waitingMs >= STUCK_AFTER_MS

    const waitingLabel = formatDuration(waitingMs)

    return (
        <div
            className={
                looksStuck
                    ? 'flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between'
                    : 'flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between'
            }
        >
            <div className="flex items-start gap-3">
                <Clock
                    className={
                        looksStuck
                            ? 'mt-0.5 h-5 w-5 shrink-0 text-warning'
                            : 'mt-0.5 h-5 w-5 shrink-0 text-muted-foreground'
                    }
                />
                <div>
                    <p className="text-sm font-medium">
                        {isUploadPhase
                            ? 'Waiting for an upload worker'
                            : 'Waiting for a download worker'}
                        {waitingLabel ? ` · ${waitingLabel}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {looksStuck
                            ? 'This is longer than it should take. The job may have been missed when it was queued — force starting hands it straight to a worker.'
                            : 'A worker should claim this shortly. Force start it if it stays here.'}
                    </p>
                </div>
            </div>

            <Button
                variant={looksStuck ? 'default' : 'outline'}
                size="sm"
                onClick={onForceStart}
                disabled={isForceStarting}
                className="shrink-0"
            >
                {isForceStarting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <PlayCircle className="mr-2 h-4 w-4" />
                )}
                Force Start
            </Button>
        </div>
    )
}

function formatDuration(ms: number): string | null {
    if (!Number.isFinite(ms) || ms < 1000) return null

    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ${minutes % 60}m`

    return `${Math.floor(hours / 24)}d ${hours % 24}h`
}
