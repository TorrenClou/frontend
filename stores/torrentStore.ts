// Zustand store for the Torrent workflow — holds a batch of torrents, each with its
// own file selection and optional destination override.
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { TorrentAnalysisResponse } from '@/types/torrents'

export type TorrentBatchItemStatus =
    | 'pending'
    | 'analyzing'
    | 'ready'
    | 'error'
    /** Same info hash as another item in this batch — starting both would collide. */
    | 'duplicate'

export interface TorrentBatchItem {
    /** Stable client-side id. The server id only exists after analysis succeeds. */
    localId: string
    fileName: string
    status: TorrentBatchItemStatus
    error?: string
    analysis?: TorrentAnalysisResponse
    /** Per-torrent file selection. Empty means nothing selected, so it cannot start. */
    selectedFilePaths: string[]
    /** null = inherit the batch destination. */
    storageProfileId: number | null
    expanded: boolean
}

interface TorrentStore {
    items: TorrentBatchItem[]

    /**
     * Batch-level destination. Named for backwards compatibility with
     * StorageProfileSelector, which reads and writes this field directly.
     */
    selectedStorageProfileId: number | null

    // Batch composition
    addFiles: (files: File[]) => TorrentBatchItem[]
    removeItem: (localId: string) => void
    clearTorrentData: () => void

    // Analysis lifecycle
    setItemAnalyzing: (localId: string) => void
    setItemAnalysis: (localId: string, analysis: TorrentAnalysisResponse) => void
    setItemError: (localId: string, error: string) => void

    // Per-torrent selection
    toggleFileSelection: (localId: string, path: string) => void
    selectAllFiles: (localId: string) => void
    deselectAllFiles: (localId: string) => void

    // Per-torrent options
    setItemStorageProfile: (localId: string, storageProfileId: number | null) => void
    toggleExpanded: (localId: string) => void

    setSelectedStorageProfileId: (id: number | null) => void
}

function createItem(file: File): TorrentBatchItem {
    return {
        localId:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fileName: file.name,
        status: 'pending',
        selectedFilePaths: [],
        storageProfileId: null,
        expanded: false,
    }
}

/** Applies `update` to one item, leaving every other item's object identity intact. */
function mapItem(
    items: TorrentBatchItem[],
    localId: string,
    update: (item: TorrentBatchItem) => TorrentBatchItem
): TorrentBatchItem[] {
    return items.map((item) => (item.localId === localId ? update(item) : item))
}

export const useTorrentStore = create<TorrentStore>()(
    devtools(
        // File objects are intentionally not stored — they cannot be serialised, and the
        // analysis result is all that is needed once a torrent has been parsed.
        (set) => ({
            items: [],
            selectedStorageProfileId: null,

            addFiles: (files) => {
                const created = files.map(createItem)
                set((state) => ({ items: [...state.items, ...created] }), false, 'addFiles')
                return created
            },

            removeItem: (localId) =>
                set(
                    (state) => ({ items: state.items.filter((i) => i.localId !== localId) }),
                    false,
                    'removeItem'
                ),

            setItemAnalyzing: (localId) =>
                set(
                    (state) => ({
                        items: mapItem(state.items, localId, (item) => ({
                            ...item,
                            status: 'analyzing',
                            error: undefined,
                        })),
                    }),
                    false,
                    'setItemAnalyzing'
                ),

            setItemAnalysis: (localId, analysis) =>
                set(
                    (state) => {
                        // Two copies of one torrent resolve to the same server-side
                        // RequestedFile, so starting both would collide. Flag the later
                        // one instead of letting it fail at start time.
                        const isDuplicate = state.items.some(
                            (i) =>
                                i.localId !== localId &&
                                i.analysis?.infoHash === analysis.infoHash
                        )

                        return {
                            items: mapItem(state.items, localId, (item) => ({
                                ...item,
                                analysis,
                                fileName: analysis.fileName || item.fileName,
                                status: isDuplicate ? 'duplicate' : 'ready',
                                error: isDuplicate
                                    ? 'Already in this batch'
                                    : undefined,
                                // Default to everything selected, matching the
                                // single-torrent flow this replaces.
                                selectedFilePaths: analysis.files.map((f) => f.path),
                            })),
                        }
                    },
                    false,
                    'setItemAnalysis'
                ),

            setItemError: (localId, error) =>
                set(
                    (state) => ({
                        items: mapItem(state.items, localId, (item) => ({
                            ...item,
                            status: 'error',
                            error,
                        })),
                    }),
                    false,
                    'setItemError'
                ),

            toggleFileSelection: (localId, path) =>
                set(
                    (state) => ({
                        items: mapItem(state.items, localId, (item) => ({
                            ...item,
                            selectedFilePaths: item.selectedFilePaths.includes(path)
                                ? item.selectedFilePaths.filter((p) => p !== path)
                                : [...item.selectedFilePaths, path],
                        })),
                    }),
                    false,
                    'toggleFileSelection'
                ),

            selectAllFiles: (localId) =>
                set(
                    (state) => ({
                        items: mapItem(state.items, localId, (item) => ({
                            ...item,
                            selectedFilePaths: item.analysis?.files.map((f) => f.path) ?? [],
                        })),
                    }),
                    false,
                    'selectAllFiles'
                ),

            deselectAllFiles: (localId) =>
                set(
                    (state) => ({
                        items: mapItem(state.items, localId, (item) => ({
                            ...item,
                            selectedFilePaths: [],
                        })),
                    }),
                    false,
                    'deselectAllFiles'
                ),

            setItemStorageProfile: (localId, storageProfileId) =>
                set(
                    (state) => ({
                        items: mapItem(state.items, localId, (item) => ({
                            ...item,
                            storageProfileId,
                        })),
                    }),
                    false,
                    'setItemStorageProfile'
                ),

            toggleExpanded: (localId) =>
                set(
                    (state) => ({
                        items: mapItem(state.items, localId, (item) => ({
                            ...item,
                            expanded: !item.expanded,
                        })),
                    }),
                    false,
                    'toggleExpanded'
                ),

            setSelectedStorageProfileId: (id) =>
                set({ selectedStorageProfileId: id }, false, 'setSelectedStorageProfileId'),

            clearTorrentData: () =>
                set(
                    { items: [], selectedStorageProfileId: null },
                    false,
                    'clearTorrentData'
                ),
        }),
        { name: 'TorrentStore' }
    )
)

// ============================================
// Selectors
// ============================================

export const selectItems = (state: TorrentStore) => state.items
export const selectSelectedStorageProfileId = (state: TorrentStore) =>
    state.selectedStorageProfileId

/** Items that can actually be started: analysed, not duplicate, with files chosen. */
export function selectStartableItems(state: TorrentStore) {
    return state.items.filter(
        (i) => i.status === 'ready' && i.analysis && i.selectedFilePaths.length > 0
    )
}

export function selectIsAnalyzing(state: TorrentStore) {
    return state.items.some((i) => i.status === 'analyzing' || i.status === 'pending')
}

/** Total bytes across every item's own selection. */
export function selectBatchSelectedSize(state: TorrentStore) {
    return state.items.reduce((total, item) => {
        if (!item.analysis) return total
        return (
            total +
            item.analysis.files
                .filter((f) => item.selectedFilePaths.includes(f.path))
                .reduce((acc, f) => acc + f.size, 0)
        )
    }, 0)
}

/** Bytes selected within a single item. */
export function getItemSelectedSize(item: TorrentBatchItem) {
    if (!item.analysis) return 0
    return item.analysis.files
        .filter((f) => item.selectedFilePaths.includes(f.path))
        .reduce((acc, f) => acc + f.size, 0)
}
