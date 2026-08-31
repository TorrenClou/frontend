'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Settings as SettingsIcon,
    HardDrive,
    Loader2,
    Trash2,
    AlertTriangle,
    RefreshCw,
    Info,
} from 'lucide-react'
import { formatFileSize } from '@/lib/utils/formatters'
import {
    useUserSettings,
    useUpdateUserSettings,
    useDownloadStorage,
    usePurgeDownloads,
} from '@/hooks/useSettings'

export default function SettingsPage() {
    const { data: settings, isLoading: settingsLoading } = useUserSettings()
    const updateSettings = useUpdateUserSettings()

    const { data: storage, isLoading: storageLoading, refetch, isFetching } = useDownloadStorage()
    const purge = usePurgeDownloads()

    const [confirmingPurge, setConfirmingPurge] = useState(false)

    const handleToggleDeleteAfterUpload = () => {
        if (!settings) return
        updateSettings.mutate({ deleteAfterUpload: !settings.deleteAfterUpload })
    }

    const handlePurge = () => {
        purge.mutate(undefined, { onSettled: () => setConfirmingPurge(false) })
    }

    const nothingToPurge = !storage || storage.purgeableCount === 0

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and storage
                </p>
            </div>

            {/* Downloads behaviour */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5" />
                        Downloads
                    </CardTitle>
                    <CardDescription>
                        What happens to local files once a job finishes
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {settingsLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Loading settings…</span>
                        </div>
                    ) : (
                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-primary"
                                checked={settings?.deleteAfterUpload ?? true}
                                disabled={updateSettings.isPending}
                                onChange={handleToggleDeleteAfterUpload}
                            />
                            <span>
                                <span className="text-sm font-medium">
                                    Delete downloads after a successful upload
                                </span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                    Reclaims disk space as soon as every file reaches your cloud
                                    storage. Turn this off to keep local copies — you can still
                                    reclaim them below.
                                </span>
                            </span>
                            {updateSettings.isPending && (
                                <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                            )}
                        </label>
                    )}
                </CardContent>
            </Card>

            {/* Storage usage + purge */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <HardDrive className="h-5 w-5" />
                                Local Storage
                            </CardTitle>
                            <CardDescription>
                                Files still on the server&apos;s downloads volume
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            aria-label="Rescan downloads volume"
                        >
                            <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {storageLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Scanning downloads…</span>
                        </div>
                    ) : storage?.warning ? (
                        <div className="flex gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{storage.warning}</span>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-border bg-background/40 p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Can be freed
                                    </p>
                                    <p className="mt-1 font-mono text-2xl font-bold text-primary">
                                        {formatFileSize(storage?.purgeableBytes ?? 0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {storage?.purgeableCount ?? 0} completed or cancelled
                                    </p>
                                </div>

                                <div className="rounded-lg border border-border bg-background/40 p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        In use
                                    </p>
                                    <p className="mt-1 font-mono text-2xl font-bold">
                                        {formatFileSize(storage?.retainedBytes ?? 0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {storage?.retainedCount ?? 0} active, retrying or failed
                                    </p>
                                </div>

                                <div className="rounded-lg border border-border bg-background/40 p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Unrecognised
                                    </p>
                                    <p className="mt-1 font-mono text-2xl font-bold text-muted-foreground">
                                        {formatFileSize(storage?.orphanedBytes ?? 0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {storage?.orphanedCount ?? 0} with no matching job
                                    </p>
                                </div>
                            </div>

                            {(storage?.orphanedCount ?? 0) > 0 && (
                                <div className="flex gap-2 rounded-md border border-border bg-background/40 p-3 text-xs text-muted-foreground">
                                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>
                                        Unrecognised directories are never purged automatically —
                                        the app cannot confirm they are dead. Remove them on the
                                        server if you are sure.
                                    </span>
                                </div>
                            )}

                            {/* Purgeable breakdown */}
                            {(storage?.purgeableCount ?? 0) > 0 && (
                                <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                                    {storage!.purgeable.map((entry) => (
                                        <li
                                            key={entry.directoryName}
                                            className="flex items-center gap-3 px-3 py-2"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm">
                                                    {entry.torrentName ?? `Job #${entry.jobId ?? entry.directoryName}`}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Job #{entry.jobId}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="shrink-0 text-xs">
                                                {entry.jobStatus}
                                            </Badge>
                                            <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                                {formatFileSize(entry.sizeBytes)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Purge action */}
                            {confirmingPurge ? (
                                <div className="space-y-3 rounded-md border border-danger/30 bg-danger/10 p-3">
                                    <div className="flex gap-2 text-sm">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                                        <span>
                                            Permanently delete{' '}
                                            <strong>{formatFileSize(storage?.purgeableBytes ?? 0)}</strong>{' '}
                                            from {storage?.purgeableCount} completed and cancelled
                                            job{storage?.purgeableCount === 1 ? '' : 's'}? Files already
                                            uploaded to your cloud storage are not affected.
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="bg-danger text-danger-foreground hover:bg-danger/90"
                                            onClick={handlePurge}
                                            disabled={purge.isPending}
                                        >
                                            {purge.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Purging…
                                                </>
                                            ) : (
                                                'Yes, delete them'
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setConfirmingPurge(false)}
                                            disabled={purge.isPending}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={() => setConfirmingPurge(true)}
                                    disabled={nothingToPurge || isFetching}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {nothingToPurge
                                        ? 'Nothing to purge'
                                        : `Purge ${formatFileSize(storage!.purgeableBytes)}`}
                                </Button>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
