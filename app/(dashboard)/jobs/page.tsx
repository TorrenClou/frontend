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
import { CompactJobTableRow } from '@/components/jobs/CompactJobTableRow'
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
    LayoutList,
    LayoutGrid,
    SlidersHorizontal,
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

    // View mode state: 'compact' (dense table row) vs 'detailed' (expanded card)
    const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact')
    const [showFiltersPanel, setShowFiltersPanel] = useState(false)

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
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const urlPageSize = Math.max(5, parseInt(searchParams.get('size') || '10', 10))

    // Local state for debounced search
    const [searchInput, setSearchInput] = useState(urlSearch)
    const [debouncedSearch, setDebouncedSearch] = useState(urlSearch)

    // Selection state for batch operations
    const [selectedJobIds, setSelectedJobIds] = useState<number[]>([])

    // Storage profiles for destination facet
    const { data: storageProfiles = [] } = useStorageProfiles()

    // Helper to update URL query params
    const updateUrlParams = useCallback(
        (
            updates: Record<string, string | number | boolean | null | undefined>,
            mode: 'push' | 'replace' = 'push'
        ) => {
            const nextParams = new URLSearchParams(searchParams.toString())

            Object.entries(updates).forEach(([key, val]) => {
                if (val === null || val === undefined || val === '') {
                    nextParams.delete(key)
                } else {
                    nextParams.set(key, String(val))
                }
            })

            const target = `${pathname}?${nextParams.toString()}`
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

    // Data fetching queries & mutations
    const { data, isLoading, isFetching, error, refetch } = useJobs(queryParams)
    const { data: jobStats } = useJobStatistics()

    const retryJobMutation = useRetryJob()
    const forceStartMutation = useForceStartJob()
    const cancelJobMutation = useCancelJob()
    const retryFailedBatchMutation = useRetryFailedJobs()
    const cancelBatchMutation = useBatchCancelJobs()

    const items = data?.items ?? []

    // Phase tab configuration with server-provided statistics
    const phaseTabs = useMemo(
        () => [
            {
                id: 'all' as JobPhaseFilter,
                label: 'All Transfers',
                count: jobStats?.totalJobs ?? 0,
            },
            {
                id: 'active' as JobPhaseFilter,
                label: 'Active',
                count: jobStats?.activeJobs ?? 0,
            },
            {
                id: 'downloading' as JobPhaseFilter,
                label: 'Downloading',
                count: jobStats?.downloadingJobs ?? 0,
            },
            {
                id: 'uploading' as JobPhaseFilter,
                label: 'Uploading',
                count: (jobStats?.uploadingJobs ?? 0) + (jobStats?.pendingUploadJobs ?? 0),
            },
            {
                id: 'completed' as JobPhaseFilter,
                label: 'Completed',
                count: jobStats?.completedJobs ?? 0,
            },
            {
                id: 'failed' as JobPhaseFilter,
                label: 'Failed',
                count: jobStats?.failedJobs ?? 0,
            },
        ],
        [jobStats]
    )

    // Unified destination profile list merging user profiles + stats facet
    const destinationProfiles = useMemo(() => {
        const map = new Map<number, { id: number; name: string; providerType: string; count?: number }>()
        for (const p of storageProfiles) {
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
                label: `Provider: ${urlProvider === 'GoogleDrive' ? 'Google Drive' : 'S3'}`,
                onRemove: () => updateUrlParams({ provider: null, page: 1 }),
            })
        }
        if (urlProfileId) {
            const prof = destinationProfiles.find((p) => p.id === urlProfileId)
            chips.push({
                key: 'storageProfileId',
                label: `Profile: ${prof?.name || urlProfileId}`,
                onRemove: () => updateUrlParams({ storageProfileId: null, page: 1 }),
            })
        }
        if (urlCategory) {
            const cat = CATEGORY_OPTIONS.find((c) => c.value === urlCategory)
            chips.push({
                key: 'category',
                label: `Category: ${cat?.label || urlCategory}`,
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
                label: 'Rerouted Only',
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
    const facetFilterCount = [
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
    ].filter(Boolean).length

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
                <span className="inline-flex items-center gap-2 font-mono text-xs">
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
        <div className="space-y-5">
            {/* Header Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
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

                <div className="flex items-center gap-2 flex-wrap">
                    {(jobStats?.failedJobs ?? 0) > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => retryFailedBatchMutation.mutate({})}
                            disabled={retryFailedBatchMutation.isPending}
                            className="border-danger/30 bg-danger/10 text-danger-light hover:bg-danger/20 h-9"
                        >
                            {retryFailedBatchMutation.isPending ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Retry All Failed ({jobStats?.failedJobs})
                        </Button>
                    )}

                    <Button asChild size="sm" className="h-9">
                        <Link href="/torrents/upload">
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                            New Transfer
                        </Link>
                    </Button>
                </div>
            </div>

            {/* 1. Clickable KPI Summary Row */}
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Jobs"
                    value={jobStats?.totalJobs ?? 0}
                    subtitle={`${destinationProfiles.length || 1} destination${destinationProfiles.length === 1 ? '' : 's'}`}
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
                    title="Failed / Attention"
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

            {/* 2. Streamlined Command Console Toolbar */}
            <Card className="rounded-xl border border-surface-300/50 bg-surface-500/70 backdrop-blur-xs">
                <CardContent className="p-3.5 sm:p-4 space-y-3">
                    {/* Row 1: Search + Smart Views + Facets Toggle + Sort + View Mode */}
                    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <Input
                                ref={searchInputRef}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search filename, InfoHash, profile, or tokens (provider:s3 is:pinned)..."
                                className="pl-9 pr-14 h-9 bg-surface-400/40 border-surface-300/40 focus-visible:ring-primary/50 text-xs font-mono"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {searchInput ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchInput('')
                                            setDebouncedSearch('')
                                            updateUrlParams({ q: null, page: 1 })
                                        }}
                                        className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-surface-300/60"
                                        aria-label="Clear search"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                ) : (
                                    <kbd className="hidden sm:inline-flex h-4 items-center rounded border border-surface-200/50 bg-surface-300/50 px-1 font-mono text-[9px] text-muted-foreground">
                                        /
                                    </kbd>
                                )}
                            </div>
                        </div>

                        {/* Controls Toolbar Strip */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            {/* Smart Views Presets */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs border-surface-300/50 bg-surface-400/40">
                                        <Sparkles className="h-3.5 w-3.5 text-primary-100" />
                                        <span className="hidden sm:inline">Views</span>
                                        <ChevronDown className="h-3 w-3 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
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
                                        <AlertCircle className="mr-2 h-3.5 w-3.5 text-danger-light" />
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
                                        <AlertTriangle className="mr-2 h-3.5 w-3.5 text-warning-medium" />
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
                                        <Shuffle className="mr-2 h-3.5 w-3.5 text-warning-light" />
                                        Failover Rerouted
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
                                        <Film className="mr-2 h-3.5 w-3.5 text-primary-100" />
                                        Large Videos (10GB+)
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
                                        <Pin className="mr-2 h-3.5 w-3.5 text-info-light" />
                                        Pinned S3 Transfers
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Facets Expand Button */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFiltersPanel((prev) => !prev)}
                                className={cn(
                                    'h-9 gap-1.5 text-xs border-surface-300/50 bg-surface-400/40',
                                    (showFiltersPanel || facetFilterCount > 0) &&
                                        'border-primary/50 text-primary-100 bg-primary/10'
                                )}
                            >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                <span>Filters</span>
                                {facetFilterCount > 0 && (
                                    <span className="rounded-full bg-primary/25 px-1.5 py-0.2 text-[10px] font-mono font-semibold">
                                        {facetFilterCount}
                                    </span>
                                )}
                            </Button>

                            {/* Sort Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 gap-1 text-xs border-surface-300/50 bg-surface-400/40">
                                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                        <span className="hidden sm:inline">
                                            {SORT_OPTIONS.find((s) => s.value === urlSortBy)?.label || 'Sort'}
                                        </span>
                                        <ChevronDown className="h-3 w-3 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuLabel>Sort Jobs By</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {SORT_OPTIONS.map((opt) => (
                                        <DropdownMenuItem
                                            key={opt.value}
                                            onClick={() => updateUrlParams({ sortBy: opt.value, page: 1 })}
                                            className="justify-between text-xs"
                                        >
                                            <span>{opt.label}</span>
                                            {urlSortBy === opt.value && <Check className="h-3.5 w-3.5" />}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Sort Direction Toggle */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 w-9 p-0 border-surface-300/50 bg-surface-400/40"
                                onClick={() =>
                                    updateUrlParams({
                                        sortDir: urlSortDir === 'desc' ? 'asc' : 'desc',
                                        page: 1,
                                    })
                                }
                                title={`Sort ${urlSortDir === 'desc' ? 'Ascending' : 'Descending'}`}
                            >
                                {urlSortDir === 'desc' ? (
                                    <ArrowDown className="h-3.5 w-3.5" />
                                ) : (
                                    <ArrowUp className="h-3.5 w-3.5" />
                                )}
                            </Button>

                            {/* View Mode Toggle: Compact vs Detailed */}
                            <div className="flex items-center rounded-lg border border-surface-300/50 bg-surface-400/40 p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('compact')}
                                    className={cn(
                                        'rounded-md p-1.5 transition-colors',
                                        viewMode === 'compact'
                                            ? 'bg-surface-300/80 text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                    title="Compact Table View"
                                >
                                    <LayoutList className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('detailed')}
                                    className={cn(
                                        'rounded-md p-1.5 transition-colors',
                                        viewMode === 'detailed'
                                            ? 'bg-surface-300/80 text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                    title="Detailed Card View"
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Phase Tabs Strip */}
                    <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pt-1">
                        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                            {phaseTabs.map((tab) => {
                                const isSelected = urlPhase === tab.id && !urlStatus
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        aria-pressed={isSelected}
                                        onClick={() =>
                                            updateUrlParams({
                                                phase: tab.id,
                                                status: null,
                                                page: 1,
                                            })
                                        }
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all shrink-0',
                                            isSelected
                                                ? 'bg-primary text-white shadow-xs'
                                                : 'bg-surface-400/50 text-muted-foreground hover:text-foreground hover:bg-surface-300/60'
                                        )}
                                    >
                                        <span>{tab.label}</span>
                                        <span
                                            className={cn(
                                                'rounded-full px-1.5 py-0.2 font-mono text-[10px] tabular-nums',
                                                isSelected
                                                    ? 'bg-black/25 text-white'
                                                    : 'bg-surface-300/70 text-muted-foreground'
                                            )}
                                        >
                                            {tab.count}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Total Count Footnote */}
                        <span className="hidden sm:inline-block font-mono text-xs text-muted-foreground/70 shrink-0 tabular-nums">
                            {totalCount > 0 ? `${startItem}–${endItem} of ${totalCount}` : '0 transfers'}
                        </span>
                    </div>

                    {/* Expandable Facets Panel (Destination, Category, Size, Traits) */}
                    {showFiltersPanel && (
                        <div className="pt-2 border-t border-surface-300/30 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 animate-in">
                            {/* Destination Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full justify-between h-8 text-xs border-surface-300/50 bg-surface-400/30">
                                        <span className="truncate">{selectedDestinationLabel}</span>
                                        <ChevronDown className="h-3 w-3 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-60">
                                    <DropdownMenuLabel>Storage Destination</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() => updateUrlParams({ provider: null, storageProfileId: null, page: 1 })}
                                    >
                                        All Destinations
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => updateUrlParams({ provider: 'GoogleDrive', storageProfileId: null, page: 1 })}>
                                        <Cloud className="mr-2 h-3.5 w-3.5 text-primary-200" />
                                        Google Drive
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateUrlParams({ provider: 'S3', storageProfileId: null, page: 1 })}>
                                        <Database className="mr-2 h-3.5 w-3.5 text-warning-medium" />
                                        S3 Compatible
                                    </DropdownMenuItem>
                                    {destinationProfiles.length > 0 && (
                                        <>
                                            <DropdownMenuSeparator />
                                            {destinationProfiles.map((p) => (
                                                <DropdownMenuItem
                                                    key={p.id}
                                                    onClick={() => updateUrlParams({ storageProfileId: p.id, provider: null, page: 1 })}
                                                >
                                                    <span className="truncate">{p.name}</span>
                                                </DropdownMenuItem>
                                            ))}
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Category Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full justify-between h-8 text-xs border-surface-300/50 bg-surface-400/30">
                                        <span>
                                            {CATEGORY_OPTIONS.find((c) => c.value === (urlCategory || ''))?.label || 'All Categories'}
                                        </span>
                                        <ChevronDown className="h-3 w-3 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48">
                                    <DropdownMenuLabel>Category</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {CATEGORY_OPTIONS.map((cat) => (
                                        <DropdownMenuItem
                                            key={cat.value || 'all'}
                                            onClick={() => updateUrlParams({ category: cat.value || null, page: 1 })}
                                        >
                                            {cat.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Size Bucket */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full justify-between h-8 text-xs border-surface-300/50 bg-surface-400/30">
                                        <span>
                                            {SIZE_BUCKET_OPTIONS.find((s) => s.value === (urlSizeBucket || ''))?.label || 'Any Size'}
                                        </span>
                                        <ChevronDown className="h-3 w-3 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48">
                                    <DropdownMenuLabel>Size Bucket</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {SIZE_BUCKET_OPTIONS.map((sb) => (
                                        <DropdownMenuItem
                                            key={sb.value || 'any'}
                                            onClick={() => updateUrlParams({ sizeBucket: sb.value || null, page: 1 })}
                                        >
                                            {sb.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Trait Toggles Group */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => updateUrlParams({ isPinned: urlIsPinned ? null : true, page: 1 })}
                                    className={cn(
                                        'rounded px-2 py-1 text-xs transition-colors border',
                                        urlIsPinned
                                            ? 'border-primary/60 bg-primary/20 text-primary-100 font-semibold'
                                            : 'border-surface-300/50 bg-surface-400/30 text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    Pinned
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateUrlParams({ wasRerouted: urlWasRerouted ? null : true, page: 1 })}
                                    className={cn(
                                        'rounded px-2 py-1 text-xs transition-colors border',
                                        urlWasRerouted
                                            ? 'border-warning/60 bg-warning/20 text-warning-light font-semibold'
                                            : 'border-surface-300/50 bg-surface-400/30 text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    Rerouted
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateUrlParams({ isStalled: urlIsStalled ? null : true, page: 1 })}
                                    className={cn(
                                        'rounded px-2 py-1 text-xs transition-colors border',
                                        urlIsStalled
                                            ? 'border-warning/60 bg-warning/20 text-warning-light font-semibold'
                                            : 'border-surface-300/50 bg-surface-400/30 text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    Stalled
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateUrlParams({ hasError: urlHasError ? null : true, page: 1 })}
                                    className={cn(
                                        'rounded px-2 py-1 text-xs transition-colors border',
                                        urlHasError
                                            ? 'border-danger/60 bg-danger/20 text-danger-light font-semibold'
                                            : 'border-surface-300/50 bg-surface-400/30 text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    Has Error
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Active Filter Chips Strip */}
                    {hasActiveFilters && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-surface-300/30">
                            <span className="text-xs text-muted-foreground">Active:</span>
                            {activeFilterChips.map((chip) => (
                                <Badge
                                    key={chip.key}
                                    variant="secondary"
                                    className="gap-1 pr-1 font-normal text-xs bg-surface-400/60 border-surface-300/50 hover:bg-surface-300/60"
                                >
                                    <span>{chip.label}</span>
                                    <button
                                        type="button"
                                        onClick={chip.onRemove}
                                        className="rounded-full p-0.5 hover:bg-surface-200/50 text-muted-foreground hover:text-foreground"
                                        aria-label={`Remove filter ${chip.label}`}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="text-xs text-primary hover:text-primary-100 hover:underline ml-1"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 3. Contextual / Floating Batch Selection Bar */}
            {selectedJobIds.length > 0 && (
                <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-surface-500/95 backdrop-blur-md px-4 py-2.5 shadow-lg text-xs animate-in">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none font-medium text-foreground">
                        <input
                            type="checkbox"
                            checked={allOnPageSelected}
                            onChange={(e) => handleToggleSelectAllOnPage(e.target.checked)}
                            className="h-4 w-4 rounded border-surface-200 bg-surface-400 text-primary focus:ring-2 focus:ring-primary/40 cursor-pointer accent-primary"
                        />
                        <span>
                            {selectedJobIds.length} transfer{selectedJobIds.length === 1 ? '' : 's'} selected
                        </span>
                    </label>

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
                            Retry ({selectedJobIds.length})
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
                            Cancel ({selectedJobIds.length})
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedJobIds([])}
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Deselect
                        </Button>
                    </div>
                </div>
            )}

            {/* 4. Main Transfer Jobs List / Table */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[280px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <Card className="border-danger/40 bg-surface-500/70">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="h-10 w-10 text-danger mx-auto mb-3" />
                        <p className="text-danger mb-4">
                            {error instanceof Error ? error.message : 'Failed to load transfer jobs'}
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
                            ? 'Try clearing one or more filters or search terms.'
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
            ) : viewMode === 'compact' ? (
                /* Compact Table View (Default) */
                <div className="space-y-1.5">
                    {items.map((job) => (
                        <CompactJobTableRow
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
            ) : (
                /* Detailed Card View */
                <div className="space-y-2.5">
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

            {/* 5. Pagination */}
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
