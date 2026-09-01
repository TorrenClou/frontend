'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Gauge, Loader2 } from 'lucide-react'
import { useSystemSettings, useUpdateSystemSettings } from '@/hooks/useSettings'

/**
 * Instance-wide transfer and routing settings.
 *
 * These were environment variables until now, which meant editing a file and recreating
 * the container to change a retry count. The fields the backend flags in `requiresRestart`
 * are labelled as such — they are read once at process start, and silently accepting a
 * change that will not take effect is the confusing part worth avoiding.
 */
export function TransfersCard() {
    const { data: settings, isLoading } = useSystemSettings()
    const update = useUpdateSystemSettings()

    const [enableFailover, setEnableFailover] = useState(true)
    const [maxFailoverAttempts, setMaxFailoverAttempts] = useState('3')
    const [failureThreshold, setFailureThreshold] = useState('3')
    const [workerCount, setWorkerCount] = useState('10')

    useEffect(() => {
        if (!settings) return
        setEnableFailover(settings.enableFailover)
        setMaxFailoverAttempts(String(settings.maxFailoverAttempts))
        setFailureThreshold(String(settings.failureThreshold))
        setWorkerCount(String(settings.hangfireWorkerCount))
    }, [settings])

    const needsRestart = (field: string) => settings?.requiresRestart.includes(field) ?? false

    const handleSave = () => {
        if (!settings) return

        const { requiresRestart: _ignored, ...current } = settings

        update.mutate({
            ...current,
            enableFailover,
            maxFailoverAttempts: toNumber(maxFailoverAttempts, current.maxFailoverAttempts),
            failureThreshold: toNumber(failureThreshold, current.failureThreshold),
            hangfireWorkerCount: toNumber(workerCount, current.hangfireWorkerCount),
        })
    }

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    Transfers
                </CardTitle>
                <CardDescription>
                    How many transfers run at once, and what happens when a drive stops accepting
                    uploads
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
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
                            Send a job to another healthy drive instead of failing it.
                        </span>
                    </span>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                    <NumberField
                        id="max-failover"
                        label="Reroute attempts per job"
                        hint="Stops one job walking every drive you own when the real fault is the file."
                        value={maxFailoverAttempts}
                        onChange={setMaxFailoverAttempts}
                        min={0}
                        max={20}
                        disabled={!enableFailover}
                    />

                    <NumberField
                        id="failure-threshold"
                        label="Failures before a drive is unhealthy"
                        hint="Consecutive upload failures on one drive."
                        value={failureThreshold}
                        onChange={setFailureThreshold}
                        min={1}
                        max={100}
                    />

                    <NumberField
                        id="worker-count"
                        label="Concurrent transfers"
                        hint="A download holds a worker for its whole transfer, so this is the ceiling."
                        value={workerCount}
                        onChange={setWorkerCount}
                        min={1}
                        max={100}
                        restartRequired={needsRestart('HangfireWorkerCount')}
                    />
                </div>

                <Button onClick={handleSave} disabled={update.isPending}>
                    {update.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Save changes'
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}

interface NumberFieldProps {
    id: string
    label: string
    hint: string
    value: string
    onChange: (value: string) => void
    min: number
    max: number
    disabled?: boolean
    restartRequired?: boolean
}

function NumberField({
    id,
    label,
    hint,
    value,
    onChange,
    min,
    max,
    disabled,
    restartRequired,
}: NumberFieldProps) {
    return (
        <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={id} className="text-sm font-medium">
                    {label}
                </label>
                {restartRequired && (
                    <Badge variant="outline" className="text-[10px]">
                        Restart required
                    </Badge>
                )}
            </div>
            <Input
                id={id}
                type="number"
                min={min}
                max={max}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className="max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
    )
}

function toNumber(value: string, fallback: number): number {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : fallback
}
