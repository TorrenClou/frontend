'use client'

import * as React from 'react'
import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { JobCard } from '@/components/jobs/job-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { StatsCard } from '@/components/shared'
import {
    useJobs,
    useJobStatistics,
    useRetryJob,
    useForceStartJob,
    useCancelJob,
    useRetryFailedJobs,
    useBatchCancelJobs,
} from '@/hooks/useJobs'
import { useStorageProfiles } from '@/hooks/useStorageProfiles'
import { formatFileSize, formatTransferSpeed } from '@/lib/utils/formatters'
import type { JobPhaseFilter, JobQueryParameters, JobSortField, SortDirection } from '@/types/jobs'
import { cn } from '@/lib/utils'
import {
    Upload,
    Search,
    TrendingUp,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
    RefreshCw,
    AlertCircle,
    X,
    ChevronDown,
    HardDrive,
    Film,
    Calendar,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Pin,
    Shuffle,
    AlertTriangle,
    Layers,
    Sparkles,
    Ban,
    Check,
    Database,
    Cloud,
    Terminal,
} from 'lucide-react'

const QUICK_SEARCH_TOKENS = [
    { token: 'provider:s3', label: 'provider:s3' },
    { token: 'provider:gdrive', label: 'provider:gdrive' },
    { token: 'is:pinned', label: 'is:pinned' },
    { token: 'is:rerouted', label: 'is:rerouted' },
    { token: 'is:stalled', label: 'is:stalled' },
    { token: 'type:video', label: 'type:video' },
    { token: 'size:>50gb', label: 'size:>50gb' },
] as const

