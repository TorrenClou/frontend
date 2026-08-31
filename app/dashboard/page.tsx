'use client'

import { JobCard } from '@/components/jobs/job-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FolderOpen, HardDrive, Loader2, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { useJobs, useJobStatistics } from '@/hooks/useJobs'
import type { UserJob } from '@/types/api'
import type { Job } from '@/types/jobs'
import { JobStatus } from '@/types/enums'

// Adapter function to convert Job to UserJob format for JobCard
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
  // Fetch recent jobs using local params — does NOT mutate the shared jobs store
  const { data: jobsData, isLoading: jobsLoading } = useJobs({ pageSize: 5, status: null })

  // Fetch job statistics from dedicated endpoint
  const { data: jobStats, isLoading: statsLoading } = useJobStatistics()

  // Get recent jobs
  const recentJobs = jobsData?.items ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your downloads.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Total Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <p className="text-4xl font-bold">{jobStats?.totalJobs ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <p className="text-4xl font-bold">{jobStats?.activeJobs ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <p className="text-4xl font-bold">{jobStats?.completedJobs ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
              <XCircle className="h-4 w-4" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <p className="text-4xl font-bold">{jobStats?.failedJobs ?? 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button asChild className="h-auto flex-col gap-2 py-4">
              <Link href="/torrents/upload">
                <Upload className="h-6 w-6" />
                <span>Upload Torrent</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/jobs">
                <FolderOpen className="h-6 w-6" />
                <span>View Jobs</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/storage">
                <HardDrive className="h-6 w-6" />
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
            <Link href="/jobs" className="text-sm text-primary hover:underline">
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
              <p className="text-muted-foreground">No jobs yet. Upload a torrent to get started!</p>
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
