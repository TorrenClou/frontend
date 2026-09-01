// First-run setup API client
import { z } from 'zod'
import apiClient from '../axios'

export const setupStatusSchema = z.object({
    needsSetup: z.boolean(),
})

export type SetupStatus = z.infer<typeof setupStatusSchema>

export const createAdminRequestSchema = z.object({
    email: z.string().email('Enter a valid email address'),
    fullName: z.string().min(1, 'Enter a name'),
    password: z.string().min(12, 'Password must be at least 12 characters'),
})

export type CreateAdminRequest = z.infer<typeof createAdminRequestSchema>

/**
 * Whether this instance still needs its first-run setup.
 * GET /api/setup/status — anonymous.
 */
export async function getSetupStatus(): Promise<SetupStatus> {
    const response = await apiClient.get<SetupStatus>('/setup/status')
    return setupStatusSchema.parse(response.data)
}

/**
 * Claim the instance and create the admin account.
 * POST /api/setup/admin — anonymous, and refused with 409 on every call after the first.
 */
export async function createAdmin(request: CreateAdminRequest): Promise<void> {
    await apiClient.post('/setup/admin', request)
}

/**
 * Server-side equivalent of {@link getSetupStatus}, for the page components that decide
 * whether to send a visitor to the wizard.
 *
 * Goes straight to the backend rather than through the /proxy rewrite, which only exists
 * for the browser. Returns false when the backend cannot be reached: an instance whose
 * API is down should show its normal error path, not a setup wizard that would fail
 * anyway — and never a wizard on an instance that is merely unreachable for a moment.
 */
export async function getSetupStatusServerSide(): Promise<boolean> {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:47200'

    try {
        const response = await fetch(`${backendUrl}/api/setup/status`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
        })

        if (!response.ok) return false

        return setupStatusSchema.parse(await response.json()).needsSetup
    } catch {
        return false
    }
}
