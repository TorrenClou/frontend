'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart2, Lightbulb, Loader2, Plus } from 'lucide-react'
import { formatFileSize } from '@/lib/utils/formatters'
import { toast } from 'sonner'
import Link from 'next/link'

import { useTorrentStore, selectBatchSelectedSize } from '@/stores/torrentStore'
import { useStartBatchDownload } from '@/hooks/useTorrents'
import { StorageProfileSelector } from '@/components/storage'
import { TorrentReviewCard, TorrentDestinationOverride } from '@/components/torrents'
import { useStorageProfiles } from '@/hooks/useStorageProfiles'

export default function TorrentAnalyzePage() {
    const router = useRouter()

    const {
        items,
        selectedStorageProfileId,
        toggleFileSelection,
        selectAllFiles,
        deselectAllFiles,
        toggleExpanded,
        setItemStorageProfile,
        removeItem,
    } = useTorrentStore()

    const { data: profiles } = useStorageProfiles()
    const startBatch = useStartBatchDownload()

    const batchSelectedSize = useTorrentStore(selectBatchSelectedSize)

    useEffect(() => {
        if (items.length === 0) {
            router.push('/torrents/upload')
        }
    }, [items.length, router])

    if (items.length === 0) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const startable = items.filter(
        (i) => i.status === 'ready' && i.analysis && i.selectedFilePaths.length > 0
    )
    const blocked = items.filter((i) => i.status === 'error' || i.status === 'duplicate')
    const selectedFileCount = items.reduce((n, i) => n + i.selectedFilePaths.length, 0)

    const batchProfileName =
        profiles?.find((p) => p.id === selectedStorageProfileId)?.profileName ?? null

    // Every startable torrent needs a destination, either its own or the batch default.
    const missingDestination = startable.some(
        (i) => (i.storageProfileId ?? selectedStorageProfileId) == null
    )

    const handleStart = () => {
        if (startable.length === 0) {
            toast.error('Select at least one file in at least one torrent')
            return
        }
        if (missingDestination) {
            toast.error('Please select a storage destination')
            return
        }
        startBatch.mutate()
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/torrents/upload">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Back
                    </Link>
                </Button>
                <div>
                    <h1 className="text-xl font-bold">Review Torrents</h1>
                    <p className="text-sm text-muted-foreground">
                        {items.length} torrent{items.length === 1 ? '' : 's'} — pick the files you
                        want from each
                    </p>
                </div>
            </div>

            <div className="flex flex-col items-start gap-6 md:flex-row">
                {/* LEFT — one card per torrent */}
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                    {items.map((item) => (
                        <TorrentReviewCard
                            key={item.localId}
                            item={item}
                            onToggleExpanded={toggleExpanded}
                            onToggleFile={toggleFileSelection}
                            onSelectAll={selectAllFiles}
                            onDeselectAll={deselectAllFiles}
                            onRemove={removeItem}
                            destinationSlot={
                                <TorrentDestinationOverride
                                    value={item.storageProfileId}
                                    onChange={(id) => setItemStorageProfile(item.localId, id)}
                                    batchProfileName={batchProfileName}
                                />
                            }
                        />
                    ))}

                    <Button variant="outline" asChild className="w-full">
                        <Link href="/torrents/upload">
                            <Plus className="mr-2 h-4 w-4" />
                            Add more torrents
                        </Link>
                    </Button>
                </div>

                {/* RIGHT — sticky batch summary */}
                <div className="flex w-full shrink-0 flex-col gap-4 md:sticky md:top-6 md:w-[380px]">
                    <div className="relative flex flex-col gap-5 overflow-hidden rounded-xl border border-border bg-card p-6 shadow-lg">
                        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

                        <div className="relative flex flex-col gap-5">
                            <h3 className="flex items-center gap-2 text-base font-bold">
                                <BarChart2 className="h-5 w-5 text-primary" />
                                Batch Summary
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Ready to start
                                    </span>
                                    <span className="text-2xl font-bold tracking-tight">
                                        {startable.length}
                                        <span className="text-base font-normal text-muted-foreground">
                                            /{items.length}
                                        </span>
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Total Size
                                    </span>
                                    <span className="font-mono text-2xl font-bold tracking-tight">
                                        {formatFileSize(batchSelectedSize)}
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                {selectedFileCount} file{selectedFileCount === 1 ? '' : 's'} selected
                                across the batch
                            </p>

                            {blocked.length > 0 && (
                                <p className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
                                    {blocked.length} torrent{blocked.length === 1 ? '' : 's'} cannot
                                    start and will be skipped.
                                </p>
                            )}

                            <hr className="border-border" />

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-foreground">
                                    Save to Storage
                                </label>
                                <StorageProfileSelector />
                                <p className="text-xs text-muted-foreground">
                                    Applies to every torrent unless you override it on one.
                                </p>
                            </div>

                            <Button
                                onClick={handleStart}
                                className="w-full"
                                size="lg"
                                disabled={
                                    startable.length === 0 ||
                                    missingDestination ||
                                    startBatch.isPending
                                }
                            >
                                {startBatch.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Starting…
                                    </>
                                ) : startable.length === 1 ? (
                                    'Start download'
                                ) : (
                                    `Start all ${startable.length} downloads`
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-4">
                        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-medium">Smart Selection</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Unselecting non-essential files like READMEs or extras can save
                                bandwidth and storage space.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
