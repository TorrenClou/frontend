'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    AlertCircle,
    Loader2,
    User,
    Settings,
    RefreshCw,
    Zap,
    CheckCircle,
    XCircle,
    Clock,
    Download,
    Upload,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { useJobTimeline } from '@/hooks/useJobs'
import { JobStatus } from '@/types/enums'
import { StatusChangeSource } from '@/types/jobs'
import { formatDateTime, formatRelativeTime } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

const statusColors: Record<JobStatus, { bg: string; text: string; border: string }> = {
    [JobStatus.QUEUED]: { bg: 'bg-warning/20', text: 'text-warning-medium', border: 'border-warning/60' },
    [JobStatus.DOWNLOADING]: { bg: 'bg-info/20', text: 'text-info-medium', border: 'border-info/60' },
    [JobStatus.PENDING_UPLOAD]: { bg: 'bg-warning/20', text: 'text-warning-medium', border: 'border-warning/60' },
    [JobStatus.UPLOADING]: { bg: 'bg-info/20', text: 'text-info-medium', border: 'border-info/60' },
    [JobStatus.TORRENT_DOWNLOAD_RETRY]: { bg: 'bg-warning/20', text: 'text-warning-medium', border: 'border-warning/60' },
    [JobStatus.UPLOAD_RETRY]: { bg: 'bg-warning/20', text: 'text-warning-medium', border: 'border-warning/60' },
    [JobStatus.COMPLETED]: { bg: 'bg-success/20', text: 'text-success-medium', border: 'border-success/60' },
    [JobStatus.FAILED]: { bg: 'bg-danger/20', text: 'text-danger-medium', border: 'border-danger/60' },
    [JobStatus.CANCELLED]: { bg: 'bg-surface-300', text: 'text-muted-foreground', border: 'border-surface-200' },
    [JobStatus.TORRENT_FAILED]: { bg: 'bg-danger/20', text: 'text-danger-medium', border: 'border-danger/60' },
    [JobStatus.UPLOAD_FAILED]: { bg: 'bg-danger/20', text: 'text-danger-medium', border: 'border-danger/60' },
    [JobStatus.GOOGLE_DRIVE_FAILED]: { bg: 'bg-danger/20', text: 'text-danger-medium', border: 'border-danger/60' },
}

const statusIcons: Record<JobStatus, React.ReactNode> = {
    [JobStatus.QUEUED]: <Clock className="h-3.5 w-3.5" />,
    [JobStatus.DOWNLOADING]: <Download className="h-3.5 w-3.5" />,
    [JobStatus.PENDING_UPLOAD]: <Clock className="h-3.5 w-3.5" />,
    [JobStatus.UPLOADING]: <Upload className="h-3.5 w-3.5" />,
    [JobStatus.TORRENT_DOWNLOAD_RETRY]: <RefreshCw className="h-3.5 w-3.5" />,
    [JobStatus.UPLOAD_RETRY]: <RefreshCw className="h-3.5 w-3.5" />,
    [JobStatus.COMPLETED]: <CheckCircle className="h-3.5 w-3.5" />,
    [JobStatus.FAILED]: <XCircle className="h-3.5 w-3.5" />,
    [JobStatus.CANCELLED]: <XCircle className="h-3.5 w-3.5" />,
    [JobStatus.TORRENT_FAILED]: <XCircle className="h-3.5 w-3.5" />,
    [JobStatus.UPLOAD_FAILED]: <XCircle className="h-3.5 w-3.5" />,
    [JobStatus.GOOGLE_DRIVE_FAILED]: <AlertCircle className="h-3.5 w-3.5" />,
}

const sourceIcons: Record<StatusChangeSource, React.ReactNode> = {
    [StatusChangeSource.Worker]: <Zap className="h-3 w-3" />,
    [StatusChangeSource.User]: <User className="h-3 w-3" />,
    [StatusChangeSource.System]: <Settings className="h-3 w-3" />,
    [StatusChangeSource.Recovery]: <RefreshCw className="h-3 w-3" />,
}

