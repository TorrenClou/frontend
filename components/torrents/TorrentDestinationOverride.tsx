'use client'

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
import { Check, ChevronDown, HardDrive } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TorrentDestinationOverrideProps {
    /** null means this torrent follows the batch destination. */
    value: number | null
    onChange: (storageProfileId: number | null) => void
    /** Name of the batch destination, shown as the inherited default. */
    batchProfileName?: string | null
}

/**
 * Per-torrent destination picker. Defaults to inheriting the batch destination, so a
 * batch that all goes to one drive needs no interaction here at all.
 */
export function TorrentDestinationOverride({
    value,
    onChange,
    batchProfileName,
}: TorrentDestinationOverrideProps) {
    const { data: profiles } = useStorageProfiles()
    const { data: healthList } = useStorageProfilesHealth()

    const healthByProfileId = new Map<number, StorageProfileHealth>(
        (healthList ?? []).map((entry) => [entry.profileId, entry])
    )

    const active = (profiles ?? []).filter((p) => p.isActive)
    const selected = value == null ? null : active.find((p) => p.id === value)

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Destination
            </label>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                        <span className="flex items-center gap-2 truncate">
                            <HardDrive className="h-4 w-4 shrink-0" />
                            {selected ? (
                                selected.profileName
                            ) : (
                                <span className="text-muted-foreground">
                                    Same as batch
                                    {batchProfileName ? ` (${batchProfileName})` : ''}
                                </span>
                            )}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-[min(20rem,calc(100vw-2rem))]">
                    <DropdownMenuLabel>Send this torrent to</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                        onClick={() => onChange(null)}
                        className="flex items-center justify-between"
                    >
                        <span className="text-muted-foreground">
                            Same as batch
                            {batchProfileName ? ` (${batchProfileName})` : ''}
                        </span>
                        {value == null && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {active.map((profile) => {
                        const health = healthByProfileId.get(profile.id)
                        const status = health?.status ?? profile.healthStatus
                        const usable = health?.isUsable ?? profile.isUsable
                        const free = formatQuota(health?.quotaFreeBytes ?? profile.quotaFreeBytes)

                        return (
                            <DropdownMenuItem
                                key={profile.id}
                                disabled={!usable}
                                onClick={() => onChange(profile.id)}
                                className={cn(
                                    'flex items-start justify-between gap-3',
                                    value === profile.id && 'bg-accent'
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
                                    {value === profile.id && <Check className="h-4 w-4" />}
                                </div>
                            </DropdownMenuItem>
                        )
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
