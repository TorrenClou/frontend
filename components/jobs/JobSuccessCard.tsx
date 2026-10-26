'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, HardDrive } from 'lucide-react'
import Link from 'next/link'
import type { Job } from '@/types/jobs'

interface JobSuccessCardProps {
    job: Job
}

export function JobSuccessCard({ job }: JobSuccessCardProps) {
    return (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    Transfer Complete
                </CardTitle>
                <CardDescription>
                    Your files have been uploaded to {job.storageProfileName || 'your cloud storage'}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/storage/${job.storageProfileId}`}>
                        <HardDrive className="mr-2 h-4 w-4" />
                        View {job.storageProfileName || 'Storage Profile'}
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}
