// Storage Profile Types with Zod Validation
import { z } from 'zod'
import { StorageHealthStatus, StorageProviderType } from './enums'

// ============================================
// Zod Schemas
// ============================================

export const profileNameSchema = z
    .string()
    .min(3, 'Profile name must be at least 3 characters')
    .max(50, 'Profile name must be at most 50 characters')
    .regex(
        /^[a-zA-Z0-9\s\-_]+$/,
        'Profile name can only contain letters, numbers, spaces, hyphens, and underscores'
    )
    .trim()

export const StorageProfileSchema = z.object({
    id: z.number(),
    profileName: z.string(),
    providerType: z.nativeEnum(StorageProviderType),
    email: z.string().nullable(),
    isDefault: z.boolean(),
    isActive: z.boolean(),
    needsReauth: z.boolean(),
    isConfigured: z.boolean(),
    // Health fields reflect the last stored probe, not a live check.
    // Call getStorageProfileHealth/checkStorageProfileHealth for a fresh result.
    healthStatus: z.nativeEnum(StorageHealthStatus).default(StorageHealthStatus.Unknown),
    isUsable: z.boolean().default(true),
    healthMessage: z.string().nullable().default(null),
    lastHealthCheckAt: z.string().nullable().default(null),
    quotaTotalBytes: z.number().nullable().default(null),
    quotaUsedBytes: z.number().nullable().default(null),
    quotaFreeBytes: z.number().nullable().default(null),
    createdAt: z.string(),
})

/** Live connection probe result — GET /storage/profiles/{id}/health */
export const StorageProfileHealthSchema = z.object({
    profileId: z.number(),
    profileName: z.string(),
    providerType: z.string(),
    email: z.string().nullable(),
    status: z.nativeEnum(StorageHealthStatus),
    isUsable: z.boolean(),
    reason: z.string().nullable(),
    message: z.string().nullable(),
    needsReauth: z.boolean(),
    consecutiveFailures: z.number(),
    quotaTotalBytes: z.number().nullable(),
    quotaUsedBytes: z.number().nullable(),
    quotaFreeBytes: z.number().nullable(),
    checkedAt: z.string().nullable(),
    fromCache: z.boolean(),
})

export const StorageProfileHealthArraySchema = z.array(StorageProfileHealthSchema)

export const StorageProfileDetailSchema = StorageProfileSchema.extend({
    updatedAt: z.string().nullable(),
})

// ============================================
// OAuth Credentials Schemas (reusable credentials)
// ============================================

// Save/update reusable OAuth app credentials
export const SaveOAuthCredentialsRequestSchema = z.object({
    name: z.string()
        .max(255, 'Name must be at most 255 characters')
        .optional(),
    clientId: z.string()
        .min(1, 'Client ID is required')
        .max(500, 'Client ID is too long')
        .regex(
            /\.apps\.googleusercontent\.com$/,
            'Client ID must end with .apps.googleusercontent.com'
        ),
    clientSecret: z.string()
        .min(1, 'Client Secret is required')
        .max(500, 'Client Secret is too long'),
    redirectUri: z.string()
        .url('Redirect URI must be a valid URL'),
})

// Save credentials response
export const SaveOAuthCredentialsResponseSchema = z.object({
    credentialId: z.number(),
    name: z.string(),
})

// Saved OAuth credential (returned by GET /credentials)
export const OAuthCredentialSchema = z.object({
    id: z.number(),
    name: z.string(),
    clientIdMasked: z.string(),
    redirectUri: z.string(),
    createdAt: z.string(),
})

export const OAuthCredentialsArraySchema = z.array(OAuthCredentialSchema)

// Connect a Google Drive account using a saved credential
export const ConnectGoogleDriveRequestSchema = z.object({
    credentialId: z.number({ error: 'Please select a credential' }),
    profileName: z.string()
        .max(255, 'Profile name must be at most 255 characters')
        .optional(),
    setAsDefault: z.boolean().optional().default(false),
})

// Auth response (used by /connect and /reauthenticate)
export const GoogleDriveAuthResponseSchema = z.object({
    authorizationUrl: z.string().url(),
})

// ============================================
// S3 Configuration Schema
// ============================================

export const ConfigureS3RequestSchema = z.object({
    profileName: profileNameSchema,
    s3Endpoint: z.string()
        .min(1, 'Endpoint is required')
        .url('Endpoint must be a valid URL'),
    s3AccessKey: z.string()
        .min(1, 'Access Key is required'),
    s3SecretKey: z.string()
        .min(1, 'Secret Key is required'),
    s3BucketName: z.string()
        .min(3, 'Bucket Name is required and must be at least 3 characters')
        .max(63, 'Bucket name must be at most 63 characters')
        .regex(
            /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
            'Bucket name must start and end with a letter or number, and can only contain lowercase letters, numbers, hyphens, and periods'
        ),
    s3Region: z.string()
        .min(1, 'Region is required'),
    setAsDefault: z.boolean(),
})

