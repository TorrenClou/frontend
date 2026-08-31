'use client'

import { Suspense, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { JobCard } from '@/components/jobs/job-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { Upload, Search, TrendingUp, CheckCircle, XCircle, Clock, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { StatsCard } from '@/components/shared'
import { useJobs, useJobStatistics } from '@/hooks/useJobs'
import { useJobsStore } from '@/stores/jobsStore'
import { JobStatus } from '@/types/enums'
import { statusLabels } from '@/types/jobs'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'
import type { UserJob } from '@/types/api'
import type { Job } from '@/types/jobs'

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
        // Use requestFileName as primary identifier (fallback to job ID)
        fileName: job.requestFileName ?? undefined,
        storageProfileName: job.storageProfileName ?? undefined,
        createdAt: job.createdAt,
    }
}

function JobsListContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    // Zustand store for filters and pagination
    const {
        selectedStatus,
        setSelectedStatus,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
    } = useJobsStore()

    // React Query hooks for fetching jobs list and statistics
    const { data, isLoading, error, refetch } = useJobs()
    const { data: jobStats } = useJobStatistics()

    // Build status filters dynamically from backend statistics
    const statusFilters = useMemo(() => {
        // Always include an "All" option implemented purely on the frontend
        const filters: { label: string; value: string }[] = [
            { label: 'All', value: 'all' },
        ]

        if (!jobStats?.statusFilters) {
            return filters
        }

        for (const sf of jobStats.statusFilters) {
            const statusKey = sf.status as JobStatus
            const baseLabel = statusLabels[statusKey] ?? sf.status
            filters.push({
                label: `${baseLabel} (${sf.count})`,
                value: sf.status,
            })
        }

        return filters
    }, [jobStats?.statusFilters])

    // Sync URL params with store on mount
    useEffect(() => {
        const urlStatus = searchParams.get('status')
        const urlPage = parseInt(searchParams.get('page') || '1', 10)
        const urlSize = parseInt(searchParams.get('size') || '10', 10)

        if (urlStatus && urlStatus !== 'all') {
            setSelectedStatus(urlStatus as JobStatus)
        }
        if (urlPage !== currentPage) {
            setCurrentPage(urlPage)
        }
        if (urlSize !== pageSize) {
            setPageSize(urlSize)
        }
    }, []) // Only on mount

    // Read search from URL (local state, not in Zustand)
    const search = searchParams.get('q') || ''

    // Update URL with filters
    const updateFilters = (updates: Record<string, string | number | null>) => {
        const params = new URLSearchParams(searchParams.toString())

        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === '' || value === 'all' || (key === 'page' && value === 1) || (key === 'size' && value === 10)) {
                params.delete(key)
            } else {
                params.set(key, String(value))
            }
        })

        const queryString = params.toString()
        router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
    }

    // Handle status filter change
    const handleStatusChange = (status: string) => {
        const newStatus = status === 'all' ? null : status as JobStatus
        setSelectedStatus(newStatus)
        updateFilters({ status, page: 1 })
    }

    // Handle page change
    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        updateFilters({ page })
    }

    // Handle page size change
    const handlePageSizeChange = (size: number) => {
        setPageSize(size)
        updateFilters({ size, page: 1 })
    }

    // Use backend statistics for global counts
    const stats = {
        total: jobStats?.totalJobs ?? 0,
        active: jobStats?.activeJobs ?? 0,
        completed: jobStats?.completedJobs ?? 0,
        failed: jobStats?.failedJobs ?? 0,
    }

    // Filter by search (client-side since API may not support search)
    const filteredItems = useMemo(() => {
        if (!data?.items) return []
        return data.items.filter((job) => {
            const matchesSearch = !search ||
                job.requestFileName?.toLowerCase().includes(search.toLowerCase())
            return matchesSearch
        })
    }, [data?.items, search])

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Jobs</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage and track your download jobs
                        </p>
                    </div>
                </div>
                <Card className="border-danger/50">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="h-12 w-12 text-danger mx-auto mb-4" />
                        <p className="text-danger mb-4">
                            {error instanceof Error ? error.message : 'Failed to load jobs'}
                        </p>
                        <Button onClick={() => refetch()} variant="outline" size="sm">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Jobs</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage and track your download jobs
                    </p>
                </div>
                <Button asChild size="lg">
                    <Link href="/torrents/upload">
                        <Upload className="mr-2 h-5 w-5" />
                        New Job
                    </Link>
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Jobs"
                    value={stats.total}
                    icon={TrendingUp}
                    color="primary"
                />
                <StatsCard
                    title="Active"
                    value={stats.active}
                    icon={Clock}
                    color="info"
                />
                <StatsCard
                    title="Completed"
                    value={stats.completed}
                    icon={CheckCircle}
                    color="success"
                />
                <StatsCard
                    title="Failed"
                    value={stats.failed}
                    icon={XCircle}
                    color="danger"
                />
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative w-full lg:max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by file name..."
                                value={search}
                                onChange={(e) => updateFilters({ q: e.target.value, page: 1 })}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {statusFilters.map((filter) => (
                                <Button
                                    key={filter.value}
                                    variant={(selectedStatus === null && filter.value === 'all') || selectedStatus === filter.value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleStatusChange(filter.value)}
                                    className={cn(
                                        ((selectedStatus === null && filter.value === 'all') || selectedStatus === filter.value) && 'shadow-md'
                                    )}
                                >
                                    {filter.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Jobs List */}
            {filteredItems.length === 0 ? (
                <EmptyState
                    icon={Upload}
                    title="No jobs found"
                    description={
                        selectedStatus !== null || search
                            ? "Try adjusting your filters or search term"
                            : "Upload your first torrent to get started"
                    }
                    action={
                        selectedStatus === null && !search
                            ? { label: 'Upload Torrent', onClick: () => router.push('/torrents/upload') }
                            : undefined
                    }
                />
            ) : (
                <div className="space-y-4">
                    {filteredItems.map((job) => (
                        <JobCard key={job.id} job={toUserJob(job)} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {data && data.totalCount > 0 && (
                <Pagination
                    totalItems={data.totalCount}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            )}
        </div>
    )
}

export default function JobsListPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <JobsListContent />
        </Suspense>
    )
}
