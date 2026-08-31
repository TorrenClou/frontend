'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileUpload } from '@/components/ui/file-upload'
import {
    Upload,
    ArrowRight,
    Info,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Copy,
    X,
    FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { useBatchTorrentAnalysis } from '@/hooks/useTorrents'
import { useTorrentStore, type TorrentBatchItem } from '@/stores/torrentStore'
import { formatFileSize } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils'

/** Maximum torrents per batch — mirrors the API's own cap. */
const MAX_BATCH_SIZE = 20

function StatusIcon({ status }: { status: TorrentBatchItem['status'] }) {
    switch (status) {
        case 'analyzing':
            return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        case 'ready':
            return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
        case 'duplicate':
            return <Copy className="h-4 w-4 shrink-0 text-warning" />
        case 'error':
            return <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
        default:
            return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
    }
}

export default function TorrentUploadPage() {
    const router = useRouter()
    const [pendingFiles, setPendingFiles] = useState<Map<string, File>>(new Map())

    const { items, addFiles, removeItem, clearTorrentData } = useTorrentStore()
    const { mutate: analyze, isPending } = useBatchTorrentAnalysis()

    const handleFilesSelect = (files: File[]) => {
        const room = MAX_BATCH_SIZE - items.length
        if (room <= 0) {
            toast.error(`You can queue at most ${MAX_BATCH_SIZE} torrents at once`)
            return
        }

        const accepted = files.slice(0, room)
        if (accepted.length < files.length) {
            toast.warning(
                `Only ${accepted.length} added — the batch is limited to ${MAX_BATCH_SIZE} torrents`
            )
        }

        // addFiles returns the created rows so each File can be paired with the
        // localId the store generated for it.
        const created = addFiles(accepted)

        setPendingFiles((prev) => {
            const next = new Map(prev)
            created.forEach((item, index) => next.set(item.localId, accepted[index]))
            return next
        })
    }

    const handleAnalyze = () => {
        const toAnalyze = items
            .filter((i) => i.status === 'pending')
            .map((i) => ({ localId: i.localId, file: pendingFiles.get(i.localId)! }))
            .filter((i) => i.file)

        if (toAnalyze.length === 0) {
            toast.error('Add at least one torrent file')
            return
        }

        analyze(toAnalyze)
    }

    const handleRemove = (localId: string) => {
        removeItem(localId)
        setPendingFiles((prev) => {
            const next = new Map(prev)
            next.delete(localId)
            return next
        })
    }

    const handleClear = () => {
        clearTorrentData()
        setPendingFiles(new Map())
    }

    const pendingCount = items.filter((i) => i.status === 'pending').length
    const readyCount = items.filter((i) => i.status === 'ready').length
    const isAnalyzing = isPending || items.some((i) => i.status === 'analyzing')

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Upload Torrents</h1>
                <p className="text-muted-foreground">
                    Add one or more .torrent files and analyse them together
                </p>
            </div>

            {/* Upload Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Torrent Files
                    </CardTitle>
                    <CardDescription>
                        Drop up to {MAX_BATCH_SIZE} .torrent files — you pick which files to
                        download for each one in the next step
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FileUpload
                        accept=".torrent"
                        maxSize={10 * 1024 * 1024}
                        multiple
                        onFilesSelect={handleFilesSelect}
                        disabled={isAnalyzing}
                    />

                    {/* Queue */}
                    {items.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">
                                    {items.length} torrent{items.length === 1 ? '' : 's'} queued
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClear}
                                    disabled={isAnalyzing}
                                >
                                    Clear all
                                </Button>
                            </div>

                            <ul className="divide-y divide-border rounded-lg border border-border">
                                {items.map((item) => (
                                    <li
                                        key={item.localId}
                                        className="flex items-center gap-3 px-3 py-2.5"
                                    >
                                        <StatusIcon status={item.status} />

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {item.fileName}
                                            </p>
                                            {item.error ? (
                                                <p
                                                    className={cn(
                                                        'truncate text-xs',
                                                        item.status === 'duplicate'
                                                            ? 'text-warning'
                                                            : 'text-danger'
                                                    )}
                                                >
                                                    {item.error}
                                                </p>
                                            ) : item.analysis ? (
                                                <p className="text-xs text-muted-foreground">
                                                    {item.analysis.files.length} file
                                                    {item.analysis.files.length === 1 ? '' : 's'} ·{' '}
                                                    {formatFileSize(item.analysis.totalSizeInBytes)}
                                                </p>
                                            ) : null}
                                        </div>

                                        {item.status === 'duplicate' && (
                                            <Badge
                                                variant="outline"
                                                className="shrink-0 border-warning text-warning"
                                            >
                                                Duplicate
                                            </Badge>
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => handleRemove(item.localId)}
                                            disabled={isAnalyzing}
                                            aria-label={`Remove ${item.fileName}`}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {pendingCount > 0 ? (
                        <Button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="w-full"
                            size="lg"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analysing…
                                </>
                            ) : (
                                <>
                                    Analyse {pendingCount} torrent{pendingCount === 1 ? '' : 's'}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={() => router.push('/torrents/analyze')}
                            disabled={readyCount === 0 || isAnalyzing}
                            className="w-full"
                            size="lg"
                        >
                            Continue to file selection
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex gap-3 pt-6">
                    <Info className="h-5 w-5 shrink-0 text-primary" />
                    <div className="space-y-1 text-sm">
                        <p className="font-medium">How it works</p>
                        <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
                            <li>Add one or more .torrent files</li>
                            <li>Pick the files you want from each torrent</li>
                            <li>Choose a destination and start them all at once</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
