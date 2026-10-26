'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
    title: string
    value: string | number
    subtitle?: React.ReactNode
    icon: LucideIcon
    color: 'primary' | 'info' | 'success' | 'danger' | 'warning'
    loading?: boolean
    active?: boolean
    onClick?: () => void
    href?: string
    className?: string
}

const colorMap = {
    primary: {
        iconColor: 'text-primary-100',
        activeRing: 'ring-1 ring-primary/60 border-primary/50 bg-primary/[0.04]',
    },
    info: {
        iconColor: 'text-info-light',
        activeRing: 'ring-1 ring-info-medium/60 border-info-medium/50 bg-info/[0.04]',
    },
    success: {
        iconColor: 'text-success-medium',
        activeRing: 'ring-1 ring-success/60 border-success/50 bg-success/[0.04]',
    },
    danger: {
        iconColor: 'text-danger-light',
        activeRing: 'ring-1 ring-danger/60 border-danger/50 bg-danger/[0.04]',
    },
    warning: {
        iconColor: 'text-warning-light',
        activeRing: 'ring-1 ring-warning/60 border-warning/50 bg-warning/[0.04]',
    },
}

export function StatsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    loading,
    active,
    onClick,
    href,
    className,
}: StatsCardProps) {
    const config = colorMap[color] || colorMap.primary
    const isInteractive = Boolean(onClick || href)

    const card = (
        <Card
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={
                onClick
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onClick()
                          }
                      }
                    : undefined
            }
            className={cn(
                'group relative rounded-xl border border-surface-300/50 bg-surface-500/70 backdrop-blur-xs transition-[background-color,border-color,transform,box-shadow] duration-150 ease-out-quart',
                isInteractive &&
                    'cursor-pointer select-none hover:border-surface-200/70 hover:bg-surface-400/40 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                active
                    ? config.activeRing
                    : 'hover:shadow-xs',
                className
            )}
        >
            <CardContent className="p-4 sm:p-4.5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
                            {title}
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold mt-1 text-foreground font-mono tabular-nums tracking-tight">
                            {loading ? '—' : value}
                        </p>
                        {subtitle && (
                            <div className="mt-1 text-xs text-muted-foreground truncate tabular-nums">
                                {subtitle}
                            </div>
                        )}
                    </div>
                    <div
                        className={cn(
                            'h-9 w-9 shrink-0 rounded-lg flex items-center justify-center bg-surface-400/60 border border-surface-300/40 transition-colors duration-150 group-hover:bg-surface-300/50',
                            config.iconColor
                        )}
                    >
                        <Icon className="h-4 w-4" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )

    if (href) {
        return (
            <Link href={href} className="block focus-visible:outline-none">
                {card}
            </Link>
        )
    }

    return card
}
