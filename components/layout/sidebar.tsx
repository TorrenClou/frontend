'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Upload,
  FolderOpen,
  HardDrive,
  FileText,
  ChevronDown,
  ChevronRight,
  Settings,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useHealth } from '@/hooks/useHealth'
import type { HealthStatus } from '@/lib/api/health'

function HealthWidget() {
  const { data, isLoading } = useHealth()

  const status: HealthStatus = isLoading ? 'loading' : data?.status ?? 'down'

  const dotClass: Record<HealthStatus | 'loading', string> = {
    loading:      'bg-muted-foreground animate-pulse',
    operational:  'bg-success',
    degraded:     'bg-warning animate-pulse-slow',
    down:         'bg-danger',
  }

  const label: Record<HealthStatus | 'loading', string> = {
    loading:     'Checking...',
    operational: 'All Systems OK',
    degraded:    'Degraded',
    down:        'Service Down',
  }

  const ready = data?.data

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
      <span className={cn('h-2 w-2 rounded-full shrink-0', dotClass[status])} />
      <div className="min-w-0 flex-1">
        <p className={cn(
          'text-xs font-medium truncate',
          status === 'operational' ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {label[status]}
        </p>
        {ready && (
          <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
            v{ready.version}
            {ready.databaseResponseTimeMs !== null && ` · DB ${ready.databaseResponseTimeMs}ms`}
            {ready.redisResponseTimeMs !== null && ` · Redis ${ready.redisResponseTimeMs}ms`}
          </p>
        )}
      </div>
    </div>
  )
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: { name: string; href: string }[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Torrents',
    href: '/torrents',
    icon: Upload,
    children: [
      { name: 'Upload', href: '/torrents/upload' },
    ],
  },
  { name: 'Jobs', href: '/jobs', icon: FolderOpen },
  { name: 'Storage', href: '/storage', icon: HardDrive },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface SidebarProps {
  className?: string
  /** Renders a close control — only meaningful when shown as a mobile drawer. */
  showCloseButton?: boolean
  onClose?: () => void
}

export function Sidebar({ className, showCloseButton, onClose }: SidebarProps = {}) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Torrents'])

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    )
  }

  const isActive = (href: string, children?: { href: string }[]) => {
    if (children) {
      return children.some((child) => pathname.startsWith(child.href))
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className={cn('flex h-full w-64 flex-col border-r border-border bg-card', className)}>
      <div className="flex h-16 items-center border-b border-border px-4 sm:px-6">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-primary to-teal-secondary">
          <FileText className="h-4 w-4 text-gray-900" />
        </div>
        <span className="ml-3 text-lg font-semibold">TorreClou</span>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="ml-auto rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 pb-0">
        {navigation.map((item) => {
          const hasChildren = item.children && item.children.length > 0
          const isExpanded = expandedItems.includes(item.name)
          const active = isActive(item.href, item.children)

          return (
            <div key={item.name}>
              {hasChildren ? (
                <>
                  <button
                    onClick={() => toggleExpand(item.name)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children?.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'block rounded-md px-3 py-2 text-sm transition-colors',
                            pathname === child.href
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      {/* Health status */}
      <div className="border-t border-border p-2">
        <HealthWidget />
      </div>
    </div>
  )
}
