'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Copy,
    Check,
    File,
    FileText,
    Disc,
    Archive,
    Film,
    Music2,
    ImageIcon,
    Activity,
    ArrowUp,
    ArrowDown,
    ChevronDown,
    ChevronRight,
    X,
    AlertCircle,
} from 'lucide-react'
import { formatFileSize, formatInfoHash } from '@/lib/utils/formatters'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getItemSelectedSize, type TorrentBatchItem } from '@/stores/torrentStore'

export function getFileIcon(path: string) {
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    if (ext === 'pdf')
        return <FileText className="h-[18px] w-[18px] shrink-0 text-red-400" />
    if (['iso', 'img', 'dmg'].includes(ext))
        return <Disc className="h-[18px] w-[18px] shrink-0 text-purple-400" />
    if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext))
        return <Archive className="h-[18px] w-[18px] shrink-0 text-yellow-400" />
    if (['mp4', 'mkv', 'avi', 'mov'].includes(ext))
        return <Film className="h-[18px] w-[18px] shrink-0 text-blue-400" />
    if (['mp3', 'flac', 'wav'].includes(ext))
        return <Music2 className="h-[18px] w-[18px] shrink-0 text-pink-400" />
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
        return <ImageIcon className="h-[18px] w-[18px] shrink-0 text-green-400" />
    return <File className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
}

export function getHealthColor(score: number) {
    if (score >= 80) return 'text-primary'
    if (score >= 50) return 'text-warning'
    return 'text-danger'
}

interface TorrentReviewCardProps {
    item: TorrentBatchItem
    onToggleExpanded: (localId: string) => void
    onToggleFile: (localId: string, path: string) => void
    onSelectAll: (localId: string) => void
    onDeselectAll: (localId: string) => void
    onRemove: (localId: string) => void
    /** Rendered inside the expanded body — used for the per-torrent destination override. */
    destinationSlot?: React.ReactNode
}

/**
 * One torrent in the batch: a collapsed summary row that expands into the full
 * file-selection list. Each card owns its torrent's selection only.
 */
