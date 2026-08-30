'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import {
    getStorageProfiles,
    getStorageProfile,
    setDefaultStorageProfile,
    disconnectStorageProfile,
    saveOAuthCredentials,
    getOAuthCredentials,
    connectGoogleDrive,
    reauthenticateGoogleDrive,
    openGoogleDriveAuthPopup,
    configureS3,
    getStorageProfilesHealth,
    checkStorageProfileHealth,
} from '@/lib/api/storage'
import { getStorageErrorMessage } from '@/types/storage'
import type { StorageProfile, SaveOAuthCredentialsRequest, ConnectGoogleDriveRequest, ConfigureS3Request } from '@/types/storage'
import { useStorageProfilesStore } from '@/stores/storageProfilesStore'
import { extractApiError } from '@/lib/api/errors'
import { toast } from 'sonner'

// ============================================
// Query Keys
// ============================================

export const storageProfileKeys = {
    all: ['storage-profiles'] as const,
    lists: () => [...storageProfileKeys.all, 'list'] as const,
    list: () => [...storageProfileKeys.lists()] as const,
    details: () => [...storageProfileKeys.all, 'detail'] as const,
    detail: (id: number) => [...storageProfileKeys.details(), id] as const,
    credentials: () => [...storageProfileKeys.all, 'credentials'] as const,
    health: () => [...storageProfileKeys.all, 'health'] as const,
}

// ============================================
// Query Hooks
// ============================================

/**
 * Hook to fetch all storage profiles for the current user
 */
export function useStorageProfiles() {
    const { status } = useSession()

    return useQuery({
        queryKey: storageProfileKeys.list(),
        queryFn: getStorageProfiles,
        enabled: status === 'authenticated',
        staleTime: 30 * 1000, // 30 seconds
    })
}

/**
 * Hook to fetch a specific storage profile by ID
 */
export function useStorageProfile(profileId: number) {
    const { status } = useSession()

    return useQuery({
        queryKey: storageProfileKeys.detail(profileId),
        queryFn: () => getStorageProfile(profileId),
        enabled: status === 'authenticated' && !!profileId,
    })
}

/**
 * Hook to fetch connection health for every active storage profile.
 *
 * The backend caches probe results for a couple of minutes, so polling here is
 * cheap — it only reaches the provider when the cache has expired.
 */
export function useStorageProfilesHealth() {
    const { status } = useSession()

    return useQuery({
        queryKey: storageProfileKeys.health(),
        queryFn: () => getStorageProfilesHealth(),
        enabled: status === 'authenticated',
        staleTime: 60 * 1000,
        // Longer than the server's probe cache, so routine polling is served from cache
        // rather than hitting every provider on a timer.
        refetchInterval: 5 * 60 * 1000,
    })
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to run a live connection test against one profile, bypassing the cache
 */
export function useCheckStorageProfileHealth() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: checkStorageProfileHealth,

        onSuccess: (health) => {
            queryClient.invalidateQueries({ queryKey: storageProfileKeys.health() })
            queryClient.invalidateQueries({ queryKey: storageProfileKeys.list() })
            queryClient.invalidateQueries({ queryKey: storageProfileKeys.detail(health.profileId) })

            if (health.isUsable) {
                toast.success(`${health.profileName} is reachable`, {
                    description: health.message ?? 'Ready to accept uploads.',
                })
            } else {
                toast.error(`${health.profileName} is not accepting uploads`, {
                    description: health.message ?? health.reason ?? undefined,
                })
            }
        },

        onError: (error: unknown) => {
            const extracted = extractApiError(error)
            const errorMessage = extracted.code
                ? getStorageErrorMessage(extracted.code, extracted.message)
                : extracted.message
            toast.error('Connection test failed', { description: errorMessage })
        },
    })
}

/**
 * Hook to fetch all saved OAuth credentials
 */
export function useOAuthCredentials() {
    const { status } = useSession()

    return useQuery({
        queryKey: storageProfileKeys.credentials(),
        queryFn: getOAuthCredentials,
        enabled: status === 'authenticated',
        staleTime: 30 * 1000, // 30 seconds
    })
}

/**
 * Hook to save reusable OAuth app credentials
 * Upserts by ClientId — if the same ClientId exists, it updates instead of creating a duplicate.
 */
export function useSaveOAuthCredentials() {
    const queryClient = useQueryClient()
    const {
        setConnecting,
        setCredentialSaveError,
        setCredentialsFormOpen,
    } = useStorageProfilesStore()

    return useMutation({
        mutationFn: (data: SaveOAuthCredentialsRequest) => saveOAuthCredentials(data),

        onMutate: () => {
            setConnecting(true)
            setCredentialSaveError(null)
        },

        onSuccess: (result) => {
            setConnecting(false)
            setCredentialSaveError(null)
            setCredentialsFormOpen(false)
            queryClient.invalidateQueries({ queryKey: storageProfileKeys.credentials() })
            toast.success('Credentials saved', {
                description: `"${result.name}" is ready to use for connecting Google Drive accounts.`,
            })
        },

        onError: (error: unknown) => {
            setConnecting(false)
            const extracted = extractApiError(error)
            const errorMessage = extracted.code
                ? getStorageErrorMessage(extracted.code, extracted.message)
                : extracted.message
            // Use dedicated field so the error only surfaces in OAuthCredentialsForm
            setCredentialSaveError(errorMessage)
            toast.error('Failed to save credentials', { description: errorMessage })
        },
    })
}

/**
 * Hook to connect a new Google Drive account using a saved credential
 * Creates a profile AND starts OAuth in one step via popup
 */