function formatDuration(duration: string | null): string {
    if (!duration) return 'N/A'

    if (/^\d{2}:\d{2}:\d{2}$/.test(duration)) {
        const [hours, minutes, seconds] = duration.split(':').map(Number)
        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
        if (minutes > 0) return `${minutes}m ${seconds}s`
        return `${seconds}s`
    }

    if (duration.startsWith('PT')) {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
        if (match) {
            const hours = parseInt(match[1] || '0', 10)
            const minutes = parseInt(match[2] || '0', 10)
            const seconds = parseInt(match[3] || '0', 10)
            if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
            if (minutes > 0) return `${minutes}m ${seconds}s`
            return `${seconds}s`
        }
    }

    return duration
}

function parseMetadata(metadataJson: string | null): Record<string, any> | null {
    if (!metadataJson) return null
    try {
        return JSON.parse(metadataJson)
    } catch {
        return null
    }
}

interface JobTimelineProps {
    jobId: number
}

const TIMELINE_PAGE_SIZE = 10

export function JobTimeline({ jobId }: JobTimelineProps) {
    const [pageNumber, setPageNumber] = useState(1)
    const { data, isLoading, error } = useJobTimeline(jobId, pageNumber, TIMELINE_PAGE_SIZE)

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error || !data || data.items.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        {error ? 'Failed to load timeline' : 'No timeline data available'}
                    </div>
                </CardContent>
            </Card>
        )
    }

    const { items: timeline, totalPages, hasPreviousPage, hasNextPage } = data

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {timeline.map((entry, index) => {
                        const isLast = index === timeline.length - 1
                        const toStatus = entry.toStatus as JobStatus
                        const fromStatus = entry.fromStatus as JobStatus | null
                        const statusColor = statusColors[toStatus] || statusColors[JobStatus.QUEUED]
                        const statusIcon = statusIcons[toStatus] || statusIcons[JobStatus.QUEUED]
                        const sourceIcon = sourceIcons[entry.source]
                        const metadata = parseMetadata(entry.metadataJson)
                        const isError = !!entry.errorMessage
                        const isInitial = entry.fromStatus === null

                        return (
                            <div key={index} className="relative">
                                {!isLast && (
                                    <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-border" />
                                )}

                                <div className="flex items-start gap-3">
                                    <div
                                        className={cn(
                                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                                            statusColor.bg,
                                            statusColor.border,
                                            statusColor.text
                                        )}
                                    >
                                        {statusIcon}
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium">
                                                {isInitial
                                                    ? `Job created: ${toStatus}`
                                                    : `${fromStatus} → ${toStatus}`}
                                            </span>
                                            <TooltipProvider delayDuration={100}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            {sourceIcon}
                                                            <span>{entry.sourceName}</span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Source: {entry.sourceName}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                            <TooltipProvider delayDuration={100}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help">
                                                            {formatDateTime(entry.changedAt)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{formatRelativeTime(entry.changedAt)}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            {entry.durationFromPrevious && (
                                                <span className="text-xs font-mono">
                                                    · {formatDuration(entry.durationFromPrevious)}
                                                </span>
                                            )}
                                        </div>

                                        {isError && entry.errorMessage && (
                                            <div className="mt-2 p-2.5 rounded-md bg-danger/10 border border-danger/30">
                                                <div className="flex items-start gap-2">
                                                    <AlertCircle className="h-4 w-4 text-danger-medium shrink-0 mt-0.5" />
                                                    <p className="text-xs text-danger-light">{entry.errorMessage}</p>
                                                </div>
                                            </div>
                                        )}

                                        {metadata && Object.keys(metadata).length > 0 && (
                                            <div className="mt-2 text-xs text-muted-foreground">
                                                <details className="cursor-pointer">
                                                    <summary className="hover:text-foreground">View details</summary>
                                                    <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                                                        {JSON.stringify(metadata, null, 2)}
                                                    </pre>
                                                </details>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                            disabled={!hasPreviousPage}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Prev
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            Page {pageNumber} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageNumber((p) => p + 1)}
                            disabled={!hasNextPage}
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}