export function TorrentReviewCard({
    item,
    onToggleExpanded,
    onToggleFile,
    onSelectAll,
    onDeselectAll,
    onRemove,
    destinationSlot,
}: TorrentReviewCardProps) {
    const [copied, setCopied] = useState(false)

    const analysis = item.analysis
    const isBlocked = item.status === 'error' || item.status === 'duplicate'

    const handleCopyHash = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!analysis) return
        navigator.clipboard.writeText(analysis.infoHash)
        setCopied(true)
        toast.success('Info hash copied to clipboard')
        setTimeout(() => setCopied(false), 2000)
    }

    if (!analysis) {
        return (
            <div className="rounded-xl border border-danger/40 bg-danger/5 p-4">
                <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-danger" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.fileName}</p>
                        <p className="text-xs text-danger">{item.error ?? 'Could not be analysed'}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => onRemove(item.localId)}
                        aria-label={`Remove ${item.fileName}`}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )
    }

    const selectedSize = getItemSelectedSize(item)
    const health = analysis.torrentHealth

    return (
        <div
            className={cn(
                'overflow-hidden rounded-xl border bg-card shadow-sm',
                isBlocked ? 'border-warning/40' : 'border-border'
            )}
        >
            {/* Collapsed summary row */}
            <button
                type="button"
                onClick={() => onToggleExpanded(item.localId)}
                aria-expanded={item.expanded}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
            >
                {item.expanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}

                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{analysis.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                        {item.selectedFilePaths.length}/{analysis.files.length} files ·{' '}
                        {formatFileSize(selectedSize)}
                        {item.selectedFilePaths.length === 0 && ' · nothing selected'}
                    </p>
                </div>

                <span
                    className={cn('shrink-0 font-mono text-sm font-bold', getHealthColor(health.healthScore))}
                    title={`${health.seeders} seeders · ${health.leechers} leechers`}
                >
                    {health.healthScore}%
                </span>

                {item.status === 'duplicate' && (
                    <Badge variant="outline" className="shrink-0 border-warning text-warning">
                        Duplicate
                    </Badge>
                )}
                {item.status === 'error' && (
                    <Badge variant="outline" className="shrink-0 border-danger text-danger">
                        Failed
                    </Badge>
                )}

                <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove(item.localId)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation()
                            onRemove(item.localId)
                        }
                    }}
                    aria-label={`Remove ${analysis.fileName}`}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                >
                    <X className="h-4 w-4" />
                </span>
            </button>

            {item.error && (
                <p
                    className={cn(
                        'border-t border-border px-4 py-2 text-xs',
                        item.status === 'duplicate' ? 'text-warning' : 'text-danger'
                    )}
                >
                    {item.error}
                </p>
            )}

            {/* Expanded body */}
            {item.expanded && (
                <div className="space-y-4 border-t border-border p-4">
                    {/* Hash + stats */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                            {formatInfoHash(analysis.infoHash, 12)}
                        </span>
                        <button
                            onClick={handleCopyHash}
                            aria-label={copied ? 'Hash copied' : 'Copy hash'}
                            aria-pressed={copied}
                            className="text-muted-foreground transition-colors hover:text-primary"
                        >
                            {copied ? (
                                <Check className="h-3.5 w-3.5 text-primary" />
                            ) : (
                                <Copy className="h-3.5 w-3.5" />
                            )}
                        </button>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                            {formatFileSize(analysis.totalSizeInBytes)} total
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="flex flex-col gap-1 rounded-lg border border-border bg-background/40 p-3">
                            <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <Activity className="h-3.5 w-3.5" /> Health
                            </span>
                            <span className={cn('font-mono text-lg font-bold', getHealthColor(health.healthScore))}>
                                {health.healthScore}%
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 rounded-lg border border-border bg-background/40 p-3">
                            <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <ArrowUp className="h-3.5 w-3.5" /> Seeders
                            </span>
                            <span className="font-mono text-lg font-bold text-primary">
                                {health.seeders.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 rounded-lg border border-border bg-background/40 p-3">
                            <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <ArrowDown className="h-3.5 w-3.5" /> Leechers
                            </span>
                            <span className="font-mono text-lg font-bold text-warning">
                                {health.leechers.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {destinationSlot}

                    {/* File list */}
                    <div className="overflow-hidden rounded-lg border border-border">
                        <div className="flex items-center justify-between border-b border-border bg-background/50 px-3 py-2">
                            <span className="text-sm font-semibold text-muted-foreground">
                                Files
                                <span className="ml-2 text-xs font-normal">
                                    ({item.selectedFilePaths.length}/{analysis.files.length} selected)
                                </span>
                            </span>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => onSelectAll(item.localId)}
                                >
                                    Select All
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => onDeselectAll(item.localId)}
                                >
                                    Deselect All
                                </Button>
                            </div>
                        </div>

                        <div className="max-h-[360px] space-y-0.5 overflow-y-auto p-2">
                            {analysis.files.map((file) => {
                                const isSelected = item.selectedFilePaths.includes(file.path)
                                return (
                                    <div
                                        key={file.index}
                                        onClick={() => onToggleFile(item.localId, file.path)}
                                        className={cn(
                                            'flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 transition-colors',
                                            isSelected
                                                ? 'border border-primary/10 bg-primary/5'
                                                : 'border border-transparent hover:bg-white/5'
                                        )}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onToggleFile(item.localId, file.path)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-primary"
                                            />
                                            {getFileIcon(file.path)}
                                            <span
                                                className={cn(
                                                    'truncate text-sm',
                                                    isSelected
                                                        ? 'font-medium text-foreground'
                                                        : 'text-muted-foreground'
                                                )}
                                            >
                                                {file.path}
                                            </span>
                                        </div>
                                        <span
                                            className={cn(
                                                'ml-3 shrink-0 font-mono text-xs',
                                                isSelected
                                                    ? 'font-bold text-foreground'
                                                    : 'text-muted-foreground'
                                            )}
                                        >
                                            {formatFileSize(file.size)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
