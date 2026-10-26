// Storage API client with Zod validation
import apiClient from '../axios'
import {
    StorageProfileSchema,
    StorageProfileDetailSchema,
    StorageProfilesArraySchema,
    SaveOAuthCredentialsRequestSchema,
    SaveOAuthCredentialsResponseSchema,
    OAuthCredentialsArraySchema,
    ConnectGoogleDriveRequestSchema,
    GoogleDriveAuthResponseSchema,
    ConfigureS3RequestSchema,
    StorageProfileHealthSchema,
    StorageProfileHealthArraySchema,
} from '@/types/storage'
import type {
    StorageProfile,
    StorageProfileDetail,
    StorageProfileHealth,
    SaveOAuthCredentialsRequest,
    SaveOAuthCredentialsResponse,
    OAuthCredential,
    ConnectGoogleDriveRequest,
    GoogleDriveAuthResponse,
    ConfigureS3Request,
} from '@/types/storage'

// Re-export types for convenience
export type { StorageProfile, StorageProfileDetail, StorageProfileHealth, SaveOAuthCredentialsRequest, SaveOAuthCredentialsResponse, OAuthCredential, ConnectGoogleDriveRequest, GoogleDriveAuthResponse, ConfigureS3Request }
export { getStorageErrorMessage, storageErrorMessages } from '@/types/storage'

/**
 * Save reusable OAuth app credentials (upserts by ClientId)
 * POST /api/storage/gdrive/credentials
 *
 * Saves credentials once — can be referenced by multiple /connect calls.
 */
export async function saveOAuthCredentials(
    data: SaveOAuthCredentialsRequest
): Promise<SaveOAuthCredentialsResponse> {
    const validatedData = SaveOAuthCredentialsRequestSchema.parse(data)
    const response = await apiClient.post<SaveOAuthCredentialsResponse>(
        '/storage/gdrive/credentials',
        validatedData
    )
    return SaveOAuthCredentialsResponseSchema.parse(response.data)
}

/**
 * List all saved OAuth app credentials for the current user
 * GET /api/storage/gdrive/credentials
 *
 * ClientSecret is never returned. ClientId is masked.
 */
export async function getOAuthCredentials(): Promise<OAuthCredential[]> {
    const response = await apiClient.get<OAuthCredential[]>(
        '/storage/gdrive/credentials'
    )
    return OAuthCredentialsArraySchema.parse(response.data)
}

/**
 * Connect a new Google Drive account using a saved credential
 * POST /api/storage/gdrive/connect
 *
 * Creates a new storage profile AND starts the OAuth flow in one step.
 * @returns Authorization URL to redirect the user to Google consent screen
 */
export async function connectGoogleDrive(
    data: ConnectGoogleDriveRequest
): Promise<GoogleDriveAuthResponse> {
    const validatedData = ConnectGoogleDriveRequestSchema.parse(data)
    const response = await apiClient.post<GoogleDriveAuthResponse>(
        '/storage/gdrive/connect',
        validatedData
    )
    return GoogleDriveAuthResponseSchema.parse(response.data)
}

/**
 * Re-authenticate a Google Drive profile when refresh token has expired
 * POST /api/storage/gdrive/{profileId}/reauthenticate
 *
 * Same flow as authenticate — no need to re-enter credentials.
 */
export async function reauthenticateGoogleDrive(
    profileId: number
): Promise<GoogleDriveAuthResponse> {
    const response = await apiClient.post<GoogleDriveAuthResponse>(
        `/storage/gdrive/${profileId}/reauthenticate`
    )
    return GoogleDriveAuthResponseSchema.parse(response.data)
}

/**
 * Storage profile result from S3 configuration
 */
interface S3ConfigureResult {
    success: boolean
    storageProfileId: number
    message: string
}

/**
 * Configure S3-compatible storage with user-provided credentials
 * POST /api/storage/configure-s3
 *
 * Supports AWS S3, Backblaze B2, Cloudflare R2, and other S3-compatible providers
 *
 * @param config - S3 credentials and bucket configuration
 * @returns Storage profile ID on success
 */
export async function configureS3(config: ConfigureS3Request): Promise<S3ConfigureResult> {
    // Validate request before sending
    const validatedConfig = ConfigureS3RequestSchema.parse(config)

    const response = await apiClient.post<S3ConfigureResult>(
        '/storage/s3/configure',
        validatedConfig
    )
    return response.data
}

/**
 * Get all storage profiles for the current user
 */
export async function getStorageProfiles(): Promise<StorageProfile[]> {
    const response = await apiClient.get<StorageProfile[]>('/storage/profiles')
    return StorageProfilesArraySchema.parse(response.data)
}

/**
 * Get a single storage profile by ID
 */
export async function getStorageProfile(id: number): Promise<StorageProfileDetail> {
    const response = await apiClient.get<StorageProfileDetail>(`/storage/profiles/${id}`)
    return StorageProfileDetailSchema.parse(response.data)
}

/**
 * Connection health for every active storage profile
 * GET /api/storage/profiles/health
 *
 * @param refresh - Bypass the server-side cache and call each provider live
 */
export async function getStorageProfilesHealth(refresh = false): Promise<StorageProfileHealth[]> {
    const response = await apiClient.get<StorageProfileHealth[]>(
        `/storage/profiles/health${refresh ? '?refresh=true' : ''}`
    )
    return StorageProfileHealthArraySchema.parse(response.data)
}

