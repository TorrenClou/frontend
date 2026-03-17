'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ExternalLink, Loader2, Info, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useSaveOAuthCredentials } from '@/hooks/useStorageProfiles'
import {
    SaveOAuthCredentialsRequestSchema,
    type SaveOAuthCredentialsRequest,
} from '@/types/storage'
import {
    useStorageProfilesStore,
    selectCredentialSaveError,
    selectIsCredentialsFormOpen,
} from '@/stores/storageProfilesStore'

const GOOGLE_CLOUD_CONSOLE_URL = 'https://console.cloud.google.com/apis/credentials'

// Form input type (before Zod transforms)
type OAuthCredentialsFormInput = {
    name?: string
    clientId: string
    clientSecret: string
    redirectUri: string
}

interface OAuthCredentialsFormProps {
    className?: string
}

export function OAuthCredentialsForm({ className }: OAuthCredentialsFormProps) {
    const saveCredentials = useSaveOAuthCredentials()
    const credentialSaveError = useStorageProfilesStore(selectCredentialSaveError)
    const isFormOpen = useStorageProfilesStore(selectIsCredentialsFormOpen)
    const { setCredentialsFormOpen, setCredentialSaveError } = useStorageProfilesStore()

    // Auto-generate redirect URI based on the current server URL (via proxy)
    // Uses window.location.origin so it always matches the actual server IP/hostname
    // e.g. http://192.168.1.100:47100/proxy/api/storage/gdrive/callback
    const defaultRedirectUri = `${window.location.origin}/proxy/api/storage/gdrive/callback`

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<OAuthCredentialsFormInput, unknown, SaveOAuthCredentialsRequest>({
        resolver: zodResolver(SaveOAuthCredentialsRequestSchema),
        defaultValues: {
            name: '',
            clientId: '',
            clientSecret: '',
            redirectUri: defaultRedirectUri,
        },
    })

    const onSubmit = (data: SaveOAuthCredentialsRequest) => {
        saveCredentials.mutate(data, {
            onSuccess: () => {
                reset()
            },
        })
    }

    const toggleForm = () => {
        setCredentialsFormOpen(!isFormOpen)
        setCredentialSaveError(null)
    }

    return (
        <div className={className}>
            <Button
                variant="outline"
                size="sm"
                onClick={toggleForm}
                className="w-full justify-between"
            >
                <span>+ Add New Credentials</span>
                {isFormOpen ? (
                    <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                    <ChevronDown className="h-4 w-4 ml-2" />
                )}
            </Button>

            {isFormOpen && (
                <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4 rounded-lg border p-4">
                    {/* Setup Guide Link */}
                    <div className="flex gap-3 rounded-lg border border-info/30 bg-info/10 p-3">
                        <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
                        <div className="text-sm">
                            You need OAuth credentials from Google Cloud Console.{' '}
                            <a
                                href={GOOGLE_CLOUD_CONSOLE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                                Open Console
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </div>

                    {/* Credential Name */}
                    <div>
                        <label htmlFor="credentialName" className="text-sm font-medium mb-1.5 block">
                            Name <span className="text-muted-foreground font-normal">(optional)</span>
                        </label>
                        <Input
                            id="credentialName"
                            {...register('name')}
                            placeholder="My GCP Project"
                            maxLength={255}
                            disabled={saveCredentials.isPending}
                        />
                        {errors.name && (
                            <p className="mt-1 text-sm text-danger">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Client ID */}
                    <div>
                        <label htmlFor="clientId" className="text-sm font-medium mb-1.5 block">
                            Client ID
                        </label>
                        <Input
                            id="clientId"
                            {...register('clientId')}
                            placeholder="123456789-xxxxx.apps.googleusercontent.com"
                            disabled={saveCredentials.isPending}
                        />
                        {errors.clientId && (
                            <p className="mt-1 text-sm text-danger">{errors.clientId.message}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                            Must end with .apps.googleusercontent.com
                        </p>
                    </div>

                    {/* Client Secret */}
                    <div>
                        <label htmlFor="clientSecret" className="text-sm font-medium mb-1.5 block">
                            Client Secret
                        </label>
                        <Input
                            id="clientSecret"
                            {...register('clientSecret')}
                            type="password"
                            placeholder="GOCSPX-..."
                            disabled={saveCredentials.isPending}
                        />
                        {errors.clientSecret && (
                            <p className="mt-1 text-sm text-danger">{errors.clientSecret.message}</p>
                        )}
                    </div>

                    {/* Redirect URI (auto-populated, read-only) */}
                    <div>
                        <label htmlFor="redirectUri" className="text-sm font-medium mb-1.5 block">
                            Redirect URI
                        </label>
                        <Input
                            id="redirectUri"
                            {...register('redirectUri')}
                            className="bg-muted"
                            readOnly
                            disabled={saveCredentials.isPending}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Add this URI to your Google Cloud OAuth Authorized redirect URIs
                        </p>
                    </div>

                    {/* Credential Save Error */}
                    {credentialSaveError && (
                        <div className="flex gap-3 rounded-lg border border-danger/30 bg-danger/10 p-3">
                            <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                            <div className="text-sm text-danger">{credentialSaveError}</div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex gap-2 justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={toggleForm}
                            disabled={saveCredentials.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={saveCredentials.isPending}
                        >
                            {saveCredentials.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Credentials'
                            )}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    )
}
