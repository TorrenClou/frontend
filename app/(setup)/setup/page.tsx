'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, FileText, Loader2 } from 'lucide-react'
import { GoogleDriveConfigForm } from '@/components/storage/GoogleDriveConfigForm'
import { S3ConfigForm } from '@/components/storage/S3ConfigForm'
import { SetupAccountStep } from '@/components/setup/SetupAccountStep'
import { SetupPreferencesStep } from '@/components/setup/SetupPreferencesStep'
import { getSetupStatus } from '@/lib/api/setup'

type Step = 1 | 2 | 3

const STEPS: { number: Step; label: string }[] = [
    { number: 1, label: 'Account' },
    { number: 2, label: 'Storage' },
    { number: 3, label: 'Preferences' },
]

/**
 * First-run wizard: claim the instance, connect somewhere to upload to, pick a couple of
 * defaults.
 *
 * Only step 1 is required — it is the one that creates the account. Storage and
 * preferences are both reachable later from the app, so making them mandatory here would
 * only trap someone who does not yet have their Google Cloud credentials to hand.
 */
export default function SetupPage() {
    const router = useRouter()
    const [step, setStep] = useState<Step>(1)
    const [checking, setChecking] = useState(true)
    const [storageProvider, setStorageProvider] = useState<'gdrive' | 's3' | null>(null)

    // An instance that is already configured must not show this page: the API would refuse
    // the claim anyway, and a wizard that cannot succeed is worse than no wizard.
    useEffect(() => {
        let active = true

        getSetupStatus()
            .then((status) => {
                if (!active) return
                if (!status.needsSetup) {
                    router.replace('/dashboard')
                    return
                }
                setChecking(false)
            })
            .catch(() => {
                // Backend unreachable. Show the wizard rather than a dead end — the first
                // submit will report the real problem.
                if (active) setChecking(false)
            })

        return () => {
            active = false
        }
    }, [router])

    const finish = () => {
        router.replace('/dashboard')
        router.refresh()
    }

    if (checking) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-primary/20 via-background to-teal-secondary/20 p-4">
            <div className="w-full max-w-2xl space-y-6">
                <div className="flex flex-col items-center space-y-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-teal-primary to-teal-secondary">
                        <FileText className="h-7 w-7 text-gray-900" />
                    </div>
                    <h1 className="text-2xl font-bold">Welcome to TorrenClou</h1>
                    <p className="text-center text-sm text-muted-foreground">
                        A few things to set up, then you are done
                    </p>
                </div>

                <ol className="flex items-center justify-center gap-2 sm:gap-4">
                    {STEPS.map(({ number, label }, index) => (
                        <li key={number} className="flex items-center gap-2 sm:gap-4">
                            <div className="flex items-center gap-2">
                                <span
                                    className={
                                        step > number
                                            ? 'flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground'
                                            : step === number
                                                ? 'flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary text-xs font-semibold text-primary'
                                                : 'flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-muted-foreground'
                                    }
                                >
                                    {step > number ? <Check className="h-3.5 w-3.5" /> : number}
                                </span>
                                <span
                                    className={
                                        step >= number
                                            ? 'hidden text-sm font-medium sm:inline'
                                            : 'hidden text-sm text-muted-foreground sm:inline'
                                    }
                                >
                                    {label}
                                </span>
                            </div>
                            {index < STEPS.length - 1 && (
                                <span className="h-px w-6 bg-border sm:w-10" aria-hidden />
                            )}
                        </li>
                    ))}
                </ol>

                <Card>
                    {step === 1 && (
                        <>
                            <CardHeader>
                                <CardTitle>Create your account</CardTitle>
                                <CardDescription>
                                    This becomes the admin account for this instance.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SetupAccountStep onComplete={() => setStep(2)} />
                            </CardContent>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <CardHeader>
                                <CardTitle>Connect your cloud storage</CardTitle>
                                <CardDescription>
                                    Where your downloads get uploaded to. You can add more later.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {storageProvider === null && (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Button
                                            variant="outline"
                                            className="h-auto justify-start py-4"
                                            onClick={() => setStorageProvider('gdrive')}
                                        >
                                            <span className="text-left">
                                                <span className="block font-medium">Google Drive</span>
                                                <span className="block text-xs text-muted-foreground">
                                                    Uses your own Google Cloud credentials
                                                </span>
                                            </span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-auto justify-start py-4"
                                            onClick={() => setStorageProvider('s3')}
                                        >
                                            <span className="text-left">
                                                <span className="block font-medium">S3-compatible</span>
                                                <span className="block text-xs text-muted-foreground">
                                                    AWS, Backblaze, R2, Wasabi, MinIO
                                                </span>
                                            </span>
                                        </Button>
                                    </div>
                                )}

                                {storageProvider === 'gdrive' && (
                                    <GoogleDriveConfigForm onSuccess={() => setStep(3)} />
                                )}
                                {storageProvider === 's3' && (
                                    <S3ConfigForm onSuccess={() => setStep(3)} />
                                )}

                                <div className="flex gap-2 pt-2">
                                    {storageProvider !== null && (
                                        <Button variant="ghost" onClick={() => setStorageProvider(null)}>
                                            Back
                                        </Button>
                                    )}
                                    <Button variant="outline" className="ml-auto" onClick={() => setStep(3)}>
                                        Skip for now
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <CardHeader>
                                <CardTitle>Preferences</CardTitle>
                                <CardDescription>
                                    All of these can be changed later in Settings.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SetupPreferencesStep onComplete={finish} />
                            </CardContent>
                        </>
                    )}
                </Card>
            </div>
        </div>
    )
}
