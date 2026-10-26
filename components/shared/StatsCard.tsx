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

const colorClasses = {
    primary: {
        surface: 'bg-surface-tonal-500/80 border-primary/25',
        activeRing: 'ring-2 ring-primary border-primary/60 bg-primary/15',
        hoverBorder: 'hover:border-primary/50 hover:bg-surface-tonal-400/60',
        text: 'text-primary',
        iconBg: 'bg-primary/15 border border-primary/25',
    },
    info: {
        surface: 'bg-surface-tonal-500/80 border-info/25',
        activeRing: 'ring-2 ring-info-medium border-info-medium/60 bg-info/15',
        hoverBorder: 'hover:border-info-medium/50 hover:bg-surface-tonal-400/60',
        text: 'text-info-medium',
        iconBg: 'bg-info/15 border border-info/25',
    },
    success: {
        surface: 'bg-surface-tonal-500/80 border-success/25',
        activeRing: 'ring-2 ring-success border-success/60 bg-success/15',
        hoverBorder: 'hover:border-success/50 hover:bg-surface-tonal-400/60',
        text: 'text-success',
        iconBg: 'bg-success/15 border border-success/25',
    },
    danger: {
        surface: 'bg-surface-tonal-500/80 border-danger/25',
        activeRing: 'ring-2 ring-danger border-danger/60 bg-danger/15',
        hoverBorder: 'hover:border-danger/50 hover:bg-surface-tonal-400/60',
        text: 'text-danger',
        iconBg: 'bg-danger/15 border border-danger/25',
    },
    warning: {
        surface: 'bg-surface-tonal-500/80 border-warning/25',
        activeRing: 'ring-2 ring-warning border-warning/60 bg-warning/15',
        hoverBorder: 'hover:border-warning/50 hover:bg-surface-tonal-400/60',
        text: 'text-warning',
        iconBg: 'bg-warning/15 border border-warning/25',
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
    const colors = colorClasses[color]
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
                colors.surface,
                'transition-[background-color,border-color,transform] duration-150 ease-out-quart',
                isInteractive &&
                    cn(
                        'cursor-pointer select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        colors.hoverBorder
                    ),
                active && colors.activeRing,
                className
            )}
        >
            <CardContent className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground tracking-tight">
                            {title}
                        </p>
                        <p className={cn('text-2xl sm:text-3xl font-bold mt-1 font-mono tabular-nums', colors.text)}>
                            {loading ? '—' : value}
                        </p>
                        {subtitle && (
                            <div className="mt-1.5 text-xs text-muted-foreground truncate tabular-nums">
                                {subtitle}
                            </div>
                        )}
                    </div>
                    <div className={cn('h-11 w-11 shrink-0 rounded-xl flex items-center justify-center', colors.iconBg)}>
                        <Icon className={cn('h-5 w-5', colors.text)} />
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