export function useConnectGoogleDrive() {
    const queryClient = useQueryClient()
    const {
        setConnecting,
        setConnectionError,
        closeConnectModal,
    } = useStorageProfilesStore()

    return useMutation({
        mutationFn: async (data: ConnectGoogleDriveRequest) => {
            const { authorizationUrl } = await connectGoogleDrive(data)
            return openGoogleDriveAuthPopup(authorizationUrl)
        },

        onMutate: () => {
            setConnecting(true)
            setConnectionError(null)
        },

        onSuccess: (profileId) => {
            setConnecting(false)
            queryClient.invalidateQueries({ queryKey: storageProfileKeys.list() })
            queryClient.invalidateQueries({ queryKey: storageProfileKeys.detail(profileId) })
            closeConnectModal()
            toast.success('Google Drive connected successfully!')
        },

        onError: (error: unknown) => {
            setConnecting(false)
            const extracted = extractApiError(error)
            const errorMessage = extracted.code
                ? getStorageErrorMessage(extracted.code, extracted.message)
                : extracted.message
            setConnectionError(errorMessage)
            toast.error('Connection Failed', { description: errorMessage })
        },
    })
}

/**
 * Hook to re-authenticate a Google Drive profile when refresh token has expired
 * Opens a popup for Google OAuth consent flow — no need to re-enter credentials
 */
export function useReauthenticateGoogleDrive() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (profileId: number) => {
            const { authorizationUrl } = await reauthenticateGoogleDrive(profileId)
            return openGoogleDriveAuthPopup(authorizationUrl)
        },

        onSuccess: (profileId) => {
            queryClient.invalidateQueries({ queryKey: storageProfileKeys.list() })
            queryClient.invalidateQueries({ queryKey: storageProfileKeys.detail(profileId) })
            toast.success('Google Drive reconnected successfully!')
        },

        onError: (error: unknown) => {
            const extracted = extractApiError(error)
            const errorMessage = extracted.code
                ? getStorageErrorMessage(extracted.code, extracted.message)
                : extracted.message
            toast.error('Re-authentication Failed', { description: errorMessage })
        },
    })
}

export function useConfigureS3() {
    const queryClient = useQueryClient()
    const {
        setConnecting,
        setConnectionError,
        closeConnectModal,
    } = useStorageProfilesStore()

    return useMutation({
        mutationFn: (config: ConfigureS3Request) => configureS3(config),

        onMutate: () => {
            setConnecting(true)
            setConnectionError(null)
        },

        onSuccess: (result) => {
            setConnecting(false)
            // Invalidate and refetch profiles list
            queryClient.invalidateQueries({ queryKey: storageProfileKeys.list() })
            // Prefetch the new profile
            queryClient.invalidateQueries({ queryKey: storageProfileKeys.detail(result.storageProfileId) })
            // Close modal
            closeConnectModal()
            toast.success('S3 storage configured successfully!')
        },

        onError: (error: unknown) => {
            setConnecting(false)
            const extracted = extractApiError(error)
            const errorMessage = extracted.code
                ? getStorageErrorMessage(extracted.code, extracted.message)
                : extracted.message
            setConnectionError(errorMessage)
            toast.error('Configuration Failed', { description: errorMessage })
        },
    })
}

/**
 * Hook to set a storage profile as default
 */
export function useSetDefaultProfile() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: setDefaultStorageProfile,

        // Optimistic update
        onMutate: async (profileId: number) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: storageProfileKeys.list() })

            // Snapshot previous value
            const previousProfiles = queryClient.getQueryData<StorageProfile[]>(
                storageProfileKeys.list()
            )

            // Optimistically update
            queryClient.setQueryData<StorageProfile[]>(
                storageProfileKeys.list(),
                (old) =>
                    old?.map((p) => ({
                        ...p,
                        isDefault: p.id === profileId,
                    })) ?? []
            )

            return { previousProfiles }
        },

        // Rollback on error
        onError: (error, _profileId, context) => {
            if (context?.previousProfiles) {
                queryClient.setQueryData(
                    storageProfileKeys.list(),
                    context.previousProfiles
                )
            }
            toast.error('Failed to set default profile', {
                description: error instanceof Error ? error.message : 'Unknown error',
            })
        },

        // Always refetch after error or success
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: storageProfileKeys.list() })
        },

        onSuccess: () => {
            toast.success('Default profile updated')
        },
    })
}

/**
 * Hook to disconnect a storage profile
 */
export function useDisconnectProfile() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: disconnectStorageProfile,

        // Optimistic update
        onMutate: async (profileId: number) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: storageProfileKeys.list() })

            // Snapshot previous value
            const previousProfiles = queryClient.getQueryData<StorageProfile[]>(
                storageProfileKeys.list()
            )

            // Optimistically update isActive to false
            queryClient.setQueryData<StorageProfile[]>(
                storageProfileKeys.list(),
                (old) => old?.map((p) =>
                    p.id === profileId ? { ...p, isActive: false, isDefault: false } : p
                ) ?? []
            )

            return { previousProfiles }
        },

        // Rollback on error
        onError: (error, _profileId, context) => {
            if (context?.previousProfiles) {
                queryClient.setQueryData(
                    storageProfileKeys.list(),
                    context.previousProfiles
                )
            }
            toast.error('Failed to disconnect profile', {
                description: error instanceof Error ? error.message : 'Unknown error',
            })
        },

        // Always refetch after error or success
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: storageProfileKeys.list() })
        },

        onSuccess: () => {
            toast.success('Storage profile disconnected')
        },
    })
}

