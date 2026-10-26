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

export interface GithubLatestRelease {
  version: string
  tagName: string
  htmlUrl: string
  publishedAt: string | null
  body: string | null
}

export interface UpdateCheckResult {
  checkedAt: string
  currentVersion: string
  latestVersion: string | null
  hasUpdate: boolean
  releaseUrl: string
  publishedAt: string | null
  releaseNotes: string | null
  error: string | null
}

export function normalizeSemver(raw: string | null | undefined): string {
  if (!raw) return '0.0.0'
  return raw.trim().replace(/^v/i, '').split('+')[0].split('-')[0]
}

/**
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 */
export function compareSemver(a: string, b: string): number {
  const cleanA = normalizeSemver(a)
  const cleanB = normalizeSemver(b)
  const partsA = cleanA.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const partsB = cleanB.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const len = Math.max(partsA.length, partsB.length, 3)

  for (let i = 0; i < len; i++) {
    const segA = partsA[i] ?? 0
    const segB = partsB[i] ?? 0
    if (segA > segB) return 1
    if (segA < segB) return -1
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

/**
 * Check GitHub Releases (TorrentDrive/backend) for the latest published release.
 */
export async function checkLatestGithubRelease(
  currentVersion: string
): Promise<UpdateCheckResult> {
  const fallbackUrl = 'https://github.com/TorrentDrive/backend/releases'
  const checkedAt = new Date().toISOString()

  try {
    const res = await fetch(
      'https://api.github.com/repos/TorrentDrive/backend/releases/latest',
      {
        headers: {
          Accept: 'application/vnd.github+json',
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      return {
        checkedAt,
        currentVersion,
        latestVersion: null,
        hasUpdate: false,
        releaseUrl: fallbackUrl,
        publishedAt: null,
        releaseNotes: null,
        error: `GitHub API returned HTTP ${res.status}`,
      }
    }

    const data = await res.json()
    const tagName = typeof data.tag_name === 'string' ? data.tag_name : ''
    const latestVersion = normalizeSemver(tagName)
    const cleanCurrent = normalizeSemver(currentVersion)
    const isKnownCurrent =
      cleanCurrent !== '0.0.0' &&
      currentVersion !== 'unknown' &&
      currentVersion.trim() !== ''

    const hasUpdate =
      isKnownCurrent &&
      latestVersion !== '0.0.0' &&
      compareSemver(latestVersion, cleanCurrent) > 0

    return {
      checkedAt,
      currentVersion,
      latestVersion: latestVersion !== '0.0.0' ? latestVersion : null,
      hasUpdate,
      releaseUrl:
        typeof data.html_url === 'string' && data.html_url
          ? data.html_url
          : fallbackUrl,
      publishedAt:
        typeof data.published_at === 'string' ? data.published_at : null,
      releaseNotes: typeof data.body === 'string' ? data.body : null,
      error: null,
    }
  } catch (err) {
    return {
      checkedAt,
      currentVersion,
      latestVersion: null,
      hasUpdate: false,
      releaseUrl: fallbackUrl,
      publishedAt: null,
      releaseNotes: null,
      error:
        err instanceof Error
          ? err.message
          : 'Could not reach GitHub Releases API',
    }
  }
}
