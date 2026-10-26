'use client'

import { formatFileSize } from '@/lib/utils/formatters'
import { getJobPhaseProgress } from '@/lib/utils/job-progress'
import type { Job } from '@/types/jobs'
import { Download, Upload, Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobProgressCardProps {
    job: Job
}

export function JobProgressCard({ job }: JobProgressCardProps) {
    const {
        isDownloadingPhase: isDownloading,
        isUploadingPhase: isUploading,
        isUploadFailed,
        isCompleted,
        downloadPct,
        uploadPct,
        downloadSpeed,
        uploadSpeed,
    } = getJobPhaseProgress(job)

    const downloadLabel = downloadPct === 100 ? 'Completed' : isDownloading ? 'In Progress' : 'Pending'
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
