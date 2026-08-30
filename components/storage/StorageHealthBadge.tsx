'use client'

import { Badge } from '@/components/ui/badge'
import { StorageHealthStatus } from '@/types/enums'
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const healthConfig: Record<
    StorageHealthStatus,
    { label: string; icon: React.ReactNode; className: string }
> = {
    [StorageHealthStatus.Healthy]: {
        label: 'Healthy',
        icon: <CheckCircle2 className="mr-1 h-3 w-3" />,
        className: 'border-success text-success',
    },
    [StorageHealthStatus.Degraded]: {
        label: 'Low space',
        icon: <AlertTriangle className="mr-1 h-3 w-3" />,
        className: 'border-warning text-warning',
    },
    [StorageHealthStatus.Unhealthy]: {
        label: 'Unavailable',
        icon: <XCircle className="mr-1 h-3 w-3" />,
        className: 'border-danger text-danger',
    },
    [StorageHealthStatus.Unknown]: {
        label: 'Not checked',
        icon: <HelpCircle className="mr-1 h-3 w-3" />,
        className: 'border-muted-foreground/40 text-muted-foreground',
    },
}

interface StorageHealthBadgeProps {
    status: StorageHealthStatus
    /** Shown as the native tooltip — typically the backend's health message. */
    message?: string | null
    className?: string
}

/**
 * Compact indicator of whether a storage profile can currently accept uploads.
 */
export function StorageHealthBadge({ status, message, className }: StorageHealthBadgeProps) {
    const config = healthConfig[status] ?? healthConfig[StorageHealthStatus.Unknown]

    return (
        <Badge
            variant="outline"
            className={cn(config.className, className)}
            title={message ?? config.label}
        >
            {config.icon}
            {config.label}
        </Badge>
    )
}

/**
 * Formats a byte count for quota display. Returns null when the provider reports
 * no limit, which is a meaningful state — not an error.
 */
export function formatQuota(bytes: number | null | undefined): string | null {
    if (bytes === null || bytes === undefined) return null

    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let value = bytes
    let unit = 0

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024
        unit++
    }

    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}
