'use client'

import { Button } from '@/components/ui/button'
import { Clock, Loader2, PlayCircle, Users } from 'lucide-react'
import { JobStatus } from '@/types/enums'
import { useJobQueueStatus } from '@/hooks/useJobs'
import type { Job } from '@/types/jobs'

/**
 * How long a job can sit waiting before it is worth questioning, once capacity has
 * been ruled out as the reason.
 */
const STUCK_AFTER_MS = 2 * 60 * 1000

interface JobQueuedNoticeProps {
    job: Job
    onForceStart: () => void
    isForceStarting?: boolean
}

/**
 * Explains why a job has not started yet.
 *
 * There are two very different reasons a job sits in QUEUED, and conflating them is
 * what made this notice actively misleading before:
 *
 *  - Every worker is busy. A download occupies its Hangfire worker for the entire
 *    transfer, so worker count is a hard ceiling on concurrent torrents. The job is
 *    waiting its turn and re-dispatching it does nothing — it goes back to the same
 *    queue, behind the same jobs.
 *  - The queue hand-off was lost. Nothing will ever pick the job up, and force
 *    starting is exactly the fix.
 *
 * Force Start is only offered in the second case.
 */
export function JobQueuedNotice({ job, onForceStart, isForceStarting }: JobQueuedNoticeProps) {
    const { data: queue } = useJobQueueStatus(job.canForceStart)

    if (!job.canForceStart) return null

    const status = job.status as JobStatus
    const isUploadPhase = status === JobStatus.PENDING_UPLOAD

    const since = job.updatedAt ?? job.createdAt
    const waitingMs = since ? Date.now() - new Date(since).getTime() : 0
    const waitingLabel = formatDuration(waitingMs)

    const capacityKnown = !!queue && queue.downloadCapacity > 0
    const slotsFull = capacityKnown && !isUploadPhase && queue.downloadSlotsFull

    // Only call it stuck once capacity has been ruled out. A full queue explains the
    // wait completely, however long it has been.
    const looksStuck = !slotsFull && waitingMs >= STUCK_AFTER_MS

    if (slotsFull) {
        const ahead = Math.max(0, queue.queuedDownloads - 1)

        return (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                        <p className="text-sm font-medium">
                            Waiting for a free download slot
                            {waitingLabel ? ` · ${waitingLabel}` : ''}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            All {queue.downloadCapacity} download slots are in use
                            {ahead > 0
                                ? `, and ${ahead} other ${ahead === 1 ? 'job is' : 'jobs are'} ahead of this one`
                                : ''}
                            . It starts automatically as soon as one finishes — starting it
                            manually would only put it back in the same queue.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

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
                            ? capacityKnown
                                ? `A worker is free (${queue.activeDownloads} of ${queue.downloadCapacity} slots in use), so this job was most likely missed when it was queued. Force starting hands it straight to a worker.`
                                : 'This is longer than it should take. If the job was missed when it was queued, force starting hands it straight to a worker.'
                            : 'A worker should claim this shortly.'}
                    </p>
                </div>
            </div>

            {looksStuck && (
                <Button
                    variant="default"
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
            )}
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