/**
 * Connection health for a single storage profile
 * GET /api/storage/profiles/{id}/health
 */
export async function getStorageProfileHealth(
    id: number,
    refresh = false
): Promise<StorageProfileHealth> {
    const response = await apiClient.get<StorageProfileHealth>(
        `/storage/profiles/${id}/health${refresh ? '?refresh=true' : ''}`
    )
    return StorageProfileHealthSchema.parse(response.data)
}

/**
 * Run a live connection test against a profile, bypassing the cache
 * POST /api/storage/profiles/{id}/health/check
 */
export async function checkStorageProfileHealth(id: number): Promise<StorageProfileHealth> {
    const response = await apiClient.post<StorageProfileHealth>(
        `/storage/profiles/${id}/health/check`
    )
    return StorageProfileHealthSchema.parse(response.data)
}

/**
 * Set a storage profile as the default
 */
export async function setDefaultStorageProfile(id: number): Promise<void> {
    await apiClient.post(`/storage/profiles/${id}/set-default`)
}

/**
 * Disconnect a storage profile (sets IsActive = false)
 */
export async function disconnectStorageProfile(id: number): Promise<void> {
    await apiClient.post(`/storage/profiles/${id}/disconnect`)
}

/**
 * Opens Google OAuth authorization URL in a popup window.
 * Listens for postMessage from /storage/callback and polls for the redirect as fallback.
 * Reusable for both authenticate and reauthenticate flows.
 *
 * @param authorizationUrl - The Google OAuth consent URL
 * @returns Promise that resolves with the profile ID on success
 */
export function openGoogleDriveAuthPopup(authorizationUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
        // Open popup window
        const width = 500
        const height = 600
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2

        const popup = window.open(
            authorizationUrl,
            'Google Drive Authorization',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        )

        if (!popup) {
            reject(new Error('POPUP_BLOCKED'))
            return
        }

        let isCompleted = false
        let pollTimer: ReturnType<typeof setInterval> | null = null
        let checkCallback: ReturnType<typeof setInterval> | null = null
        let timeoutTimer: ReturnType<typeof setTimeout> | null = null

        const cleanup = () => {
            if (pollTimer) clearInterval(pollTimer)
            if (checkCallback) clearInterval(checkCallback)
            if (timeoutTimer) clearTimeout(timeoutTimer)
            window.removeEventListener('message', handleMessage)
        }

        const handleSuccess = (profileId: number) => {
            if (isCompleted) return
            isCompleted = true
            cleanup()
            try {
                if (!popup.closed) {
                    popup.close()
                }
            } catch {
                // Ignore popup close error
            }
            resolve(profileId)
        }

        const handleError = (error: Error) => {
            if (isCompleted) return
            isCompleted = true
            cleanup()
            try {
                if (!popup.closed) {
                    popup.close()
                }
            } catch {
                // Ignore popup close error
            }
            reject(error)
        }

        // 1. Listen for postMessage from /storage/callback
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            const data = event.data
            if (!data || typeof data !== 'object') return

            if (data.type === 'TORRENTDRIVE_OAUTH_SUCCESS') {
                const id = parseInt(data.profileId, 10)
                if (Number.isInteger(id) && id > 0) {
                    handleSuccess(id)
                } else {
                    handleError(new Error(`Invalid profile ID returned from OAuth message: "${data.profileId}"`))
                }
            } else if (data.type === 'TORRENTDRIVE_OAUTH_ERROR') {
                handleError(new Error(data.error || 'Authentication failed'))
            }
        }

        window.addEventListener('message', handleMessage)

        // 2. Poll for popup closure (user closed it manually)
        pollTimer = setInterval(() => {
            if (popup.closed) {
                if (!isCompleted) {
                    handleError(new Error('AUTHORIZATION_CANCELLED'))
                }
            }
        }, 1000)

        // 3. Fallback: Poll for redirect to /storage/callback or /storage page
        checkCallback = setInterval(() => {
            try {
                const popupUrl = popup.location.href

                // Ignore if still on external Google domains or navigating through backend proxy
                if (
                    popupUrl &&
                    !popupUrl.includes('google') &&
                    !popupUrl.includes('accounts.google.com') &&
                    !popupUrl.includes('/proxy/')
                ) {
                    if (popupUrl.includes('/storage/callback') || popupUrl.includes('/storage')) {
                        const url = new URL(popupUrl)
                        const success = url.searchParams.get('success')
                        const profileId = url.searchParams.get('profileId')
                        const error = url.searchParams.get('error')
                        const message = url.searchParams.get('message')

                        if (success === 'true' && profileId) {
                            const id = parseInt(profileId, 10)
                            if (Number.isInteger(id) && id > 0) {
                                handleSuccess(id)
                            } else {
                                handleError(new Error(`Invalid profile ID returned from OAuth callback: "${profileId}"`))
                            }
                        } else if (error) {
                            handleError(new Error(error))
                        } else if (message) {
                            handleError(new Error(message))
                        }
                        // If no params match yet, do not reject! Keep waiting until params arrive or postMessage fires.
                    }
                }
            } catch {
                // Cross-origin error - popup is still on Google's domain
            }
        }, 500)

        // 4. Timeout after 5 minutes
        timeoutTimer = setTimeout(() => {
            handleError(new Error('AUTHORIZATION_TIMEOUT'))
        }, 5 * 60 * 1000)
    })
}
