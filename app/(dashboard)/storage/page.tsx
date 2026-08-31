'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { StorageProfilesList } from '@/components/storage'
import { storageProfileKeys } from '@/hooks/useStorageProfiles'
import { getStorageErrorMessage } from '@/types/storage'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

function OAuthCallbackHandler() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const queryClient = useQueryClient()

    // Handle OAuth callback redirect parameters
    useEffect(() => {
        const success = searchParams.get('success')
        const profileId = searchParams.get('profileId')
        const error = searchParams.get('error')
        const message = searchParams.get('message')

        if (success === 'true' && profileId) {
            // OAuth succeeded
            toast.success('Google Drive connected successfully!', {
                description: `Profile ID: ${profileId}`,
            })
            // Refresh the profiles list
            queryClient.invalidateQueries({ queryKey: storageProfileKeys.list() })
            // Clean up URL
            router.replace('/storage', { scroll: false })
        } else if (error || message) {
            // OAuth failed
            const errorCode = error || 'UNKNOWN_ERROR'
            const errorMessage = getStorageErrorMessage(errorCode, message || 'Connection failed')
            toast.error('Connection Failed', {
                description: errorMessage,
            })
            // Clean up URL
            router.replace('/storage', { scroll: false })
        }
    }, [searchParams, router, queryClient])

    return null
}

export default function StoragePage() {
    return (
        <div className="space-y-8">
            {/* OAuth Callback Handler */}
            <Suspense fallback={null}>
                <OAuthCallbackHandler />
            </Suspense>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Storage Profiles</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your cloud storage connections
                    </p>
                </div>
                <Button asChild size="lg">
                    <Link href="/storage/new">
                        <Plus className="mr-2 h-5 w-5" />
                        Add Profile
                    </Link>
                </Button>
            </div>

            {/* Storage List */}
            <StorageProfilesList />
        </div>
    )
}
