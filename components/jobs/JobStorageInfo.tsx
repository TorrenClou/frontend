'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, HardDrive } from 'lucide-react'
import type { Job } from '@/types/jobs'

interface JobStorageInfoProps {
    job: Job
}

export function JobStorageInfo({ job }: JobStorageInfoProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <HardDrive className="h-4 w-4" />
                    Storage
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="font-medium">{job.storageProfileName || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">Google Drive</p>

                {job.wasRerouted && (
                    <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        Moved from {job.originalStorageProfileName ?? 'the original drive'}
                        <ArrowRight className="h-3 w-3" />
                        {job.storageProfileName}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
