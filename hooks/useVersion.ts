'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  checkLatestGithubRelease,
  getBackendVersion,
  type UpdateCheckResult,
} from '@/lib/api/version'
import { useHealth } from './useHealth'
import pkg from '../package.json'

export const FRONTEND_VERSION = pkg.version || '2.5.0'

export const versionKeys = {
  all: ['version'] as const,
  backend: () => [...versionKeys.all, 'backend'] as const,
  release: (backendVersion: string | null, frontendVersion: string) =>
    [
      ...versionKeys.all,
      'release',
      backendVersion ?? 'pending',
      frontendVersion,
    ] as const,
}

export function useBackendVersion() {
  return useQuery({
    queryKey: versionKeys.backend(),
    queryFn: getBackendVersion,
    staleTime: 60_000,
    retry: 1,
  })
}

export function useVersionAndUpdates() {
  const { data: healthResult, isLoading: healthLoading } = useHealth()
  const {
    data: versionInfo,
    isLoading: versionLoading,
    refetch: refetchBackendVersion,
  } = useBackendVersion()
  const queryClient = useQueryClient()

  const resolvedBackendVersion: string | null =
    versionInfo?.version && versionInfo.version !== 'unknown'
      ? versionInfo.version
      : healthResult?.data?.version && healthResult.data.version !== 'unknown'
        ? healthResult.data.version
        : null

  const displayVersion = resolvedBackendVersion ?? FRONTEND_VERSION

  const releaseQuery = useQuery({
    queryKey: versionKeys.release(resolvedBackendVersion, FRONTEND_VERSION),
    queryFn: () =>
      checkLatestGithubRelease(resolvedBackendVersion, FRONTEND_VERSION),
    enabled: !versionLoading || resolvedBackendVersion !== null,
    staleTime: 15 * 60_000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const checkForUpdatesMutation = useMutation({
    mutationFn: async (): Promise<UpdateCheckResult> => {
      const freshBackend = await refetchBackendVersion()
      const activeBackendVersion =
        freshBackend.data?.version && freshBackend.data.version !== 'unknown'
          ? freshBackend.data.version
          : resolvedBackendVersion

      const result = await checkLatestGithubRelease(
        activeBackendVersion,
        FRONTEND_VERSION
      )
      queryClient.setQueryData(
        versionKeys.release(activeBackendVersion, FRONTEND_VERSION),
        result
      )
      return result
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error('Could not check for updates', {
          description: result.error,
        })
        return
      }

      if (result.hasUpdate && result.latestVersion) {
        toast.info(`Update available: v${result.latestVersion}`, {
          description: `You are running v${result.currentVersion}.`,
          action: {
            label: 'Release Notes',
            onClick: () =>
              window.open(result.releaseUrl, '_blank', 'noopener,noreferrer'),
          },
        })
      } else {
        toast.success('TorrentDrive is up to date', {
          description: `Backend ${resolvedBackendVersion ? `v${resolvedBackendVersion}` : 'unreachable'} · UI v${FRONTEND_VERSION}`,
        })
      }
    },
  })

  return {
    frontendVersion: FRONTEND_VERSION,
    backendVersion: resolvedBackendVersion,
    displayVersion,
    versionInfo: versionInfo ?? null,
    isLoadingVersion: versionLoading && healthLoading,
    updateCheck: releaseQuery.data ?? null,
    isCheckingUpdates:
      releaseQuery.isFetching || checkForUpdatesMutation.isPending,
    checkForUpdates: () => checkForUpdatesMutation.mutate(),
  }
}