export const StorageApiErrorSchema = z.object({
    code: z.string(),
    message: z.string(),
})

export const StorageProfilesArraySchema = z.array(StorageProfileSchema)

// ============================================
// Inferred Types from Schemas
// ============================================

export type ProfileName = z.infer<typeof profileNameSchema>
export type StorageProfile = z.infer<typeof StorageProfileSchema>
export type StorageProfileDetail = z.infer<typeof StorageProfileDetailSchema>
export type StorageProfileHealth = z.infer<typeof StorageProfileHealthSchema>
export type SaveOAuthCredentialsRequest = z.infer<typeof SaveOAuthCredentialsRequestSchema>
export type SaveOAuthCredentialsResponse = z.infer<typeof SaveOAuthCredentialsResponseSchema>
export type OAuthCredential = z.infer<typeof OAuthCredentialSchema>
export type ConnectGoogleDriveRequest = z.infer<typeof ConnectGoogleDriveRequestSchema>
export type GoogleDriveAuthResponse = z.infer<typeof GoogleDriveAuthResponseSchema>
export type StorageApiError = z.infer<typeof StorageApiErrorSchema>
export type ConfigureS3Request = z.infer<typeof ConfigureS3RequestSchema>

// ============================================
// Component Props Types
// ============================================

export interface StorageProfileCardProps {
    profile: StorageProfile
    onSetDefault?: (id: number) => Promise<void>
    onDelete?: (id: number) => Promise<void>
    className?: string
}

export interface StorageProfilesListProps {
    className?: string
}

// ============================================
// Error Messages
// ============================================

export const storageErrorMessages: Record<string, string> = {
    // Backend error codes (PascalCase - matching backend v2 format)
    'AuthUrlError': 'Failed to generate authorization URL. Please try again.',
    'InvalidState': 'The authorization state is invalid or expired. Please try again.',
    'UserMismatch': 'Authentication error. Please log in again.',
    'TokenExchangeFailed': 'Failed to exchange authorization code for tokens. Please verify your credentials match those in Google Cloud Console.',
    'OauthCallbackError': 'An error occurred during connection. Please try again later.',
    'ProfileNotFound': 'Storage profile not found.',
    'RedisError': 'Service temporarily unavailable. Please try again later.',
    'InvalidProfileName': 'Profile name contains invalid characters. Use only letters, numbers, spaces, hyphens, and underscores.',
    'ProfileNameTooShort': 'Profile name must be at least 3 characters.',
    'ProfileNameTooLong': 'Profile name must be at most 50 characters.',
    'DuplicateEmail': 'This Google account is already connected. Please use a different account.',
    'ProfileNotConfigured': 'This profile has not been configured with OAuth credentials yet.',
    'RefreshTokenExpired': 'Your Google Drive connection has expired. Please reconnect to continue.',
    'CredentialNotFound': 'Credential not found. Please refresh and try again.',
    'MissingCredentials': 'Profile has no linked OAuth credentials. Please save credentials and reconnect.',
    'InvalidClientId': 'Invalid Google OAuth Client ID. Ensure it ends with .apps.googleusercontent.com',
    'InvalidClientSecret': 'Client Secret is required.',
    'InvalidRedirectUri': 'Invalid redirect URI. Please verify the URL is correct.',
    // S3 errors
    'InvalidS3Config': 'One or more S3 configuration fields are invalid.',
    'InvalidS3Endpoint': 'Invalid S3 endpoint URL.',
    'InvalidS3Credentials': 'Invalid S3 access key or secret key.',
    'InvalidS3Bucket': 'Invalid S3 bucket name or bucket does not exist.',
    'S3ConnectionFailed': 'Failed to connect to S3. Please verify your credentials and endpoint.',
    'S3AccessDenied': 'Access denied. Please check your S3 permissions.',
    // Storage health / upload routing
    'StorageUnhealthy': 'That drive is not accepting uploads right now. Pick another one or reconnect it.',
    'StorageInactive': 'The storage profile for this job is no longer active.',
    'JobUploading': 'This job is uploading right now. Wait for it to finish or fail, then retry it against another drive.',
    // Client-side errors (SCREAMING_SNAKE_CASE - thrown locally, not from backend)
    'POPUP_BLOCKED': 'Popup blocked. Please allow popups for this site.',
    'AUTHORIZATION_CANCELLED': 'Authorization was cancelled.',
    'AUTHORIZATION_TIMEOUT': 'Authorization timed out. Please try again.',
}

export function getStorageErrorMessage(code: string, fallback?: string): string {
    return storageErrorMessages[code] || fallback || 'An unexpected error occurred'
}
