'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StorageHealthBadge, formatQuota } from '@/components/storage/StorageHealthBadge'
import { useStorageProfiles, useStorageProfilesHealth } from '@/hooks/useStorageProfiles'
import { useChangeJobStorageProfile } from '@/hooks/useJobs'
import { StorageHealthStatus, StorageRouteReason } from '@/types/enums'
import type { Job } from '@/types/jobs'
import type { StorageProfileHealth } from '@/types/storage'
import { ArrowRight, Check, ChevronDown, HardDrive, Loader2, Pin, Shuffle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobDestinationCardProps {
    job: Job
    className?: string
}

/** Plain-English explanation of why a job left its previous drive. */
const routeReasonText: Record<StorageRouteReason, string | null> = {
    [StorageRouteReason.None]: null,
    [StorageRouteReason.UserRouted]: 'You moved this job to a different drive.',
    [StorageRouteReason.FailoverNeedsReauth]:
        'The original drive needed to be reconnected, so the upload was moved automatically.',
    [StorageRouteReason.FailoverQuotaExceeded]:
        'The original drive ran out of space, so the upload was moved automatically.',
    [StorageRouteReason.FailoverUnhealthy]:
        'The original drive stopped accepting uploads, so it was moved automatically.',
    [StorageRouteReason.FailoverInactive]:
        'The original drive was disconnected, so the upload was moved automatically.',
}

/**
 * Shows where a job uploads to, whether that drive is healthy, and lets the user
 * send it somewhere else while the upload has not started yet.
 */
export function JobDestinationCard({ job, className }: JobDestinationCardProps) {
    const { data: profiles } = useStorageProfiles()
    const { data: healthList } = useStorageProfilesHealth()
    const changeDestination = useChangeJobStorageProfile()

    // Mirrors the job's own setting so the toggle stays meaningful between saves.
    const [pinned, setPinned] = useState(!job.allowStorageFailover)

    const healthByProfileId = new Map<number, StorageProfileHealth>(
        (healthList ?? []).map((entry) => [entry.profileId, entry])
    )

    const currentHealth = healthByProfileId.get(job.storageProfileId)
    const candidates = (profiles ?? []).filter((profile) => profile.isActive)
    const rerouteExplanation = routeReasonText[job.lastRouteReason]

    const handleSelect = (storageProfileId: number) => {
        if (storageProfileId === job.storageProfileId) return
        changeDestination.mutate({ jobId: job.id, storageProfileId, allowFailover: !pinned })
    }

    const handleTogglePin = () => {
        const nextPinned = !pinned
        setPinned(nextPinned)
        // Re-send the current destination so the pin is persisted on its own.
        changeDestination.mutate({
            jobId: job.id,
            storageProfileId: job.storageProfileId,
            allowFailover: !nextPinned,
        })
    }

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <HardDrive className="h-4 w-4" />
                    Destination
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{job.storageProfileName || 'Unknown drive'}</span>
                    {currentHealth && (
                        <StorageHealthBadge
                            status={currentHealth.status}
                            message={currentHealth.message}
                        />
                    )}
                    {!job.allowStorageFailover && (
                        <Badge variant="outline" title="Automatic failover is off for this job.">
                            <Pin className="mr-1 h-3 w-3" />
                            Pinned
                        </Badge>
                    )}
                </div>

                {currentHealth?.message && !currentHealth.isUsable && (
                    <p className="text-sm text-danger">{currentHealth.message}</p>
                )}

                {job.wasRerouted && (
                    <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
                        <div className="flex items-center gap-2 font-medium">
                            <Shuffle className="h-4 w-4 shrink-0" />
                            <span className="flex flex-wrap items-center gap-1">
                                {job.originalStorageProfileName ?? 'Original drive'}
                                <ArrowRight className="h-3 w-3" />
                                {job.storageProfileName}
                            </span>
                        </div>
                        {rerouteExplanation && (
                            <p className="mt-1 text-muted-foreground">{rerouteExplanation}</p>
                        )}
                    </div>
                )}

                {job.canChangeStorageProfile ? (
                    <div className="space-y-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between"
                                    disabled={changeDestination.isPending || candidates.length === 0}
                                >
                                    {changeDestination.isPending ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Updating…
                                        </span>
                                    ) : (
                                        <span>Send to another drive</span>
                                    )}
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent className="w-full min-w-[300px]">
                                <DropdownMenuLabel>Available drives</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                {candidates.map((profile) => {
                                    const health = healthByProfileId.get(profile.id)
                                    const status = health?.status ?? profile.healthStatus
                                    const usable = health?.isUsable ?? profile.isUsable
                                    const free = formatQuota(
                                        health?.quotaFreeBytes ?? profile.quotaFreeBytes
                                    )

                                    return (
                                        <DropdownMenuItem
                                            key={profile.id}
                                            // Unhealthy drives stay visible but unselectable, so the
                                            // reason a drive is missing is never a mystery.
                                            disabled={!usable}
                                            onClick={() => handleSelect(profile.id)}
                                            className={cn(
                                                'flex items-start justify-between gap-3',
                                                profile.id === job.storageProfileId && 'bg-accent'
                                            )}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate">{profile.profileName}</span>
                                                    {profile.isDefault && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Default
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {profile.providerType}
                                                    {free ? ` · ${free} free` : ''}
                                                </p>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2">
                                                {status !== StorageHealthStatus.Healthy && (
                                                    <StorageHealthBadge
                                                        status={status}
                                                        message={health?.message ?? profile.healthMessage}
                                                    />
                                                )}
                                                {profile.id === job.storageProfileId && (
                                                    <Check className="h-4 w-4" />
                                                )}
                                            </div>
                                        </DropdownMenuItem>
                                    )
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
                            <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={pinned}
                                disabled={changeDestination.isPending}
                                onChange={handleTogglePin}
                            />
                            <span>
                                Pin to this drive — fail instead of moving the upload elsewhere if it
                                becomes unavailable.
                            </span>
                        </label>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {job.status === 'UPLOADING'
                            ? 'The upload is running. Wait for it to finish or fail, then retry it against another drive.'
                            : 'This job has finished, so its destination can no longer change.'}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
