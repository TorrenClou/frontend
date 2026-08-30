'use client'

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
import { StorageHealthStatus } from '@/types/enums'
import type { StorageProfileHealth } from '@/types/storage'
import { AlertCircle, RefreshCcw, Loader2, HardDrive } from 'lucide-react'
import Link from 'next/link'
import type { Job } from '@/types/jobs'

interface JobErrorCardProps {
    job: Job
    onRetry?: () => void
    /** Retry against a specific drive instead of the one that just failed. */
    onRetryWithProfile?: (storageProfileId: number) => void
    isRetrying?: boolean
}

export function JobErrorCard({
    job,
    onRetry,
    onRetryWithProfile,
    isRetrying,
}: JobErrorCardProps) {
    const { data: profiles } = useStorageProfiles()
    const { data: healthList } = useStorageProfilesHealth()

    const healthByProfileId = new Map<number, StorageProfileHealth>(
        (healthList ?? []).map((entry) => [entry.profileId, entry])
    )

    // Only worth offering when there is somewhere else to send it.
    const alternatives = (profiles ?? []).filter(
        (profile) => profile.isActive && profile.id !== job.storageProfileId
    )

    const showDriveRetry = job.canRetry && onRetryWithProfile && alternatives.length > 0

    return (
        <Card className="border-orange/50 bg-orange/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange">
                    <AlertCircle className="h-5 w-5" />
                    Error
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm">{job.errorMessage}</p>
                <div className="flex flex-wrap gap-2">
                    {job.canRetry && onRetry && (
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
                            Retry Job
                        </Button>
                    )}

                    {showDriveRetry && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={isRetrying}>
                                    <HardDrive className="mr-2 h-4 w-4" />
                                    Retry on another drive
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="start" className="min-w-[280px]">
                                <DropdownMenuLabel>Retry this job on</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                {alternatives.map((profile) => {
                                    const health = healthByProfileId.get(profile.id)
                                    const status = health?.status ?? profile.healthStatus
                                    const usable = health?.isUsable ?? profile.isUsable
                                    const free = formatQuota(
                                        health?.quotaFreeBytes ?? profile.quotaFreeBytes
                                    )

                                    return (
                                        <DropdownMenuItem
                                            key={profile.id}
                                            disabled={!usable}
                                            onClick={() => onRetryWithProfile?.(profile.id)}
                                            className="flex items-start justify-between gap-3"
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

                                            {status !== StorageHealthStatus.Healthy && (
                                                <StorageHealthBadge
                                                    status={status}
                                                    message={health?.message ?? profile.healthMessage}
                                                    className="shrink-0"
                                                />
                                            )}
                                        </DropdownMenuItem>
                                    )
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    <Button variant="outline" size="sm" asChild>
                        <Link href="/support">Contact Support</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
