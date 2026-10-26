'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CompactTransferRow } from '@/components/jobs/CompactTransferRow'
import { StatsCard } from '@/components/shared/StatsCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Upload,
    FolderOpen,
    HardDrive,
    Loader2,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    Clock,
    Search,
    ArrowRight,
    RefreshCw,
} from 'lucide-react'
import {
    useJobs,
    useJobStatistics,
    useRetryJob,
    useForceStartJob,
    useCancelJob,
    useRetryFailedJobs,
} from '@/hooks/useJobs'
import { formatFileSize, formatTransferSpeed } from '@/lib/utils/formatters'
import type { JobPhaseFilter } from '@/types/jobs'
import { cn } from '@/lib/utils'

const RECENT_PHASE_TABS: Array<{ id: JobPhaseFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'failed', label: 'Failed' },
    { id: 'completed', label: 'Completed' },
]

export default function DashboardPage() {
    const router = useRouter()
    const [recentPhase, setRecentPhase] = useState<JobPhaseFilter>('all')
    const [quickSearch, setQuickSearch] = useState('')

    const { data: jobsData, isLoading: jobsLoading } = useJobs({
        pageNumber: 1,
        pageSize: 6,
        phase: recentPhase !== 'all' ? recentPhase : undefined,
        status: null,
    })
    const { data: jobStats, isLoading: statsLoading } = useJobStatistics()

    const retryJobMutation = useRetryJob()
    const forceStartMutation = useForceStartJob()
    const cancelJobMutation = useCancelJob()
    const retryAllFailedMutation = useRetryFailedJobs()

    const recentJobs = jobsData?.items ?? []

    const liveDownSpeed = formatTransferSpeed(jobStats?.totalDownloadSpeedBytesPerSecond)
    const liveUpSpeed = formatTransferSpeed(jobStats?.totalUploadSpeedBytesPerSecond)

    const activeSubtitle = useMemo(() => {
        if (liveDownSpeed || liveUpSpeed) {
            return (
                <span className="inline-flex items-center gap-2 font-mono tabular-nums text-xs">
                    {liveDownSpeed && <span className="text-primary-100">↓ {liveDownSpeed}</span>}
                    {liveUpSpeed && <span className="text-info-light">↑ {liveUpSpeed}</span>}
                </span>
            )
        }
        return (
            <span className="tabular-nums">
                {`${jobStats?.downloadingJobs ?? 0} dl · ${(jobStats?.uploadingJobs ?? 0) + (jobStats?.pendingUploadJobs ?? 0)} ul`}
            </span>
        )
    }, [liveDownSpeed, liveUpSpeed, jobStats])

    const completedSubtitle = useMemo(() => {
        const bytes = jobStats?.totalBytesTransferred ?? 0
        return (
            <span className="tabular-nums">
                {bytes > 0 ? `${formatFileSize(bytes)} transferred` : 'All transfers delivered'}
            </span>
        )
    }, [jobStats?.totalBytesTransferred])

    const failedSubtitle = useMemo(() => {
        const retrying = jobStats?.retryingJobs ?? 0
        const stalled = jobStats?.stalledJobs ?? 0
        return (
            <span className="tabular-nums">
                {`${retrying} retrying · ${stalled} stalled`}
            </span>
        )
    }, [jobStats?.retryingJobs, jobStats?.stalledJobs])

    const handleQuickSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = quickSearch.trim()
        if (trimmed) {
            router.push(`/jobs?q=${encodeURIComponent(trimmed)}`)
        } else {
            router.push('/jobs')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        Dashboard
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Live overview of two-stage cloud transfers and storage pipeline
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    {(jobStats?.failedJobs ?? 0) > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => retryAllFailedMutation.mutate({})}
                            disabled={retryAllFailedMutation.isPending}
                            className="border-danger/30 bg-danger/10 text-danger-light hover:bg-danger/20 tabular-nums h-9"
                        >
                            {retryAllFailedMutation.isPending ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Retry Failed ({jobStats?.failedJobs})
                        </Button>
                    )}
                    <Button asChild variant="outline" size="sm" className="h-9 border-surface-300/60 bg-surface-500/60">
                        <Link href="/storage">
                            <HardDrive className="mr-1.5 h-3.5 w-3.5" />
                            Storage
                        </Link>
                    </Button>
                    <Button asChild size="sm" className="h-9">
                        <Link href="/torrents/upload">
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                            Upload Torrent
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Restrained KPI Stats Cards */}
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Jobs"
                    value={jobStats?.totalJobs ?? 0}
                    subtitle="Open full jobs console"
                    icon={TrendingUp}
                    color="primary"
                    loading={statsLoading}
                    href="/jobs"
                />
                <StatsCard
                    title="Active Transfers"
                    value={jobStats?.activeJobs ?? 0}
                    subtitle={activeSubtitle}
                    icon={Clock}
                    color="info"
                    loading={statsLoading}
                    href="/jobs?phase=active"
                />
                <StatsCard
                    title="Completed"
                    value={jobStats?.completedJobs ?? 0}
                    subtitle={completedSubtitle}
                    icon={CheckCircle2}
                    color="success"
                    loading={statsLoading}
                    href="/jobs?phase=completed"
                />
                <StatsCard
                    title="Failed"
                    value={jobStats?.failedJobs ?? 0}
                    subtitle={failedSubtitle}
                    icon={AlertCircle}
                    color="danger"
                    loading={statsLoading}
                    href="/jobs?phase=failed"
                />
            </div>

            {/* Recent Transfers Activity Stream */}
            <Card className="rounded-xl border border-surface-300/50 bg-surface-500/70 backdrop-blur-xs">
                <div className="flex flex-col gap-3 p-4 sm:p-5 border-b border-surface-300/30 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-base font-semibold tracking-tight text-foreground">
                            Recent Transfers
                        </h2>
                        {/* Phase Segmented Control */}
                        <div
                            className="inline-flex items-center gap-1 rounded-lg bg-surface-400/50 p-1 border border-surface-300/30"
                            role="group"
                            aria-label="Filter recent jobs by phase"
                        >
                            {RECENT_PHASE_TABS.map((tab) => {
                                const active = recentPhase === tab.id
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => setRecentPhase(tab.id)}
                                        className={cn(
                                            'rounded-md px-2.5 py-1 text-xs font-medium select-none transition-all duration-150 ease-out-quart',
                                            active
                                                ? 'bg-surface-300/80 text-foreground shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <form
                            onSubmit={handleQuickSearchSubmit}
                            className="relative w-full sm:w-56"
                        >
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={quickSearch}
                                onChange={(e) => setQuickSearch(e.target.value)}
                                placeholder="Search transfers..."
                                className="h-8 pl-8 text-xs bg-surface-400/40 border-surface-300/40 focus:border-primary/50"
                            />
                        </form>
                        <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-primary hover:text-primary-100 shrink-0">
                            <Link
                                href={
                                    recentPhase !== 'all'
                                        ? `/jobs?phase=${recentPhase}`
                                        : '/jobs'
                                }
                            >
                                All Jobs
                                <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </div>
                </div>

                <CardContent className="p-4 sm:p-5 pt-4">
                    {jobsLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : recentJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FolderOpen className="mb-2.5 h-10 w-10 text-muted-foreground/60" />
                            <p className="text-sm text-muted-foreground">
                                {recentPhase === 'all'
                                    ? 'No transfer jobs yet'
                                    : `No ${recentPhase} transfers found`}
                            </p>
                            {recentPhase === 'all' ? (
                                <Button asChild variant="outline" size="sm" className="mt-3.5 h-8 text-xs">
                                    <Link href="/torrents/upload">Upload Torrent</Link>
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-3.5 h-8 text-xs"
                                    onClick={() => setRecentPhase('all')}
                                >
                                    Show All
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentJobs.map((job) => (
                                <CompactTransferRow
                                    key={job.id}
                                    job={job}
                                    onRetry={(jobId) => retryJobMutation.mutate({ jobId })}
                                    onForceStart={(jobId) => forceStartMutation.mutate(jobId)}
                                    onCancel={(jobId) => cancelJobMutation.mutate(jobId)}
                                    isRetrying={
                                        retryJobMutation.isPending &&
                                        retryJobMutation.variables?.jobId === job.id
                                    }
                                    isForceStarting={
                                        forceStartMutation.isPending &&
                                        forceStartMutation.variables === job.id
                                    }
                                    isCancelling={
                                        cancelJobMutation.isPending &&
                                        cancelJobMutation.variables === job.id
                                    }
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
