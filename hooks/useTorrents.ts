'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { analyzeTorrentFile, createJobs, getTorrentErrorMessage } from '@/lib/api/torrents'
import { useTorrentStore } from '@/stores/torrentStore'
import type { BatchJobCreationResult, CreateJobItem } from '@/types/torrents'
import { extractApiError } from '@/lib/api/errors'
import { jobsKeys } from './useJobs'

// ============================================
// Query Keys
// ============================================

export const torrentKeys = {
    all: ['torrents'] as const,
    analysis: () => [...torrentKeys.all, 'analysis'] as const,
}

// ============================================
// Error Handler
// ============================================

function handleTorrentError(error: unknown): string {
    const extracted = extractApiError(error)
    if (extracted.code) {
        return getTorrentErrorMessage(extracted.code)
    }
    return extracted.message
}

// ============================================
// Mutation Hooks
// ============================================

/** How many torrents to analyse at once. Each call scrapes trackers server-side. */
const ANALYSIS_CONCURRENCY = 3

/**
 * Hook for analysing a batch of torrent files.
 *
 * Fans out one request per torrent with a small concurrency cap, updating each item in
 * the store as it resolves. A failing torrent marks only its own row — the batch always
 * settles rather than rejecting, so a single bad file never discards the good ones.
 */
export function useBatchTorrentAnalysis() {
    const { setItemAnalyzing, setItemAnalysis, setItemError } = useTorrentStore()

    return useMutation({
        mutationFn: async (items: { localId: string; file: File }[]): Promise<void> => {
            const queue = [...items]

            const runWorker = async (): Promise<void> => {
                while (queue.length > 0) {
                    const next = queue.shift()
                    if (!next) return

                    setItemAnalyzing(next.localId)

                    try {
                        const analysis = await analyzeTorrentFile(next.file)
                        setItemAnalysis(next.localId, analysis)
                    } catch (error) {
                        setItemError(next.localId, handleTorrentError(error))
                    }
                }
            }

            await Promise.all(
                Array.from({ length: Math.min(ANALYSIS_CONCURRENCY, items.length) }, runWorker)
            )
        },
        onError: (error) => {
            // Per-torrent failures are handled above; this only fires on a bug in the
            // fan-out itself, which would otherwise fail silently.
            toast.error(handleTorrentError(error))
        },
    })
}

/**
 * Hook for starting every ready torrent in the batch.
 *
 * Sends one request carrying each torrent's own file selection and destination override.
 * The response reports items individually, so this reports a partial result rather than
 * assuming the whole batch started.
 */
export function useStartBatchDownload() {
    const router = useRouter()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (): Promise<BatchJobCreationResult> => {
            const { items, selectedStorageProfileId } = useTorrentStore.getState()

            const startable = items.filter(
                (i) => i.status === 'ready' && i.analysis && i.selectedFilePaths.length > 0
            )

            if (startable.length === 0) {
                throw new Error('Select at least one file in at least one torrent')
            }

            const missingDestination = startable.some(
                (i) => (i.storageProfileId ?? selectedStorageProfileId) == null
            )
            if (missingDestination) {
                throw new Error('Please select a storage destination')
            }

            const payload: CreateJobItem[] = startable.map((item) => ({
                torrentFileId: item.analysis!.torrentFileId,
                // null means "all files" to the API — matches the single-torrent flow and
                // keeps the job's SelectedFilePaths null when nothing was deselected.
                selectedFilePaths:
                    item.selectedFilePaths.length === item.analysis!.files.length
                        ? null
                        : item.selectedFilePaths,
                storageProfileId: item.storageProfileId,
            }))

            return createJobs({
                storageProfileId: selectedStorageProfileId,
                items: payload,
            })
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: jobsKeys.all })

            const total = result.succeededCount + result.failedCount

            if (result.failedCount === 0) {
                useTorrentStore.getState().clearTorrentData()
                toast.success(
                    result.succeededCount === 1
                        ? 'Download started!'
                        : `${result.succeededCount} downloads started!`
                )
                router.push('/jobs')
                return
            }

            // Partial success: drop the started torrents and stay put, so the rejected
            // rows remain on screen with their reason instead of vanishing on a redirect.
            const store = useTorrentStore.getState()
            const startedIds = new Set(
                result.results.filter((r) => r.success).map((r) => r.torrentFileId)
            )

            for (const item of store.items) {
                if (item.analysis && startedIds.has(item.analysis.torrentFileId)) {
                    store.removeItem(item.localId)
                }
            }

            for (const failure of result.results.filter((r) => !r.success)) {
                const item = store.items.find(
                    (i) => i.analysis?.torrentFileId === failure.torrentFileId
                )
                if (item) {
                    store.setItemError(
                        item.localId,
                        failure.errorMessage ??
                            (failure.errorCode ? getTorrentErrorMessage(failure.errorCode) : 'Could not start')
                    )
                }
            }

            toast.warning(`Started ${result.succeededCount} of ${total} torrents`, {
                description: 'The torrents that could not start are still listed below.',
            })
        },
        onError: (error) => {
            toast.error(handleTorrentError(error))
        },
    })
}
