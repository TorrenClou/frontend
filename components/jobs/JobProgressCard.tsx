'use client'

import { formatFileSize, formatTransferSpeed } from '@/lib/utils/formatters'
import type { Job } from '@/types/jobs'
import { JobStatus } from '@/types/enums'
import { Download, Upload, Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobProgressCardProps {
    job: Job
}

export function JobProgressCard({ job }: JobProgressCardProps) {
    const status = job.status as JobStatus

    const isDownloading = [JobStatus.DOWNLOADING, JobStatus.TORRENT_DOWNLOAD_RETRY].includes(status)
    // GOOGLE_DRIVE_FAILED is its own terminal error state — not an active upload
    const isUploading = [JobStatus.UPLOADING, JobStatus.UPLOAD_RETRY].includes(status)
    const isUploadFailed = status === JobStatus.GOOGLE_DRIVE_FAILED
    const isPastDownload = [
        JobStatus.PENDING_UPLOAD,
        JobStatus.UPLOADING,
        JobStatus.UPLOAD_RETRY,
        JobStatus.GOOGLE_DRIVE_FAILED,
        JobStatus.COMPLETED,
    ].includes(status)
    const isCompleted = status === JobStatus.COMPLETED

    // Sanitize progressPercentage to guard against NaN / undefined at runtime
    const rawDownloadPct = Number(job.progressPercentage)
    const safeDownloadPct = Number.isFinite(rawDownloadPct) ? Math.min(100, Math.max(0, rawDownloadPct)) : 0
    const rawUploadPct = Number(job.uploadProgressPercentage)
    const safeUploadPct = Number.isFinite(rawUploadPct) ? Math.min(100, Math.max(0, rawUploadPct)) : 0

    const downloadPct = isCompleted || isPastDownload ? 100 : isDownloading ? safeDownloadPct : 0
    const uploadPct = isCompleted ? 100 : isUploading ? safeUploadPct : 0

    const downloadLabel = downloadPct === 100 ? 'Completed' : isDownloading ? 'In Progress' : 'Pending'

    // Only shown while that phase is actually moving; a stale rate on a finished job
    // would look like it is still transferring.
    const downloadSpeed = isDownloading ? formatTransferSpeed(job.downloadSpeedBytesPerSecond) : null
    const uploadSpeed = isUploading ? formatTransferSpeed(job.uploadSpeedBytesPerSecond) : null
    const uploadLabel = uploadPct === 100 ? 'Completed' : isUploadFailed ? 'Upload Failed' : isUploading ? 'Uploading' : 'Pending'

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download card */}
            <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-3 right-3 opacity-[0.07] pointer-events-none">
                    <Download className="h-16 w-16" aria-hidden="true" />
                </div>
                <div className="relative flex flex-col gap-4">
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                Download Phase
                            </p>
                            <p className="text-2xl font-bold font-mono tabular-nums">
                                {downloadPct.toFixed(0)}%
                            </p>
                        </div>
                        <p className={cn(
                            'text-sm font-medium font-mono',
                            downloadPct === 100 ? 'text-primary' : 'text-info-medium'
                        )}>
                            {downloadLabel}
                        </p>
                    </div>

                    {/* Progress bar (compositor-only transform) */}
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full w-full bg-primary rounded-full transition-transform duration-500 ease-out-quint"
                            style={{ transform: `translateX(-${100 - downloadPct}%)` }}
                        />
                    </div>

                    <div className="flex justify-between items-center text-xs text-muted-foreground font-mono tabular-nums">
                        <span>
                            {formatFileSize(job.bytesDownloaded)} / {formatFileSize(job.totalBytes)}
                        </span>
                        {downloadSpeed && (
                            <span className="flex items-center gap-1 text-primary">
                                <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                                {downloadSpeed}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Upload card */}
            <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-3 right-3 opacity-[0.07] pointer-events-none">
                    <Upload className="h-16 w-16" aria-hidden="true" />
                </div>
                <div className="relative flex flex-col gap-4">
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                Upload Phase
                            </p>
                            <p className="text-2xl font-bold font-mono tabular-nums">
                                {uploadPct.toFixed(0)}%
                            </p>
                        </div>
                        <p className={cn(
                            'text-sm font-medium font-mono',
                            uploadPct === 100 ? 'text-primary' : isUploadFailed ? 'text-danger' : isUploading ? 'text-info-medium' : 'text-muted-foreground'
                        )}>
                            {uploadLabel}
                        </p>
                    </div>

                    {/* Progress bar (compositor-only transform) */}
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn(
                                'h-full w-full rounded-full transition-[transform,background-color] duration-500 ease-out-quint relative',
                                uploadPct === 100 ? 'bg-primary' : 'bg-info-medium'
                            )}
                            style={{ transform: `translateX(-${100 - uploadPct}%)` }}
                        />
                    </div>

                    <div className="flex justify-between items-center text-xs text-muted-foreground font-mono tabular-nums">
                        <span>
                            {formatFileSize(isCompleted ? job.totalBytes : job.bytesUploaded)} / {formatFileSize(job.totalBytes)}
                        </span>
                        {uploadSpeed && (
                            <span className="flex items-center gap-1 text-info-medium">
                                <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                                {uploadSpeed}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
