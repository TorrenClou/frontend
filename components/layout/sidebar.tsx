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
  RefreshCw,
  ArrowUpCircle,
  ExternalLink,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHealth } from '@/hooks/useHealth'
import { useVersionAndUpdates } from '@/hooks/useVersion'
import type { HealthStatus } from '@/lib/api/health'

function HealthWidget() {
  const { data, isLoading } = useHealth()
  const {
    frontendVersion,
    backendVersion,
    displayVersion,
    updateCheck,
    isCheckingUpdates,
    checkForUpdates,
  } = useVersionAndUpdates()

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
  const hasUpdate = Boolean(updateCheck?.hasUpdate && updateCheck?.latestVersion)

  return (
    <div className="space-y-2 rounded-lg bg-surface-500/40 px-3 py-2.5">
      {/* Row 1: System Health + Check for Updates Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full transition-colors duration-200',
              dotClass[status]
            )}
          />
          <p
            className={cn(
              'truncate text-xs font-medium',
              status === 'operational' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {label[status]}
          </p>
        </div>

        <button
          type="button"
          onClick={checkForUpdates}
          disabled={isCheckingUpdates}
          title="Check for updates on GitHub"
          aria-label="Check for updates"
          className="inline-flex min-h-6 items-center gap-1 rounded-md border border-border bg-surface-400/70 px-2 py-1 font-mono text-[10px] text-muted-foreground select-none transition-[background-color,border-color,color,transform] duration-150 ease-out-quart hover:border-primary/40 hover:text-foreground active:scale-[0.97] disabled:opacity-50"
        >
          <RefreshCw
            aria-hidden="true"
            className={cn('h-2.5 w-2.5', isCheckingUpdates && 'animate-spin')}
          />
          <span>{isCheckingUpdates ? 'Checking' : 'Check update'}</span>
        </button>
      </div>

      {/* Row 2: Version Tag + Latency Readout */}
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground tabular-nums">
        <Link
          href="/dashboard/settings"
          className="truncate hover:text-foreground transition-colors"
          title={`Backend ${backendVersion ? `v${backendVersion}` : 'unreachable'} · UI v${frontendVersion}`}
        >
          v{displayVersion}
          {ready?.databaseResponseTimeMs != null && ` · DB ${ready.databaseResponseTimeMs}ms`}
          {ready?.redisResponseTimeMs != null && ` · Redis ${ready.redisResponseTimeMs}ms`}
        </Link>
      </div>

      {/* Row 3: Update Available Pill (only when a newer release exists) */}
      {hasUpdate && updateCheck?.latestVersion && (
        <a
          href={updateCheck.releaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-6 items-center justify-between gap-1.5 rounded-md border border-primary/40 bg-primary/15 px-2 py-1 text-[11px] font-medium text-primary-100 transition-colors hover:bg-primary/25 active:scale-[0.98]"
        >
          <span className="inline-flex items-center gap-1.5 truncate font-mono tabular-nums">
            <ArrowUpCircle className="h-3.5 w-3.5 shrink-0 text-primary-200" aria-hidden="true" />
            <span>v{updateCheck.latestVersion} available</span>
          </span>
          <ExternalLink className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
        </a>
      )}
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
  const { displayVersion } = useVersionAndUpdates()

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
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground border border-primary-400/40">
            <CloudDownload className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold tracking-tight truncate">TorrentDrive</span>
          <span className="rounded border border-surface-300/60 bg-surface-400/70 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground tabular-nums">
            v{displayVersion}
          </span>
        </Link>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="ml-auto rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.97]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
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
              <item.icon className="mr-3 h-4 w-4 shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Health & Version status */}
      <div className="border-t border-border p-2">
        <HealthWidget />
      </div>
    </div>
  )
}
