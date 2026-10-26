// Zustand store for Jobs UI state
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { JobStatus } from '@/types/enums'
import type { JobQueryParameters } from '@/types/jobs'

const DEFAULT_FILTERS: JobQueryParameters = {
    pageNumber: 1,
    pageSize: 10,
    phase: 'all',
    status: null,
    search: null,
    provider: null,
    storageProfileId: null,
    category: null,
    sizeBucket: null,
    dateRange: null,
    isPinned: null,
    wasRerouted: null,
    isStalled: null,
    isSelective: null,
    hasError: null,
    sortBy: 'createdAt',
    sortDir: 'desc',
}

interface JobsUIState {
    // Full query filter state
    filters: JobQueryParameters
    setFilters: (filters: Partial<JobQueryParameters>) => void
    updateFilter: <K extends keyof JobQueryParameters>(
        key: K,
        value: JobQueryParameters[K]
    ) => void
    resetFilters: () => void

    // Legacy backward-compatible filter & pagination state
    selectedStatus: JobStatus | null
    setSelectedStatus: (status: JobStatus | null) => void
    currentPage: number
    pageSize: number
    setCurrentPage: (page: number) => void
    setPageSize: (size: number) => void

    // Selected job for detail view
    selectedJobId: number | null
    setSelectedJobId: (id: number | null) => void

    // Modal states
    showCancelModal: boolean
    setShowCancelModal: (show: boolean) => void
    openCancelModal: () => void
    closeModals: () => void

    // Reset all state
    reset: () => void
}

export const useJobsStore = create<JobsUIState>()(
    devtools(
        (set) => ({
            // Full query filter state
            filters: { ...DEFAULT_FILTERS },
            setFilters: (next) =>
                set((state) => {
                    const merged: JobQueryParameters = {
                        ...state.filters,
                        ...next,
                        pageNumber: next.pageNumber ?? 1,
                    }
                    return {
                        filters: merged,
                        selectedStatus: (merged.status as JobStatus | null) ?? null,
                        currentPage: merged.pageNumber ?? 1,
                        pageSize: merged.pageSize ?? state.pageSize,
                    }
                }),
            updateFilter: (key, value) =>
                set((state) => {
                    const nextPage = key === 'pageNumber' ? (value as number) || 1 : 1
                    const merged: JobQueryParameters = {
                        ...state.filters,
                        [key]: value,
                        pageNumber: nextPage,
                    }
                    return {
                        filters: merged,
                        selectedStatus: (merged.status as JobStatus | null) ?? null,
                        currentPage: merged.pageNumber ?? 1,
                        pageSize: merged.pageSize ?? state.pageSize,
                    }
                }),
            resetFilters: () =>
                set({
                    filters: { ...DEFAULT_FILTERS },
                    selectedStatus: null,
                    currentPage: 1,
                }),

            // Filter state (backward-compatible)
            selectedStatus: null,
            setSelectedStatus: (status) =>
                set((state) => ({
                    selectedStatus: status,
                    currentPage: 1,
                    filters: {
                        ...state.filters,
                        status,
                        pageNumber: 1,
                    },
                })),

            // Pagination state (backward-compatible)
            currentPage: 1,
            pageSize: 10,
            setCurrentPage: (page) =>
                set((state) => ({
                    currentPage: page,
                    filters: {
                        ...state.filters,
                        pageNumber: page,
                    },
                })),
            setPageSize: (size) =>
                set((state) => ({
                    pageSize: size,
                    currentPage: 1,
                    filters: {
                        ...state.filters,
                        pageSize: size,
                        pageNumber: 1,
                    },
                })),

            // Selected job
            selectedJobId: null,
            setSelectedJobId: (id) => set({ selectedJobId: id }),

            // Modal states
            showCancelModal: false,
            setShowCancelModal: (show) => set({ showCancelModal: show }),
            openCancelModal: () => set({ showCancelModal: true }),
            closeModals: () => set({ showCancelModal: false }),

            // Reset all
            reset: () =>
                set({
                    filters: { ...DEFAULT_FILTERS },
                    selectedStatus: null,
                    currentPage: 1,
                    pageSize: 10,
                    selectedJobId: null,
                    showCancelModal: false,
                }),
        }),
        { name: 'JobsStore' }
    )
)

// Selectors for optimized re-renders
export const selectJobsFilters = (state: JobsUIState) => state.filters
export const selectSelectedStatus = (state: JobsUIState) => state.selectedStatus
export const selectCurrentPage = (state: JobsUIState) => state.currentPage
export const selectPageSize = (state: JobsUIState) => state.pageSize
export const selectSelectedJobId = (state: JobsUIState) => state.selectedJobId
export const selectShowCancelModal = (state: JobsUIState) => state.showCancelModal
