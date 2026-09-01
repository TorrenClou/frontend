'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
    getUserSettings,
    updateUserSettings,
    getSystemSettings,
    updateSystemSettings,
    changePassword,
    getDownloadStorage,
    purgeDownloads,
} from '@/lib/api/settings'
import type {
    UpdateUserSettingsRequest,
    UpdateSystemSettingsRequest,
    ChangePasswordRequest,
} from '@/types/settings'
import { extractApiError } from '@/lib/api/errors'
import { jobsKeys } from './useJobs'

// ============================================
// Query Keys
// ============================================

export const settingsKeys = {
    all: ['settings'] as const,
    user: () => [...settingsKeys.all, 'user'] as const,
    system: () => [...settingsKeys.all, 'system'] as const,
    downloadStorage: () => [...settingsKeys.all, 'download-storage'] as const,
}

// ============================================
// Query Hooks
// ============================================

export function useUserSettings() {
    const { status } = useSession()

    return useQuery({
        queryKey: settingsKeys.user(),
        queryFn: getUserSettings,
        enabled: status === 'authenticated',
        staleTime: 60 * 1000,
    })
}

export function useSystemSettings() {
    const { status } = useSession()

    return useQuery({
        queryKey: settingsKeys.system(),
        queryFn: getSystemSettings,
        enabled: status === 'authenticated',
        staleTime: 60 * 1000,
    })
}

/**
 * Scans the downloads volume. Not polled — it walks the filesystem, so it refreshes
 * only on mount and after a purge.
 */
export function useDownloadStorage() {
    const { status } = useSession()

    return useQuery({
        queryKey: settingsKeys.downloadStorage(),
        queryFn: getDownloadStorage,
        enabled: status === 'authenticated',
        staleTime: 30 * 1000,
    })
}

// ============================================
// Mutation Hooks
// ============================================

export function useUpdateUserSettings() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (request: UpdateUserSettingsRequest) => updateUserSettings(request),

        onSuccess: (settings) => {
            queryClient.setQueryData(settingsKeys.user(), settings)
            toast.success('Settings saved')
        },

        onError: (error: unknown) => {
            const extracted = extractApiError(error)
            toast.error('Could not save settings', { description: extracted.message })
        },
    })
}

export function useUpdateSystemSettings() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (request: UpdateSystemSettingsRequest) => updateSystemSettings(request),

        onSuccess: (settings) => {
            queryClient.setQueryData(settingsKeys.system(), settings)
            toast.success('Settings saved')
        },

        onError: (error: unknown) => {
            const extracted = extractApiError(error)
            toast.error('Could not save settings', { description: extracted.message })
        },
    })
}

export function useChangePassword() {
    return useMutation({
        mutationFn: (request: ChangePasswordRequest) => changePassword(request),

        onSuccess: () => {
            toast.success('Password changed')
        },

        onError: (error: unknown) => {
            const extracted = extractApiError(error)
            toast.error('Could not change password', { description: extracted.message })
        },
    })
}

export function usePurgeDownloads() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: purgeDownloads,

        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: settingsKeys.downloadStorage() })
            // Freed space does not change job rows, but the jobs list shows sizes.
            queryClient.invalidateQueries({ queryKey: jobsKeys.all })

            if (result.deletedCount === 0) {
                toast.info('Nothing to purge')
                return
            }

            const freed = formatBytes(result.freedBytes)

            if (result.failedCount > 0) {
                toast.warning(
                    `Freed ${freed} from ${result.deletedCount} job${result.deletedCount === 1 ? '' : 's'}`,
                    { description: `${result.failedCount} could not be removed and were left in place.` }
                )
                return
            }

            toast.success(
                `Freed ${freed} from ${result.deletedCount} job${result.deletedCount === 1 ? '' : 's'}`
            )
        },

        onError: (error: unknown) => {
            const extracted = extractApiError(error)
            toast.error('Purge failed', { description: extracted.message })
        },
    })
}

function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let value = bytes
    let unit = 0
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024
        unit++
    }
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}
