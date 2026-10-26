'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  FolderOpen,
  HardDrive,
  Settings,
  CloudDownload,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHealth } from '@/hooks/useHealth'
import type { HealthStatus } from '@/lib/api/health'

function HealthWidget() {
  const { data, isLoading } = useHealth()

  const status: HealthStatus | 'loading' = isLoading ? 'loading' : data?.status ?? 'down'

  const dotClass: Record<HealthStatus | 'loading', string> = {
    loading: 'bg-warning ring-2 ring-warning/25',
    operational: 'bg-success-medium ring-2 ring-success/25',
    degraded: 'bg-warning-medium ring-2 ring-warning/30',
    down: 'bg-danger-medium ring-2 ring-danger/30',
  }

  const label: Record<HealthStatus | 'loading', string> = {
    loading: 'Checking...',
    operational: 'All Systems OK',
    degraded: 'Degraded',
    down: 'Service Down',
  }

  const ready = data?.data

  return (
    <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
      <span className={cn('h-2 w-2 shrink-0 rounded-full transition-colors duration-200', dotClass[status])} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-xs font-medium',
            status === 'operational' ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {label[status]}
        </p>
        {ready && (
          <p className="mt-0.5 truncate font-mono tabular-nums text-[10px] text-muted-foreground">
            v{ready.version}
            {ready.databaseResponseTimeMs !== null && ` · DB ${ready.databaseResponseTimeMs}ms`}
            {ready.redisResponseTimeMs !== null && ` · Redis ${ready.redisResponseTimeMs}ms`}
          </p>
        )}
      </div>
    </div>
  )
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', exact: true, icon: LayoutDashboard },
  {
    name: 'Upload Torrent',
    href: '/torrents/upload',
    matchPrefixes: ['/torrents/upload', '/torrents/analyze'],
    icon: Upload,
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

  const isActive = (item: (typeof navigation)[number]) => {
    if (item.exact) {
      return pathname === item.href
    }
    if (item.matchPrefixes) {
      return item.matchPrefixes.some((prefix) => pathname.startsWith(prefix))
    }
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  return (
    <div className={cn('flex h-full w-64 flex-col border-r border-border bg-card', className)}>
      <div className="flex h-16 items-center border-b border-border px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground border border-primary-400/40">
            <CloudDownload className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">TorrentDrive</span>
        </Link>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="ml-auto rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.97]"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const active = isActive(item)

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium select-none transition-[background-color,color,transform] duration-150 ease-out-quart active:scale-[0.98]',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface-400/70 hover:text-foreground'
              )}
            >
              <item.icon className="mr-3 h-4 w-4 shrink-0" />
              {item.name}
            </Link>
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
