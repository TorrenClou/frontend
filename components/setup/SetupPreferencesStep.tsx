'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import {
    useUserSettings,
    useUpdateUserSettings,
    useSystemSettings,
    useUpdateSystemSettings,
} from '@/hooks/useSettings'

interface SetupPreferencesStepProps {
    onComplete: () => void
}

export function SetupPreferencesStep({ onComplete }: SetupPreferencesStepProps) {
    const { data: userSettings } = useUserSettings()
    const { data: systemSettings } = useSystemSettings()
    const updateUser = useUpdateUserSettings()
    const updateSystem = useUpdateSystemSettings()

    const [deleteAfterUpload, setDeleteAfterUpload] = useState(true)
    const [enableFailover, setEnableFailover] = useState(true)
    const [workerCount, setWorkerCount] = useState('10')

    useEffect(() => {
        if (userSettings) setDeleteAfterUpload(userSettings.deleteAfterUpload)
    }, [userSettings])

    useEffect(() => {
        if (systemSettings) {
            setEnableFailover(systemSettings.enableFailover)
            setWorkerCount(String(systemSettings.hangfireWorkerCount))
        }
    }, [systemSettings])

    const isSaving = updateUser.isPending || updateSystem.isPending

    const handleSave = async () => {
        const workers = Number.parseInt(workerCount, 10)

        try {
            await updateUser.mutateAsync({ deleteAfterUpload })

            if (systemSettings) {
                const { requiresRestart: _ignored, ...current } = systemSettings

                await updateSystem.mutateAsync({
                    ...current,
                    enableFailover,
                    hangfireWorkerCount: Number.isFinite(workers) ? workers : current.hangfireWorkerCount,
                })
            }

            onComplete()
        } catch {
            // Both hooks already toast.
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background/40 p-3.5">
                <label htmlFor="setup-delete-after-upload" className="cursor-pointer space-y-0.5">
                    <span className="block text-sm font-medium">Delete downloads after upload</span>
                    <span className="block text-xs text-muted-foreground">
                        Reclaims disk space as soon as every file has reached your cloud storage.
                        Turn it off and the files stay until you purge them.
                    </span>
                </label>
                <Switch
                    id="setup-delete-after-upload"
                    checked={deleteAfterUpload}
                    onCheckedChange={setDeleteAfterUpload}
                />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background/40 p-3.5">
                <label htmlFor="setup-enable-failover" className="cursor-pointer space-y-0.5">
                    <span className="block text-sm font-medium">Reroute failed uploads</span>
                    <span className="block text-xs text-muted-foreground">
                        If a drive stops accepting uploads, send the job to another healthy one
                        instead of failing it.
                    </span>
                </label>
                <Switch
                    id="setup-enable-failover"
                    checked={enableFailover}
                    onCheckedChange={setEnableFailover}
                />
            </div>

            <div className="space-y-1.5 pt-1">
                <label htmlFor="workers" className="block text-sm font-medium">
                    Concurrent transfers
                </label>
                <Input
                    id="workers"
                    type="number"
                    min={1}
                    max={100}
                    value={workerCount}
                    onChange={(e) => setWorkerCount(e.target.value)}
                    className="max-w-[120px] font-mono"
                />
                <p className="text-xs text-muted-foreground">
                    A download holds a worker for its whole transfer, so this is the ceiling on
                    how many torrents run at once. Raising it needs a restart.
                </p>
            </div>

            <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={isSaving} className="flex-1" size="lg">
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Finish setup'
                    )}
                </Button>
                <Button variant="outline" size="lg" onClick={onComplete} disabled={isSaving}>
                    Skip
                </Button>
            </div>
        </div>
    )
}