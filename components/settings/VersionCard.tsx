'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowUpCircle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  GitCommit,
  Layers,
  Loader2,
  RefreshCw,
  Server,
} from 'lucide-react'
import { useVersionAndUpdates } from '@/hooks/useVersion'
import { formatRelativeTime } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils'

const UPGRADE_COMMAND = 'docker compose pull && docker compose up -d'

export function VersionCard() {
  const {
    frontendVersion,
    backendVersion,
    versionInfo,
    isLoadingVersion,
    updateCheck,
    isCheckingUpdates,
    checkForUpdates,
  } = useVersionAndUpdates()

  const [copiedCmd, setCopiedCmd] = useState(false)

  const handleCopyUpgrade = () => {
    navigator.clipboard.writeText(UPGRADE_COMMAND).then(() => {
      setCopiedCmd(true)
      setTimeout(() => setCopiedCmd(false), 1800)
    })
  }

  const hasUpdate = Boolean(updateCheck?.hasUpdate && updateCheck?.latestVersion)
  const latestVersion = updateCheck?.latestVersion
  const shortSha = versionInfo?.buildSha ? versionInfo.buildSha.slice(0, 7) : null

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Version &amp; Updates
            </CardTitle>
            <CardDescription>
              Running instance build metadata and official GitHub release status
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={checkForUpdates}
              disabled={isCheckingUpdates}
            >
              <RefreshCw
                className={cn(
                  'mr-2 h-3.5 w-3.5',
                  isCheckingUpdates && 'animate-spin'
                )}
              />
              {isCheckingUpdates ? 'Checking…' : 'Check for Updates'}
            </Button>

            <Button asChild variant="ghost" size="sm">
              <a
                href={
                  updateCheck?.releaseUrl ||
                  'https://github.com/TorrentDrive/backend/releases'
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                Releases
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Banner */}
        <div
          className={cn(
            'flex flex-col justify-between gap-3 rounded-lg border p-3.5 sm:flex-row sm:items-center',
            hasUpdate
              ? 'border-primary/40 bg-primary/10'
              : 'border-border bg-background/40'
          )}
        >
          <div className="flex items-start gap-3">
            {hasUpdate ? (
              <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary-200" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-medium" />
            )}
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">
                  {hasUpdate
                    ? `Update available: v${latestVersion}`
                    : 'Your instance is up to date'}
                </span>
                {hasUpdate ? (
                  <Badge variant="processing" className="font-mono tabular-nums">
                    v{backendVersion} → v{latestVersion}
                  </Badge>
                ) : (
                  <Badge variant="success" className="font-mono tabular-nums">
                    v{backendVersion}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {updateCheck?.error ? (
                  <span className="text-warning-medium">
                    Last check failed: {updateCheck.error}
                  </span>
                ) : updateCheck?.checkedAt ? (
                  <>
                    Last checked {formatRelativeTime(updateCheck.checkedAt)}
                    {latestVersion && (
                      <>
                        {' · '}Latest GitHub release:{' '}
                        <span className="font-mono tabular-nums text-foreground">
                          v{latestVersion}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  'Checking GitHub releases…'
                )}
              </p>
            </div>
          </div>

          {hasUpdate && updateCheck?.releaseUrl && (
            <Button asChild size="sm" className="shrink-0">
              <a
                href={updateCheck.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View v{latestVersion} Release
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>

        {/* Version Metadata Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Server className="h-3.5 w-3.5 text-primary-200" />
              <span>Backend Engine</span>
            </div>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums">
              {isLoadingVersion ? '—' : `v${backendVersion}`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              API &amp; background workers
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5 text-info-light" />
              <span>Web Dashboard</span>
            </div>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums">
              v{frontendVersion}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Next.js UI bundle
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitCommit className="h-3.5 w-3.5 text-primary-200" />
              <span>Build Commit</span>
            </div>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums">
              {shortSha || 'local'}
            </p>
            <p className="truncate text-[11px] text-muted-foreground tabular-nums">
              {versionInfo?.buildTime
                ? `Built ${formatRelativeTime(versionInfo.buildTime)}`
                : 'Container image build'}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Database className="h-3.5 w-3.5 text-success-medium" />
              <span>Database Schema</span>
            </div>
            <p className="mt-1 truncate font-mono text-sm font-semibold tabular-nums">
              {versionInfo?.databaseSchema
                ? versionInfo.databaseSchema.split('_').slice(1).join('_') ||
                  versionInfo.databaseSchema
                : 'Up to date'}
            </p>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {versionInfo?.pendingMigrations
                ? `${versionInfo.pendingMigrations} pending migration(s)`
                : '0 pending migrations'}
            </p>
          </div>
        </div>

        {/* Upgrade Command Helper when an update is available */}
        {hasUpdate && (
          <div className="flex flex-col justify-between gap-2 rounded-lg border border-surface-300/60 bg-surface-500/80 px-3.5 py-2.5 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">
                Pull the latest container images on your host or trigger a redeploy in Dokploy / Coolify:
              </span>
              <code className="font-mono text-xs text-primary-200">
                {UPGRADE_COMMAND}
              </code>
            </div>
            <button
              type="button"
              onClick={handleCopyUpgrade}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs select-none transition-[background-color,border-color,color,transform] duration-150 ease-out-quart active:scale-[0.97]',
                copiedCmd
                  ? 'border-success/40 bg-success/15 text-success-medium'
                  : 'border-surface-300/60 bg-surface-400/60 text-muted-foreground hover:text-foreground'
              )}
            >
              {copiedCmd ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy command</span>
                </>
              )}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
