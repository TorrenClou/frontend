'use client'

import { JobCard } from '@/components/jobs/job-card'
import { StatsCard } from '@/components/shared/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Upload,
  FolderOpen,
  HardDrive,
  Loader2,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { useJobs, useJobStatistics } from '@/hooks/useJobs'
import type { UserJob } from '@/types/api'
import type { Job } from '@/types/jobs'
import { JobStatus } from '@/types/enums'

function toUserJob(job: Job): UserJob {
  return {
    id: job.id,
    storageProfileId: job.storageProfileId,
    status: job.status as JobStatus,
    type: job.type as any,
    requestFileId: job.requestFileId,
    errorMessage: job.errorMessage ?? undefined,
    currentState: job.currentState ?? undefined,
    startedAt: job.startedAt ?? undefined,
    completedAt: job.completedAt ?? undefined,
    bytesDownloaded: job.bytesDownloaded,
    totalBytes: job.totalBytes,
    selectedFilePaths: job.selectedFilePaths,
    progress: job.progressPercentage,
    fileName: job.requestFileName ?? undefined,
    storageProfileName: job.storageProfileName ?? undefined,
  }
}

export default function DashboardPage() {
  const { data: jobsData, isLoading: jobsLoading } = useJobs({ pageSize: 5, status: null })
  const { data: jobStats, isLoading: statsLoading } = useJobStatistics()

  const recentJobs = jobsData?.items ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your active and completed cloud transfers
          </p>
        </div>
        <Button asChild size="lg" className="self-start sm:self-auto">
          <Link href="/torrents/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Torrent
          </Link>
        </Button>
      </div>

      {/* Unified Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Jobs"
          value={jobStats?.totalJobs ?? 0}
          icon={TrendingUp}
          color="primary"
          loading={statsLoading}
        />
        <StatsCard
          title="Active Transfers"
          value={jobStats?.activeJobs ?? 0}
          icon={Clock}
          color="info"
          loading={statsLoading}
        />
        <StatsCard
          title="Completed"
          value={jobStats?.completedJobs ?? 0}
          icon={CheckCircle}
          color="success"
          loading={statsLoading}
        />
        <StatsCard
          title="Failed"
          value={jobStats?.failedJobs ?? 0}
          icon={XCircle}
          color="danger"
          loading={statsLoading}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button asChild className="h-auto flex-col gap-2 py-4">
              <Link href="/torrents/upload">
                <Upload className="h-5 w-5" />
                <span>Upload Torrent</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/jobs">
                <FolderOpen className="h-5 w-5" />
                <span>View All Jobs</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/storage">
                <HardDrive className="h-5 w-5" />
                <span>Manage Storage</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card>
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-semibold">Recent Jobs</h2>
          {recentJobs.length > 0 && (
            <Link href="/jobs" className="text-sm font-medium text-primary hover:underline">
              View All
            </Link>
          )}
        </div>
        <CardContent className="pt-0">
          {jobsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No jobs yet</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/torrents/upload">Upload Torrent</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <JobCard key={job.id} job={toUserJob(job)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}