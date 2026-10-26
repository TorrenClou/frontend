'use client'

import * as React from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { formatFileSize, formatDateTime } from '@/lib/utils/formatters'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import type { Job } from '@/types/jobs'
import { getJobStatusConfig } from './JobStatusConfig'
import { JobStatus } from '@/types/enums'
import { Copy, Check, Cloud, Database, Layers, Hash, Calendar, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface JobDetailsCardProps {
    job: Job
    className?: string
}

function MetaItem({
    label,
    value,
    icon: Icon,
    className,
}: {
    label: string
    value: ReactNode
    icon?: React.ElementType
    className?: string
}) {
    return (
        <div className={cn('p-3 rounded-lg bg-surface-400/30 border border-surface-300/30 space-y-1', className)}>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {Icon && <Icon className="h-3 w-3 text-muted-foreground/70" />}
                <span>{label}</span>
            </div>
            <div className="text-xs sm:text-sm font-mono text-foreground break-all">
                {value}
            </div>
        </div>
    )
}

export function JobDetailsCard({ job, className }: JobDetailsCardProps) {
    const config = getJobStatusConfig(job.status as JobStatus)
    const { copied, copy } = useCopyToClipboard(1800)

    const isS3 = job.storageProviderType?.toLowerCase() === 's3' || job.storageProfileName?.toLowerCase().includes('s3')

    const totalFiles = job.totalFilesCount ?? (job.selectedFilePaths?.length || 0)
    const selectedFiles = job.selectedFilesCount ?? (job.selectedFilePaths?.length || 0)
    const isSelective =
        Boolean(job.isSelective) ||
        (totalFiles > 0 && selectedFiles > 0 && selectedFiles < totalFiles)

    const selectedFilesLabel = isSelective && totalFiles > 0
        ? `Selective: ${selectedFiles} of ${totalFiles} files`
        : totalFiles > 0
          ? `All ${totalFiles} files`
          : 'All files in torrent'

    const handleCopyHash = () => {
        if (!job.infoHash) return
        void copy(job.infoHash).then((ok) => {
            if (ok) toast.success('InfoHash copied to clipboard')
        })
    }

    return (
        <Card className={cn('rounded-xl border border-surface-300/50 bg-surface-500/70 backdrop-blur-xs overflow-hidden', className)}>
            <CardHeader className="p-4 sm:p-5 border-b border-surface-300/30 pb-3">
                <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary-100" />
                    <span>Transfer Specifications & Metadata</span>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <MetaItem
                        label="Job ID"
                        value={`#${job.id}`}
                        icon={Hash}
                    />

                    <MetaItem
                        label="Status"
                        value={
                            <span className="inline-flex items-center gap-1.5 font-sans font-medium text-xs">
                                <span className={cn('h-2 w-2 rounded-full', config.color.replace('text-', 'bg-'))} />
                                <span>{config.label}</span>
                            </span>
                        }
                    />

                    <MetaItem
                        label="Total Payload Size"
                        value={formatFileSize(job.totalBytes)}
                    />

                    <MetaItem
                        label="Storage Destination"
                        value={
                            <span className="inline-flex items-center gap-1 text-xs">
                                {isS3 ? (
                                    <Database className="h-3 w-3 text-warning-medium" />
                                ) : (
                                    <Cloud className="h-3 w-3 text-primary-200" />
                                )}
                                <span className="font-sans font-medium">
                                    {job.storageProfileName || 'Default Drive'}
                                </span>
                            </span>
                        }
                    />

                    <MetaItem
                        label="File Scope"
                        value={selectedFilesLabel}
                        icon={Layers}
                    />

                    <MetaItem
                        label="Created At"
                        value={
                            job.createdAt
                                ? formatDateTime(job.createdAt)
                                : '—'
                        }
                        icon={Calendar}
                    />

                    {job.infoHash && (
                        <div className="sm:col-span-2 lg:col-span-3 p-3 rounded-lg bg-surface-400/30 border border-surface-300/30 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                    <Hash className="h-3 w-3 text-muted-foreground/70" />
                                    <span>BitTorrent InfoHash</span>
                                </div>
                                <div className="text-xs font-mono text-foreground break-all select-all">
                                    {job.infoHash}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyHash}
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-mono select-none transition-colors border shrink-0',
                                    copied
                                        ? 'bg-success/15 border-success/30 text-success-medium'
                                        : 'bg-surface-400/60 border-surface-300/50 hover:bg-surface-300 text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-3.5 w-3.5 text-success-medium" />
                                        <span>Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
