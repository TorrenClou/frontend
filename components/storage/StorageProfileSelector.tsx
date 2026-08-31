'use client'

import { useTorrentStore } from '@/stores/torrentStore'
import { useStorageProfiles, useStorageProfilesHealth } from '@/hooks/useStorageProfiles'
import { StorageHealthStatus, StorageProviderType } from '@/types/enums'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Loader2, HardDrive, Cloud, AlertCircle, ChevronDown, Check } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { StorageHealthBadge, formatQuota } from './StorageHealthBadge'
import type { StorageProfileHealth } from '@/types/storage'

// Provider icons mapping
const providerIcons: Record<StorageProviderType, React.ReactNode> = {
    [StorageProviderType.GoogleDrive]: <Cloud className="h-4 w-4" />,
    [StorageProviderType.OneDrive]: <Cloud className="h-4 w-4" />,
    [StorageProviderType.S3]: <HardDrive className="h-4 w-4" />,
    [StorageProviderType.Dropbox]: <Cloud className="h-4 w-4" />,
}

interface StorageProfileSelectorProps {
    className?: string
}

export function StorageProfileSelector({ className }: StorageProfileSelectorProps) {
    const { selectedStorageProfileId, setSelectedStorageProfileId } = useTorrentStore()
    const { data: profiles, isLoading, error } = useStorageProfiles()
    const { data: healthList } = useStorageProfilesHealth()

    // Auto-select a profile that can actually take an upload. A healthy default wins;
    // otherwise the first healthy profile, falling back to the first active one so the
    // selector is never empty when health has not been probed yet.
    useEffect(() => {
        if (profiles && profiles.length > 0 && !selectedStorageProfileId) {
            const active = profiles.filter(p => p.isActive)
            const profileToSelect =
                active.find(p => p.isDefault && p.isUsable) ??
                active.find(p => p.isUsable) ??
                active.find(p => p.isDefault) ??
                active[0]

            if (profileToSelect) {
                setSelectedStorageProfileId(profileToSelect.id)
            }
        }
    }, [profiles, selectedStorageProfileId, setSelectedStorageProfileId])

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading storage profiles...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Failed to load storage profiles</span>
            </div>
        )
    }

    // Filter to only active profiles
    const activeProfiles = profiles?.filter(p => p.isActive) ?? []

    if (activeProfiles.length === 0) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-warning">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">No active storage profiles</span>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href="/storage">Connect Storage</Link>
                </Button>
            </div>
        )
    }

    const selectedProfile = activeProfiles.find(p => p.id === selectedStorageProfileId)

    const healthByProfileId = new Map<number, StorageProfileHealth>(
        (healthList ?? []).map((entry) => [entry.profileId, entry])
    )

    const healthOf = (profileId: number, fallbackStatus: StorageHealthStatus) =>
        healthByProfileId.get(profileId)?.status ?? fallbackStatus

    const selectedHealth = selectedProfile
        ? healthByProfileId.get(selectedProfile.id)
        : undefined
    const selectedIsUsable = selectedHealth?.isUsable ?? selectedProfile?.isUsable ?? true

    return (
        <div className={className}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                        {selectedProfile ? (
                            <div className="flex items-center gap-2">
                                {providerIcons[selectedProfile.providerType]}
                                <span>{selectedProfile.profileName}</span>
                                {selectedProfile.isDefault && (
                                    <Badge variant="secondary" className="text-xs">
                                        Default
                                    </Badge>
                                )}
                            </div>
                        ) : (
                            <span className="text-muted-foreground">Select storage destination</span>
                        )}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[min(20rem,calc(100vw-2rem))]">
                    {activeProfiles.map((profile) => {
                        const status = healthOf(profile.id, profile.healthStatus)
                        const health = healthByProfileId.get(profile.id)
                        const free = formatQuota(health?.quotaFreeBytes ?? profile.quotaFreeBytes)

                        return (
                            <DropdownMenuItem
                                key={profile.id}
                                onClick={() => setSelectedStorageProfileId(profile.id)}
                                className={cn(
                                    "flex items-start justify-between gap-3",
                                    selectedStorageProfileId === profile.id && "bg-accent"
                                )}
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        {providerIcons[profile.providerType]}
                                        <span className="truncate">{profile.profileName}</span>
                                        {profile.isDefault && (
                                            <Badge variant="secondary" className="text-xs">
                                                Default
                                            </Badge>
                                        )}
                                    </div>
                                    {free && (
                                        <p className="ml-6 text-xs text-muted-foreground">{free} free</p>
                                    )}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {status !== StorageHealthStatus.Healthy && (
                                        <StorageHealthBadge
                                            status={status}
                                            message={health?.message ?? profile.healthMessage}
                                        />
                                    )}
                                    {selectedStorageProfileId === profile.id && (
                                        <Check className="h-4 w-4" />
                                    )}
                                </div>
                            </DropdownMenuItem>
                        )
                    })}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* An unusable pick is allowed — uploads fail over to a healthy drive — but the
                user should know before starting the job. */}
            {selectedProfile && !selectedIsUsable && (
                <p className="mt-2 flex items-start gap-2 text-sm text-warning">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        {selectedHealth?.message ??
                            selectedProfile.healthMessage ??
                            'This drive is not accepting uploads right now.'}{' '}
                        The upload will be moved to another healthy drive if one is connected.
                    </span>
                </p>
            )}
        </div>
    )
}
