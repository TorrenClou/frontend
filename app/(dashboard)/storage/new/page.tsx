'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Cloud, Server, HardDrive, CheckCircle } from 'lucide-react'
import { StorageProviderType } from '@/types/enums'
import { GoogleDriveConfigForm, S3ConfigForm } from '@/components/storage'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const providers = [
    {
        type: StorageProviderType.GoogleDrive,
        name: 'Google Drive',
        description: 'Connect with your own Google Cloud credentials',
        icon: Cloud,
        color: 'text-primary',
        bgColor: 'bg-primary/20',
        available: true,
    },
    {
        type: StorageProviderType.OneDrive,
        name: 'OneDrive',
        description: 'Connect your Microsoft account',
        icon: Cloud,
        color: 'text-info',
        bgColor: 'bg-info/20',
        available: false, // Coming soon
    },
    {
        type: StorageProviderType.Dropbox,
        name: 'Dropbox',
        description: 'Connect your Dropbox account',
        icon: Cloud,
        color: 'text-warning',
        bgColor: 'bg-warning/20',
        available: false, // Coming soon
    },
    {
        type: StorageProviderType.S3,
        name: 'S3 Compatible',
        description: 'AWS S3, Backblaze B2, Cloudflare R2, and more',
        icon: Server,
        color: 'text-danger',
        bgColor: 'bg-danger/20',
        available: true,
    },
]

export default function NewStoragePage() {
    const [selectedProvider, setSelectedProvider] = useState<StorageProviderType | null>(null)
    const router = useRouter()

    const selectedProviderInfo = providers.find(p => p.type === selectedProvider)

    const handleSuccess = () => {
        router.push('/storage')
    }

    return (
        <div className="space-y-8 max-w-3xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/storage">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Add Storage Profile</h1>
                    <p className="text-muted-foreground">Connect a cloud storage provider</p>
                </div>
            </div>

            {/* Provider Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Provider</CardTitle>
                    <CardDescription>Choose where you want your files to be stored</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {providers.map((provider) => {
                            const Icon = provider.icon
                            const isSelected = selectedProvider === provider.type
                            const isDisabled = !provider.available

                            return (
                                <button
                                    key={provider.type}
                                    onClick={() => !isDisabled && setSelectedProvider(provider.type)}
                                    disabled={isDisabled}
                                    className={cn(
                                        'flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all relative',
                                        isSelected
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50',
                                        isDisabled && 'opacity-50 cursor-not-allowed hover:border-border'
                                    )}
                                >
                                    <div className={cn(
                                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                                        provider.bgColor,
                                        provider.color
                                    )}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{provider.name}</h3>
                                            {isSelected && (
                                                <CheckCircle className="h-4 w-4 text-primary" />
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {provider.description}
                                        </p>
                                        {isDisabled && (
                                            <span className="text-xs text-warning mt-1 inline-block">
                                                Coming Soon
                                            </span>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Connection Card */}
            {selectedProvider && selectedProviderInfo?.available && (
                <Card>
                    <CardHeader>
                        <CardTitle>Connect {selectedProviderInfo.name}</CardTitle>
                        <CardDescription>
                            {selectedProvider === StorageProviderType.GoogleDrive
                                ? 'Manage your Google OAuth credentials and connect Drive accounts'
                                : selectedProvider === StorageProviderType.S3
                                    ? 'Enter your S3-compatible storage credentials'
                                    : 'Configure your storage connection'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {selectedProvider === StorageProviderType.GoogleDrive && (
                            <GoogleDriveConfigForm onSuccess={handleSuccess} />
                        )}
                        {selectedProvider === StorageProviderType.S3 && (
                            <S3ConfigForm onSuccess={handleSuccess} />
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Info */}
            <Card className="bg-surface-tonal">
                <CardContent className="p-6">
                    <div className="flex gap-4">
                        <HardDrive className="h-6 w-6 text-muted-foreground shrink-0" />
                        <div className="text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">About Storage Profiles</p>
                            <p className="mt-1">
                                Storage profiles allow TorrentDrive to upload downloaded files directly to your cloud storage.
                                Your credentials are encrypted and stored securely.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
