// Version & update-check API client
import { z } from 'zod'
import { getApiBaseUrl } from '../api-base'

export const backendVersionInfoSchema = z.object({
  version: z.string().default('unknown'),
  buildSha: z.string().nullable().optional(),
  buildTime: z.string().nullable().optional(),
  databaseSchema: z.string().nullable().optional(),
  pendingMigrations: z.number().optional().default(0),
  schemaAhead: z.boolean().optional().default(false),
  timestamp: z.string().optional(),
})

export type BackendVersionInfo = z.infer<typeof backendVersionInfoSchema>

export interface ComponentReleaseStatus {
  repo: 'backend' | 'frontend'
  currentVersion: string | null
  latestVersion: string | null
  hasUpdate: boolean
  releaseUrl: string
  publishedAt: string | null
}

export interface UpdateCheckResult {
  checkedAt: string
  currentVersion: string
  latestVersion: string | null
  hasUpdate: boolean
  updatedComponent: 'backend' | 'frontend' | 'both' | null
  releaseUrl: string
  publishedAt: string | null
  releaseNotes: string | null
  backendRelease: ComponentReleaseStatus
  frontendRelease: ComponentReleaseStatus
  error: string | null
}

export function normalizeSemver(raw: string | null | undefined): string {
  if (!raw) return '0.0.0'
  return raw.trim().replace(/^v/i, '').split('+')[0]
}

/**
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 * Follows SemVer precedence where stable (2.5.0) > prerelease (2.5.0-rc.1).
 */
export function compareSemver(a: string, b: string): number {
  const cleanA = normalizeSemver(a)
  const cleanB = normalizeSemver(b)
  const [coreA = '0.0.0', preA] = cleanA.split('-', 2)
  const [coreB = '0.0.0', preB] = cleanB.split('-', 2)

  const partsA = coreA.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const partsB = coreB.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const len = Math.max(partsA.length, partsB.length, 3)

  for (let i = 0; i < len; i++) {
    const segA = partsA[i] ?? 0
    const segB = partsB[i] ?? 0
    if (segA > segB) return 1
    if (segA < segB) return -1
  }

  // Same major.minor.patch: stable > prerelease
  if (!preA && preB) return 1
  if (preA && !preB) return -1
  if (preA && preB && preA !== preB) {
    return preA.localeCompare(preB, undefined, { numeric: true })
  }
  return 0
}

/**
 * Fetch running backend version & build metadata from GET /api/version.
 */
export async function getBackendVersion(): Promise<BackendVersionInfo | null> {
  try {
    const apiBase = getApiBaseUrl()
    const res = await fetch(`${apiBase}/version`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    return backendVersionInfoSchema.parse(json)
  } catch {
    return null
  }
}

interface SingleRepoCheck {
  status: ComponentReleaseStatus
  notes: string | null
  error: string | null
}

async function fetchRepoLatestRelease(
  repo: 'backend' | 'frontend',
  currentVersion: string | null
): Promise<SingleRepoCheck> {
  const fallbackUrl = `https://github.com/TorrentDrive/${repo}/releases`
  try {
    const res = await fetch(
      `https://api.github.com/repos/TorrentDrive/${repo}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      return {
        status: {
          repo,
          currentVersion,
          latestVersion: null,
          hasUpdate: false,
          releaseUrl: fallbackUrl,
          publishedAt: null,
        },
        notes: null,
        error: `GitHub API (${repo}) returned HTTP ${res.status}`,
      }
    }

    const data = await res.json()
    const tagName = typeof data.tag_name === 'string' ? data.tag_name : ''
    const latestVersion = normalizeSemver(tagName)
    const cleanCurrent = normalizeSemver(currentVersion)
    const isKnownCurrent =
      Boolean(currentVersion) &&
      cleanCurrent !== '0.0.0' &&
      currentVersion !== 'unknown'

    const hasUpdate =
      isKnownCurrent &&
      latestVersion !== '0.0.0' &&
      compareSemver(latestVersion, cleanCurrent) > 0

    return {
      status: {
        repo,
        currentVersion,
        latestVersion: latestVersion !== '0.0.0' ? latestVersion : null,
        hasUpdate,
        releaseUrl:
          typeof data.html_url === 'string' && data.html_url
            ? data.html_url
            : fallbackUrl,
        publishedAt:
          typeof data.published_at === 'string' ? data.published_at : null,
      },
      notes: typeof data.body === 'string' ? data.body : null,
      error: null,
    }
  } catch (err) {
    return {
      status: {
        repo,
        currentVersion,
        latestVersion: null,
        hasUpdate: false,
        releaseUrl: fallbackUrl,
        publishedAt: null,
      },
      notes: null,
      error:
        err instanceof Error
          ? err.message
          : `Could not reach GitHub Releases API for ${repo}`,
    }
  }
}

/**
 * Check GitHub Releases across both TorrentDrive/backend and TorrentDrive/frontend.
 */
export async function checkLatestGithubRelease(
  backendVersion: string | null,
  frontendVersion: string
): Promise<UpdateCheckResult> {
  const checkedAt = new Date().toISOString()

  const [backendCheck, frontendCheck] = await Promise.all([
    fetchRepoLatestRelease('backend', backendVersion),
    fetchRepoLatestRelease('frontend', frontendVersion),
  ])

  const backendHasUpdate = backendCheck.status.hasUpdate
  const frontendHasUpdate = frontendCheck.status.hasUpdate
  const hasUpdate = backendHasUpdate || frontendHasUpdate

  const updatedComponent: UpdateCheckResult['updatedComponent'] =
    backendHasUpdate && frontendHasUpdate
      ? 'both'
      : backendHasUpdate
        ? 'backend'
        : frontendHasUpdate
          ? 'frontend'
          : null

  const primaryCheck = backendHasUpdate
    ? backendCheck
    : frontendHasUpdate
      ? frontendCheck
      : backendCheck.status.latestVersion
        ? backendCheck
        : frontendCheck

  const bothFailed = Boolean(backendCheck.error && frontendCheck.error)

  return {
    checkedAt,
    currentVersion:
      primaryCheck.status.currentVersion ||
      backendVersion ||
      frontendVersion,
    latestVersion: primaryCheck.status.latestVersion,
    hasUpdate,
    updatedComponent,
    releaseUrl: primaryCheck.status.releaseUrl,
    publishedAt: primaryCheck.status.publishedAt,
    releaseNotes: primaryCheck.notes,
    backendRelease: backendCheck.status,
    frontendRelease: frontendCheck.status,
    error: bothFailed ? backendCheck.error : null,
  }
}
