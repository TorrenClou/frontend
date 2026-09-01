'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

/**
 * The two or three choices worth making before the first download, and nothing else.
 *
 * Everything on this screen is also in Settings, so it stays deliberately short: this is
 * the last thing between a new install and using it, and a long form here is a form
 * people click through without reading.
 */
export function SetupPreferencesStep({ onComplete }: SetupPreferencesStepProps) {
    const { data: userSettings } = useUserSettings()
    const { data: systemSettings } = useSystemSettings()
    const updateUser = useUpdateUserSettings()
    const updateSystem = useUpdateSystemSettings()

    const [deleteAfterUpload, setDeleteAfterUpload] = useState(true)
    const [enableFailover, setEnableFailover] = useState(true)
    const [workerCount, setWorkerCount] = useState('10')

    // Seeded from the server rather than hardcoded, so the wizard shows the same defaults
    // the backend actually applied.
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
            // Both hooks already toast. Staying on this step lets the user correct a value
            // rather than silently skipping past a setting that did not save.
        }
    }

    return (
        <div className="space-y-5">
            <label className="flex cursor-pointer items-start gap-3">
                <input
                    type="checkbox"
                    checked={deleteAfterUpload}
                    onChange={(e) => setDeleteAfterUpload(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                />
                <span>
                    <span className="block text-sm font-medium">Delete downloads after upload</span>
                    <span className="block text-xs text-muted-foreground">
                        Reclaims disk space as soon as every file has reached your cloud storage.
                        Turn it off and the files stay until you purge them.
                    </span>
                </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
                <input
                    type="checkbox"
                    checked={enableFailover}
                    onChange={(e) => setEnableFailover(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                />
                <span>
                    <span className="block text-sm font-medium">Reroute failed uploads</span>
                    <span className="block text-xs text-muted-foreground">
                        If a drive stops accepting uploads, send the job to another healthy one
                        instead of failing it.
                    </span>
                </span>
            </label>

            <div className="space-y-1.5">
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
                    className="max-w-[120px]"
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