const CATEGORY_OPTIONS = [
    { value: '', label: 'All Categories' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Audio' },
    { value: 'archive', label: 'Archive' },
    { value: 'document', label: 'Document' },
    { value: 'software', label: 'Software' },
    { value: 'other', label: 'Other' },
] as const

const SIZE_BUCKET_OPTIONS = [
    { value: '', label: 'Any Size' },
    { value: 'small', label: 'Small (< 1 GB)' },
    { value: 'medium', label: 'Medium (1 – 10 GB)' },
    { value: 'large', label: 'Large (10 – 50 GB)' },
    { value: 'xl', label: 'XL (> 50 GB)' },
] as const

const DATE_RANGE_OPTIONS = [
    { value: '', label: 'Any Time' },
    { value: 'today', label: 'Today (24h)' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
] as const

const SORT_OPTIONS: Array<{ value: JobSortField; label: string }> = [
    { value: 'createdAt', label: 'Created Date' },
    { value: 'size', label: 'Total Size' },
    { value: 'progress', label: 'Transfer Progress' },
    { value: 'speed', label: 'Live Speed' },
    { value: 'name', label: 'File Name' },
    { value: 'completedAt', label: 'Completed Date' },
]

function toggleTokenInQuery(currentQuery: string, token: string): string {
    const parts = currentQuery
        .trim()
        .split(/\s+/)
        .filter(Boolean)
    const lowerToken = token.toLowerCase()
    const exists = parts.some((p) => p.toLowerCase() === lowerToken)
    if (exists) {
        return parts.filter((p) => p.toLowerCase() !== lowerToken).join(' ')
    }
    return [...parts, token].join(' ')
}

function hasTokenInQuery(currentQuery: string, token: string): boolean {
    return currentQuery
        .trim()
        .split(/\s+/)
        .some((p) => p.toLowerCase() === token.toLowerCase())
}

function JobsConsoleContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Parse URL query state
    const urlPhase = (searchParams.get('phase') || 'all') as JobPhaseFilter
    const urlStatus = searchParams.get('status') || null
    const urlSearch = searchParams.get('q') || searchParams.get('search') || ''
    const urlProvider = searchParams.get('provider') || null
    const urlProfileIdRaw = searchParams.get('storageProfileId')
    const urlProfileId = urlProfileIdRaw ? parseInt(urlProfileIdRaw, 10) : null
    const urlCategory = searchParams.get('category') || null
    const urlSizeBucket = searchParams.get('sizeBucket') || null
    const urlDateRange = searchParams.get('dateRange') || null
    const urlIsPinned = searchParams.get('isPinned') === 'true' ? true : null
    const urlWasRerouted = searchParams.get('wasRerouted') === 'true' ? true : null
    const urlIsStalled = searchParams.get('isStalled') === 'true' ? true : null
    const urlIsSelective = searchParams.get('isSelective') === 'true' ? true : null
    const urlHasError = searchParams.get('hasError') === 'true' ? true : null
    const urlSortBy = (searchParams.get('sortBy') || 'createdAt') as JobSortField
    const urlSortDir = (searchParams.get('sortDir') || 'desc') as SortDirection
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const urlPageSize = Math.max(1, parseInt(searchParams.get('size') || '10', 10) || 10)

    // Local search input state for snappy typing with 250ms debounce
    const [searchInput, setSearchInput] = useState(urlSearch)
    const [debouncedSearch, setDebouncedSearch] = useState(urlSearch)
    const [selectedJobIds, setSelectedJobIds] = useState<number[]>([])

    // Keep local search synced if URL changes externally (e.g., Clear Filters)
    useEffect(() => {
        setSearchInput(urlSearch)
        setDebouncedSearch(urlSearch)
    }, [urlSearch])

    // Update URL helper
    const updateUrlParams = useCallback(
        (
            updates: Record<string, string | number | boolean | null | undefined>,
            mode: 'push' | 'replace' = 'replace'
        ) => {
            const params = new URLSearchParams(searchParams.toString())
            // Normalize legacy 'search' param into 'q'
            params.delete('search')

            Object.entries(updates).forEach(([key, value]) => {
                if (
                    value === null ||
                    value === undefined ||
                    value === '' ||
                    value === false ||
                    (key === 'phase' && value === 'all') ||
                    (key === 'page' && value === 1) ||
                    (key === 'size' && value === 10) ||
                    (key === 'sortBy' && value === 'createdAt') ||
                    (key === 'sortDir' && value === 'desc')
                ) {
                    params.delete(key)
                } else {
                    params.set(key, String(value))
                }
            })

            const qs = params.toString()
            const target = qs ? `${pathname}?${qs}` : pathname
            if (mode === 'push') {
                router.push(target, { scroll: false })
            } else {
                router.replace(target, { scroll: false })
            }
        },
        [pathname, router, searchParams]
    )

    // Debounce search input -> URL & API query
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== urlSearch) {
                setDebouncedSearch(searchInput)
                updateUrlParams({ q: searchInput || null, page: 1 }, 'replace')
            }
        }, 250)
        return () => clearTimeout(timer)
    }, [searchInput, urlSearch, updateUrlParams])

    // '/' keyboard shortcut to focus search bar
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
            const active = document.activeElement
            if (
                active &&
                (active.tagName === 'INPUT' ||
                    active.tagName === 'TEXTAREA' ||
                    active.tagName === 'SELECT' ||
                    (active as HTMLElement).isContentEditable)
            ) {
                return
            }
            e.preventDefault()
            searchInputRef.current?.focus()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Build API query parameters
    const queryParams: JobQueryParameters = useMemo(
        () => ({
            pageNumber: urlPage,
            pageSize: urlPageSize,
            phase: urlPhase !== 'all' ? urlPhase : undefined,
            status: urlStatus,
            search: debouncedSearch || undefined,
            provider: urlProvider || undefined,
            storageProfileId: urlProfileId ?? undefined,
            category: urlCategory || undefined,
            sizeBucket: urlSizeBucket || undefined,
            dateRange: urlDateRange || undefined,
            isPinned: urlIsPinned ?? undefined,
            wasRerouted: urlWasRerouted ?? undefined,
            isStalled: urlIsStalled ?? undefined,
            isSelective: urlIsSelective ?? undefined,
            hasError: urlHasError ?? undefined,
            sortBy: urlSortBy,
            sortDir: urlSortDir,
        }),
        [
            urlPage,
            urlPageSize,
            urlPhase,
            urlStatus,
            debouncedSearch,
            urlProvider,
            urlProfileId,
            urlCategory,
            urlSizeBucket,
            urlDateRange,
            urlIsPinned,
            urlWasRerouted,
            urlIsStalled,
            urlIsSelective,
            urlHasError,
            urlSortBy,
            urlSortDir,
        ]
    )

    const { data, isLoading, isFetching, error, refetch } = useJobs(queryParams)
    const { data: jobStats } = useJobStatistics()
    const { data: storageProfiles } = useStorageProfiles()

    // Mutations for inline & batch actions
    const retryJobMutation = useRetryJob()
    const forceStartMutation = useForceStartJob()
    const cancelJobMutation = useCancelJob()
    const retryFailedBatchMutation = useRetryFailedJobs()
    const cancelBatchMutation = useBatchCancelJobs()

    const items = data?.items ?? []

    // Clear selection when page or filter changes
    useEffect(() => {
        setSelectedJobIds([])
    }, [
        urlPage,
        urlPhase,
        urlStatus,
        debouncedSearch,
        urlProvider,
        urlProfileId,
        urlCategory,
        urlSizeBucket,
        urlDateRange,
        urlIsPinned,
        urlWasRerouted,
        urlIsStalled,
        urlIsSelective,
        urlHasError,
    ])

    // Phase tabs with live counts from statistics
    const phaseTabs = useMemo(() => {
        const uploadingTotal =
            (jobStats?.uploadingJobs ?? 0) + (jobStats?.pendingUploadJobs ?? 0)
        return [
            { id: 'all', label: 'All', count: jobStats?.totalJobs ?? 0 },
            { id: 'active', label: 'Active', count: jobStats?.activeJobs ?? 0 },
            { id: 'downloading', label: 'Downloading', count: jobStats?.downloadingJobs ?? 0 },
            { id: 'uploading', label: 'Uploading', count: uploadingTotal },
            { id: 'queued', label: 'Queued', count: jobStats?.queuedJobs ?? 0 },
            { id: 'retrying', label: 'Retrying', count: jobStats?.retryingJobs ?? 0 },
            { id: 'completed', label: 'Completed', count: jobStats?.completedJobs ?? 0 },
            { id: 'failed', label: 'Failed', count: jobStats?.failedJobs ?? 0 },
            { id: 'cancelled', label: 'Cancelled', count: jobStats?.cancelledJobs ?? 0 },
        ]
    }, [jobStats])

    // Merge storage profiles from statistics and useStorageProfiles
    const destinationProfiles = useMemo(() => {
        const map = new Map<
            number,
            { id: number; name: string; providerType: string; count?: number }
        >()
        for (const p of storageProfiles ?? []) {
            map.set(p.id, {
                id: p.id,
                name: p.profileName,
                providerType: p.providerType,
            })
        }
        for (const pc of jobStats?.profileCounts ?? []) {
            const existing = map.get(pc.storageProfileId)
            map.set(pc.storageProfileId, {
                id: pc.storageProfileId,
                name: pc.profileName || existing?.name || `Profile #${pc.storageProfileId}`,
                providerType: pc.providerType || existing?.providerType || 'GoogleDrive',
                count: pc.count,
            })
        }
        return Array.from(map.values())
    }, [storageProfiles, jobStats?.profileCounts])

    // Destination label for dropdown trigger
    const selectedDestinationLabel = useMemo(() => {
        if (urlProfileId) {
            const found = destinationProfiles.find((p) => p.id === urlProfileId)
            return found ? `Drive: ${found.name}` : `Profile #${urlProfileId}`
        }
        if (urlProvider === 'GoogleDrive') return 'Provider: Google Drive'
        if (urlProvider === 'S3') return 'Provider: S3 Storage'
        return 'All Destinations'
    }, [urlProfileId, urlProvider, destinationProfiles])

    // Active filter chips for quick inspection & removal
    const activeFilterChips = useMemo(() => {
        const chips: Array<{ key: string; label: string; onRemove: () => void }> = []

        if (urlPhase && urlPhase !== 'all') {
            const tab = phaseTabs.find((t) => t.id === urlPhase)
            chips.push({
                key: 'phase',
                label: `Phase: ${tab?.label || urlPhase}`,
                onRemove: () => updateUrlParams({ phase: 'all', page: 1 }),
            })
        }
        if (urlStatus) {
            chips.push({
                key: 'status',
                label: `Status: ${urlStatus}`,
                onRemove: () => updateUrlParams({ status: null, page: 1 }),
            })
        }
        if (debouncedSearch) {
            chips.push({
                key: 'q',
                label: `Search: "${debouncedSearch}"`,
                onRemove: () => {
                    setSearchInput('')
                    setDebouncedSearch('')
                    updateUrlParams({ q: null, page: 1 })
                },
            })
        }
        if (urlProvider) {
            chips.push({
                key: 'provider',
                label: `Provider: ${urlProvider === 'GoogleDrive' ? 'Google Drive' : urlProvider}`,
                onRemove: () => updateUrlParams({ provider: null, page: 1 }),
            })
        }
        if (urlProfileId) {
            const prof = destinationProfiles.find((p) => p.id === urlProfileId)
            chips.push({
                key: 'storageProfileId',
                label: `Drive: ${prof?.name || `#${urlProfileId}`}`,
                onRemove: () => updateUrlParams({ storageProfileId: null, page: 1 }),
            })
        }
        if (urlCategory) {
            const cat = CATEGORY_OPTIONS.find((c) => c.value === urlCategory)
            chips.push({
                key: 'category',
                label: `Type: ${cat?.label || urlCategory}`,
                onRemove: () => updateUrlParams({ category: null, page: 1 }),
            })
        }
        if (urlSizeBucket) {
            const sb = SIZE_BUCKET_OPTIONS.find((s) => s.value === urlSizeBucket)
            chips.push({
                key: 'sizeBucket',
                label: `Size: ${sb?.label || urlSizeBucket}`,
                onRemove: () => updateUrlParams({ sizeBucket: null, page: 1 }),
            })
        }
        if (urlDateRange) {
            const dr = DATE_RANGE_OPTIONS.find((d) => d.value === urlDateRange)
            chips.push({
                key: 'dateRange',
                label: `Time: ${dr?.label || urlDateRange}`,
                onRemove: () => updateUrlParams({ dateRange: null, page: 1 }),
            })
        }
        if (urlIsPinned) {
            chips.push({
                key: 'isPinned',
                label: 'Pinned Only',
                onRemove: () => updateUrlParams({ isPinned: null, page: 1 }),
            })
        }
        if (urlWasRerouted) {
            chips.push({
                key: 'wasRerouted',
                label: 'Failover Rerouted',
                onRemove: () => updateUrlParams({ wasRerouted: null, page: 1 }),
            })
        }
        if (urlIsStalled) {
            chips.push({
                key: 'isStalled',
                label: 'Stalled Only',
                onRemove: () => updateUrlParams({ isStalled: null, page: 1 }),
            })
        }
        if (urlIsSelective) {
            chips.push({
                key: 'isSelective',
                label: 'Selective Files',
                onRemove: () => updateUrlParams({ isSelective: null, page: 1 }),
            })
        }
        if (urlHasError) {
            chips.push({
                key: 'hasError',
                label: 'Has Error',
                onRemove: () => updateUrlParams({ hasError: null, page: 1 }),
            })
        }

        return chips
    }, [
        urlPhase,
        phaseTabs,
        urlStatus,
        debouncedSearch,
        urlProvider,
        urlProfileId,
        destinationProfiles,
        urlCategory,
        urlSizeBucket,
        urlDateRange,
        urlIsPinned,
        urlWasRerouted,
        urlIsStalled,
        urlIsSelective,
        urlHasError,
        updateUrlParams,
    ])

    const hasActiveFilters = activeFilterChips.length > 0

    const clearAllFilters = () => {
        setSearchInput('')
        setDebouncedSearch('')
        router.replace(pathname, { scroll: false })
    }

    // Selection helpers
    const pageJobIds = useMemo(() => items.map((j) => j.id), [items])
    const allOnPageSelected =
        pageJobIds.length > 0 && pageJobIds.every((id) => selectedJobIds.includes(id))

    const handleToggleSelectAllOnPage = (checked: boolean) => {
        if (checked) {
            setSelectedJobIds((prev) => Array.from(new Set([...prev, ...pageJobIds])))
        } else {
            setSelectedJobIds((prev) => prev.filter((id) => !pageJobIds.includes(id)))
        }
    }

    const handleToggleSelectJob = (jobId: number, checked: boolean) => {
        setSelectedJobIds((prev) =>
            checked ? Array.from(new Set([...prev, jobId])) : prev.filter((id) => id !== jobId)
        )
    }

    // Live aggregate speeds for KPI subtitle
    const liveDownSpeed = formatTransferSpeed(jobStats?.totalDownloadSpeedBytesPerSecond)
    const liveUpSpeed = formatTransferSpeed(jobStats?.totalUploadSpeedBytesPerSecond)
    const activeSubtitle = useMemo(() => {
        if (liveDownSpeed || liveUpSpeed) {
            return (
                <span className="inline-flex items-center gap-2 font-mono">
                    {liveDownSpeed && <span className="text-primary-100">↓ {liveDownSpeed}</span>}
                    {liveUpSpeed && <span className="text-info-light">↑ {liveUpSpeed}</span>}
                </span>
            )
        }
        const dl = jobStats?.downloadingJobs ?? 0
        const ul = (jobStats?.uploadingJobs ?? 0) + (jobStats?.pendingUploadJobs ?? 0)
        return `${dl} downloading · ${ul} uploading`
    }, [liveDownSpeed, liveUpSpeed, jobStats])

    const completedSubtitle = useMemo(() => {
        const bytes = jobStats?.totalBytesTransferred ?? 0
        return bytes > 0 ? `${formatFileSize(bytes)} delivered to cloud` : 'All completed transfers'
    }, [jobStats?.totalBytesTransferred])

    const failedSubtitle = useMemo(() => {
        const retrying = jobStats?.retryingJobs ?? 0
        const stalled = jobStats?.stalledJobs ?? 0
        return `${retrying} retrying · ${stalled} stalled`
    }, [jobStats?.retryingJobs, jobStats?.stalledJobs])

    const totalCount = data?.totalCount ?? 0
    const startItem = totalCount === 0 ? 0 : (urlPage - 1) * urlPageSize + 1
    const endItem = Math.min(urlPage * urlPageSize, totalCount)

    return (
        <div className="space-y-6">
            {/* Header Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                            Transfer Jobs
                        </h1>
                        {isFetching && !isLoading && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Monitor two-stage BitTorrent-to-cloud pipelines, inspect storage routing, and recover failed jobs.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {(jobStats?.failedJobs ?? 0) > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => retryFailedBatchMutation.mutate({})}
                            disabled={retryFailedBatchMutation.isPending}
                            className="border-danger/40 bg-danger/10 text-danger-light hover:bg-danger/20"
                        >
                            {retryFailedBatchMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Retry All Failed ({jobStats?.failedJobs})
                        </Button>
                    )}

                    <Button asChild>
                        <Link href="/torrents/upload">
                            <Upload className="mr-2 h-4 w-4" />
                            New Transfer
                        </Link>
                    </Button>
                </div>
            </div>

            {/* 1. Clickable KPI Summary Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Jobs"
                    value={jobStats?.totalJobs ?? 0}
                    subtitle={`${destinationProfiles.length || 1} configured destination${destinationProfiles.length === 1 ? '' : 's'}`}
                    icon={TrendingUp}
                    color="primary"
                    active={urlPhase === 'all' && !urlStatus}
                    onClick={() => updateUrlParams({ phase: 'all', status: null, page: 1 })}
                />
                <StatsCard
                    title="Active Transfers"
                    value={jobStats?.activeJobs ?? 0}
                    subtitle={activeSubtitle}
                    icon={Clock}
                    color="info"
                    active={urlPhase === 'active'}
                    onClick={() =>
                        updateUrlParams({
                            phase: urlPhase === 'active' ? 'all' : 'active',
                            status: null,
                            page: 1,
                        })
                    }
                />
                <StatsCard
                    title="Completed"
                    value={jobStats?.completedJobs ?? 0}
                    subtitle={completedSubtitle}
                    icon={CheckCircle}
                    color="success"
                    active={urlPhase === 'completed'}
                    onClick={() =>
                        updateUrlParams({
                            phase: urlPhase === 'completed' ? 'all' : 'completed',
                            status: null,
                            page: 1,
                        })
                    }
                />
                <StatsCard
                    title="Failed / Needs Attention"
                    value={jobStats?.failedJobs ?? 0}
                    subtitle={failedSubtitle}
                    icon={XCircle}
                    color="danger"
                    active={urlPhase === 'failed'}
                    onClick={() =>
                        updateUrlParams({
                            phase: urlPhase === 'failed' ? 'all' : 'failed',
                            status: null,
                            page: 1,
                        })
                    }
                />
            </div>

            {/* Command Console Card */}
            <Card className="border-surface-300/70 bg-surface-500/90">
                <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* 2. Token-Aware Command Search Bar + Smart Presets */}
                    <div className="space-y-2.5">
                        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                <Input
                                    ref={searchInputRef}
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Search filename, InfoHash, profile, error, or tokens (provider:s3 is:pinned type:video)..."
                                    className="pl-10 pr-20 h-10 bg-surface-400/70 border-surface-300 focus-visible:ring-primary font-mono text-sm"
                                />
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                    {searchInput ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchInput('')
                                                setDebouncedSearch('')
                                                updateUrlParams({ q: null, page: 1 })
                                            }}
                                            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-surface-300/60"
                                            aria-label="Clear search"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    ) : (
                                        <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-surface-200/70 bg-surface-300/60 px-1.5 font-mono text-[10px] text-muted-foreground">
                                            /
                                        </kbd>
                                    )}
                                </div>
                            </div>

                            {/* Smart View Presets Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-10 shrink-0 gap-2">
                                        <Sparkles className="h-4 w-4 text-primary-200" />
                                        <span>Smart Views</span>
                                        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-60">
                                    <DropdownMenuLabel>Quick Filter Presets</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() =>
                                            updateUrlParams({
                                                phase: 'failed',
                                                sortBy: 'createdAt',
                                                sortDir: 'desc',
                                                page: 1,
                                            })
                                        }
                                    >
                                        <AlertCircle className="mr-2 h-4 w-4 text-danger-medium" />
                                        Needs Attention (Failed)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            updateUrlParams({
                                                phase: 'active',
                                                isStalled: true,
                                                page: 1,
                                            })
                                        }
                                    >
                                        <AlertTriangle className="mr-2 h-4 w-4 text-warning-medium" />
                                        Stalled Active Transfers
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            updateUrlParams({
                                                phase: 'all',
                                                wasRerouted: true,
                                                page: 1,
                                            })
                                        }
                                    >
                                        <Shuffle className="mr-2 h-4 w-4 text-warning-light" />
                                        Failover Rerouted Jobs
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            updateUrlParams({
                                                phase: 'all',
                                                category: 'video',
                                                sizeBucket: 'large',
                                                page: 1,
                                            })
                                        }
                                    >
                                        <Film className="mr-2 h-4 w-4 text-primary-200" />
                                        Large Video Transfers (10GB+)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            updateUrlParams({
                                                phase: 'all',
                                                provider: 'S3',
                                                isPinned: true,
                                                page: 1,
                                            })
                                        }
                                    >
                                        <Pin className="mr-2 h-4 w-4 text-info-light" />
                                        Pinned S3 Transfers
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Interactive Search Token Pill Strip */}
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            <span className="inline-flex items-center gap-1 text-muted-foreground mr-1">
                                <Terminal className="h-3 w-3" />
                                <span>Tokens:</span>
                            </span>
                            {QUICK_SEARCH_TOKENS.map(({ token, label }) => {
                                const active = hasTokenInQuery(searchInput, token)
                                return (
                                    <button
                                        key={token}
                                        type="button"
                                        onClick={() => {
                                            const next = toggleTokenInQuery(searchInput, token)
                                            setSearchInput(next)
                                            setDebouncedSearch(next)
                                            updateUrlParams({ q: next || null, page: 1 })
                                        }}
                                        className={cn(
                                            'inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] transition-colors border',
                                            active
                                                ? 'border-primary bg-primary/20 text-primary-50 font-semibold'
                                                : 'border-surface-300/80 bg-surface-400/50 text-muted-foreground hover:text-foreground hover:border-surface-200'
                                        )}
                                    >
                                        {label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* 3. Primary Phase Segmented Bar */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-y border-surface-300/50 py-2.5">
                        {phaseTabs.map((tab) => {
                            const isSelected = urlPhase === tab.id && !urlStatus
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() =>
                                        updateUrlParams({
                                            phase: tab.id,
                                            status: null,
                                            page: 1,
                                        })
                                    }
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0',
                                        isSelected
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'bg-surface-400/60 text-muted-foreground hover:text-foreground hover:bg-surface-300/60'
                                    )}
                                >
                                    <span>{tab.label}</span>
                                    <span
                                        className={cn(
                                            'rounded-full px-1.5 py-0.5 font-mono text-[11px]',
                                            isSelected
                                                ? 'bg-black/25 text-white'
                                                : 'bg-surface-300/80 text-muted-foreground'
                                        )}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    {/* 4. Secondary Facet Filter Row + Trait Pills + Sort Control */}
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Storage Destination Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            'h-8 gap-1.5 text-xs',
                                            (urlProvider || urlProfileId) &&
                                                'border-primary/60 bg-primary/15 text-primary-50'
                                        )}
                                    >
                                        <HardDrive className="h-3.5 w-3.5" />
                                        <span>{selectedDestinationLabel}</span>
                                        <ChevronDown className="h-3 w-3 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-64">
                                    <DropdownMenuLabel>Storage Destination</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            updateUrlParams({
                                                provider: null,
                                                storageProfileId: null,
                                                page: 1,
                                            })
                                        }
                                        className="justify-between"
                                    >
                                        <span>All Destinations</span>
                                        {!urlProvider && !urlProfileId && (
                                            <Check className="h-3.5 w-3.5" />
                                        )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                                        By Cloud Provider
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            updateUrlParams({
                                                provider: 'GoogleDrive',
                                                storageProfileId: null,
                                                page: 1,
                                            })
                                        }
                                        className="justify-between"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Cloud className="h-3.5 w-3.5 text-primary-200" />
                                            Google Drive
                                        </span>
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {jobStats?.providerCounts?.GoogleDrive ?? ''}
                                        </span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            updateUrlParams({
                                                provider: 'S3',
                                                storageProfileId: null,
                                                page: 1,
                                            })
                                        }
                                        className="justify-between"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Database className="h-3.5 w-3.5 text-warning-medium" />
                                            S3 Compatible
                                        </span>
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {jobStats?.providerCounts?.S3 ?? ''}
                                        </span>
                                    </DropdownMenuItem>

                                    {destinationProfiles.length > 0 && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                                                By Storage Profile
                                            </DropdownMenuLabel>
                                            {destinationProfiles.map((prof) => (
                                                <DropdownMenuItem
                                                    key={prof.id}
                                                    onClick={() =>
                                                        updateUrlParams({
                                                            storageProfileId: prof.id,
                                                            provider: null,
                                                            page: 1,
                                                        })
                                                    }
                                                    className="justify-between"
                                                >
                                                    <span className="truncate pr-2">
                                                        {prof.name}
                                                    </span>
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        {prof.count ?? ''}
                                                    </span>
                                                </DropdownMenuItem>
                                            ))}
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Media Category Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            'h-8 gap-1.5 text-xs',
                                            urlCategory &&
                                                'border-primary/60 bg-primary/15 text-primary-50'
                                        )}
                                    >
                                        <Film className="h-3.5 w-3.5" />
                                        <span>
                                            {CATEGORY_OPTIONS.find((c) => c.value === (urlCategory || ''))
                                                ?.label || 'Category'}
                                        </span>
                                        <ChevronDown className="h-3 w-3 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48">
                                    <DropdownMenuLabel>Media Category</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {CATEGORY_OPTIONS.map((cat) => {
                                        const count = cat.value
                                            ? jobStats?.categoryCounts?.[cat.value]
                                            : undefined
                                        return (
                                            <DropdownMenuItem
                                                key={cat.value || 'all'}
                                                onClick={() =>
                                                    updateUrlParams({
                                                        category: cat.value || null,
                                                        page: 1,
                                                    })
                                                }
                                                className="justify-between"
                                            >
                                                <span>{cat.label}</span>
                                                {count !== undefined && (
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        {count}
                                                    </span>
                                                )}
                                            </DropdownMenuItem>
                                        )
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Size Bucket Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            'h-8 gap-1.5 text-xs',
                                            urlSizeBucket &&
                                                'border-primary/60 bg-primary/15 text-primary-50'
                                        )}
                                    >
                                        <Layers className="h-3.5 w-3.5" />
                                        <span>
                                            {SIZE_BUCKET_OPTIONS.find(
                                                (s) => s.value === (urlSizeBucket || '')
                                            )?.label || 'Any Size'}
                                        </span>
                                        <ChevronDown className="h-3 w-3 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-52">
                                    <DropdownMenuLabel>Transfer Size</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {SIZE_BUCKET_OPTIONS.map((sb) => {
                                        const count = sb.value
                                            ? jobStats?.sizeBucketCounts?.[sb.value]
                                            : undefined
                                        return (
                                            <DropdownMenuItem
                                                key={sb.value || 'any'}
                                                onClick={() =>
                                                    updateUrlParams({
                                                        sizeBucket: sb.value || null,
                                                        page: 1,
                                                    })
                                                }
                                                className="justify-between"
                                            >
                                                <span>{sb.label}</span>
                                                {count !== undefined && (
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        {count}
                                                    </span>
                                                )}
                                            </DropdownMenuItem>
                                        )
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Date Range Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            'h-8 gap-1.5 text-xs',
                                            urlDateRange &&
                                                'border-primary/60 bg-primary/15 text-primary-50'
                                        )}
                                    >
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>
                                            {DATE_RANGE_OPTIONS.find(
                                                (d) => d.value === (urlDateRange || '')
                                            )?.label || 'Any Time'}
                                        </span>
                                        <ChevronDown className="h-3 w-3 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-44">
                                    <DropdownMenuLabel>Created Date</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {DATE_RANGE_OPTIONS.map((dr) => (
                                        <DropdownMenuItem
                                            key={dr.value || 'all'}
                                            onClick={() =>
                                                updateUrlParams({
                                                    dateRange: dr.value || null,
                                                    page: 1,
                                                })
                                            }
                                        >
                                            {dr.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Trait Quick-Toggle Pills */}
                            <button
                                type="button"
                                onClick={() =>
                                    updateUrlParams({
                                        isPinned: urlIsPinned ? null : true,
                                        page: 1,
                                    })
                                }
                                className={cn(
                                    'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
                                    urlIsPinned
                                        ? 'border-primary/60 bg-primary/20 text-primary-50'
                                        : 'border-surface-300 bg-transparent text-muted-foreground hover:text-foreground hover:bg-surface-400'
                                )}
                            >
                                <Pin className="h-3 w-3" />
                                <span>Pinned</span>
                                {(jobStats?.pinnedJobs ?? 0) > 0 && (
                                    <span className="font-mono text-[11px] opacity-80">
                                        ({jobStats?.pinnedJobs})
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    updateUrlParams({
                                        wasRerouted: urlWasRerouted ? null : true,
                                        page: 1,
                                    })
                                }
                                className={cn(
                                    'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
                                    urlWasRerouted
                                        ? 'border-warning/60 bg-warning/20 text-warning-light'
                                        : 'border-surface-300 bg-transparent text-muted-foreground hover:text-foreground hover:bg-surface-400'
                                )}
                            >
                                <Shuffle className="h-3 w-3" />
                                <span>Rerouted</span>
                                {(jobStats?.reroutedJobs ?? 0) > 0 && (
                                    <span className="font-mono text-[11px] opacity-80">
                                        ({jobStats?.reroutedJobs})
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    updateUrlParams({
                                        isStalled: urlIsStalled ? null : true,
                                        page: 1,
                                    })
                                }
                                className={cn(
                                    'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
                                    urlIsStalled
                                        ? 'border-warning/60 bg-warning/20 text-warning-light'
                                        : 'border-surface-300 bg-transparent text-muted-foreground hover:text-foreground hover:bg-surface-400'
                                )}
                            >
                                <AlertTriangle className="h-3 w-3" />
                                <span>Stalled</span>
                                {(jobStats?.stalledJobs ?? 0) > 0 && (
                                    <span className="font-mono text-[11px] opacity-80">
                                        ({jobStats?.stalledJobs})
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    updateUrlParams({
                                        isSelective: urlIsSelective ? null : true,
                                        page: 1,
                                    })
                                }
                                className={cn(
                                    'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
                                    urlIsSelective
                                        ? 'border-info/60 bg-info/20 text-info-light'
                                        : 'border-surface-300 bg-transparent text-muted-foreground hover:text-foreground hover:bg-surface-400'
                                )}
                            >
                                <Layers className="h-3 w-3" />
                                <span>Selective</span>
                                {(jobStats?.selectiveJobs ?? 0) > 0 && (
                                    <span className="font-mono text-[11px] opacity-80">
                                        ({jobStats?.selectiveJobs})
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    updateUrlParams({
                                        hasError: urlHasError ? null : true,
                                        page: 1,
                                    })
                                }
                                className={cn(
                                    'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
                                    urlHasError
                                        ? 'border-danger/60 bg-danger/20 text-danger-light'
                                        : 'border-surface-300 bg-transparent text-muted-foreground hover:text-foreground hover:bg-surface-400'
                                )}
                            >
                                <AlertCircle className="h-3 w-3" />
                                <span>Has Error</span>
                            </button>
                        </div>

                        {/* Sort Control */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end xl:self-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>
                                            Sort:{' '}
                                            {SORT_OPTIONS.find((s) => s.value === urlSortBy)?.label ||
                                                'Created Date'}
                                        </span>
                                        <ChevronDown className="h-3 w-3 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Sort Jobs By</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {SORT_OPTIONS.map((opt) => (
                                        <DropdownMenuItem
                                            key={opt.value}
                                            onClick={() =>
                                                updateUrlParams({ sortBy: opt.value, page: 1 })
                                            }
                                            className="justify-between"
                                        >
                                            <span>{opt.label}</span>
                                            {urlSortBy === opt.value && (
                                                <Check className="h-3.5 w-3.5" />
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs"
                                onClick={() =>
                                    updateUrlParams({
                                        sortDir: urlSortDir === 'desc' ? 'asc' : 'desc',
                                        page: 1,
                                    })
                                }
                                title={
                                    urlSortDir === 'desc'
                                        ? 'Descending order (click for ascending)'
                                        : 'Ascending order (click for descending)'
                                }
                            >
                                {urlSortDir === 'desc' ? (
                                    <ArrowDown className="h-3.5 w-3.5" />
                                ) : (
                                    <ArrowUp className="h-3.5 w-3.5" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Active Filter Summary & Reset */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-300/50 text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-muted-foreground mr-1">Active filters:</span>
                                {activeFilterChips.map((chip) => (
                                    <Badge
                                        key={chip.key}
                                        variant="secondary"
                                        className="gap-1 pl-2.5 pr-1.5 py-0.5 font-normal bg-surface-300/80 text-foreground"
                                    >
                                        <span>{chip.label}</span>
                                        <button
                                            type="button"
                                            onClick={chip.onRemove}
                                            className="rounded-full p-0.5 hover:bg-surface-200"
                                            aria-label={`Remove ${chip.label} filter`}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                                <button
                                    type="button"
                                    onClick={clearAllFilters}
                                    className="text-xs font-medium text-primary-100 hover:underline ml-1"
                                >
                                    Clear all filters
                                </button>
                            </div>

                            <span className="font-mono text-muted-foreground">
                                {totalCount > 0
                                    ? `Showing ${startItem}–${endItem} of ${totalCount} matching jobs`
                                    : '0 matching jobs'}
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 5. Batch Action Bar & Page Selection Toolbar */}
            {items.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-300/60 bg-surface-400/40 px-4 py-2.5 text-xs">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-muted-foreground hover:text-foreground">
                        <input
                            type="checkbox"
                            checked={allOnPageSelected}
                            onChange={(e) => handleToggleSelectAllOnPage(e.target.checked)}
                            className="h-4 w-4 rounded border-surface-200 bg-surface-400 text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer accent-primary"
                        />
                        <span>
                            {selectedJobIds.length > 0
                                ? `${selectedJobIds.length} job${selectedJobIds.length === 1 ? '' : 's'} selected`
                                : `Select all ${items.length} on page`}
                        </span>
                    </label>

                    {selectedJobIds.length > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={retryFailedBatchMutation.isPending}
                                onClick={() => {
                                    retryFailedBatchMutation.mutate(
                                        { jobIds: selectedJobIds },
                                        { onSuccess: () => setSelectedJobIds([]) }
                                    )
                                }}
                                className="h-7 text-xs border-primary/40 text-primary-100 hover:bg-primary/20"
                            >
                                {retryFailedBatchMutation.isPending ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                )}
                                Retry Selected ({selectedJobIds.length})
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={cancelBatchMutation.isPending}
                                onClick={() => {
                                    cancelBatchMutation.mutate(
                                        { jobIds: selectedJobIds },
                                        { onSuccess: () => setSelectedJobIds([]) }
                                    )
                                }}
                                className="h-7 text-xs border-danger/40 text-danger-light hover:bg-danger/20"
                            >
                                {cancelBatchMutation.isPending ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Ban className="mr-1.5 h-3.5 w-3.5" />
                                )}
                                Cancel Selected ({selectedJobIds.length})
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedJobIds([])}
                                className="h-7 text-xs text-muted-foreground"
                            >
                                Clear Selection
                            </Button>
                        </div>
                    ) : (
                        <span className="font-mono text-muted-foreground">
                            Showing {startItem}–{endItem} of {totalCount}
                        </span>
                    )}
                </div>
            )}

            {/* Main Jobs List */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[320px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : error ? (
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
            ) : items.length === 0 ? (
                <EmptyState
                    icon={Upload}
                    title={
                        hasActiveFilters
                            ? 'No jobs match your current filters'
                            : 'No transfer jobs yet'
                    }
                    description={
                        hasActiveFilters
                            ? 'Try removing one or more filters or clearing your search query.'
                            : 'Upload a .torrent file to stage it and stream directly to Google Drive or S3.'
                    }
                    action={
                        hasActiveFilters
                            ? { label: 'Clear All Filters', onClick: clearAllFilters }
                            : {
                                  label: 'Upload Torrent',
                                  onClick: () => router.push('/torrents/upload'),
                              }
                    }
                />
            ) : (
                <div className="space-y-3">
                    {items.map((job) => (
                        <JobCard
                            key={job.id}
                            job={job}
                            selectable
                            selected={selectedJobIds.includes(job.id)}
                            onSelectChange={(checked) => handleToggleSelectJob(job.id, checked)}
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

            {/* Pagination */}
            {data && data.totalCount > 0 && (
                <Pagination
                    totalItems={data.totalCount}
                    pageSize={urlPageSize}
                    currentPage={urlPage}
                    onPageChange={(page) => updateUrlParams({ page }, 'push')}
                    onPageSizeChange={(size) => updateUrlParams({ size, page: 1 }, 'push')}
                />
            )}
        </div>
    )
}

export default function JobsListPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <JobsConsoleContent />
        </Suspense>
    )
}
