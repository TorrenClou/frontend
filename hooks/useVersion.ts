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

export const FRONTEND_VERSION = pkg.version || '2.4.1'

export const versionKeys = {
  all: ['version'] as const,
  backend: () => [...versionKeys.all, 'backend'] as const,
  release: (currentVersion: string) =>
    [...versionKeys.all, 'release', currentVersion] as const,
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
  const { data: healthResult } = useHealth()
  const { data: versionInfo, isLoading: versionLoading, refetch: refetchBackendVersion } =
    useBackendVersion()
  const queryClient = useQueryClient()

  const currentBackendVersion =
    versionInfo?.version && versionInfo.version !== 'unknown'
      ? versionInfo.version
      : healthResult?.data?.version || FRONTEND_VERSION

  const releaseQuery = useQuery({
    queryKey: versionKeys.release(currentBackendVersion),
    queryFn: () => checkLatestGithubRelease(currentBackendVersion),
    staleTime: 15 * 60_000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const checkForUpdatesMutation = useMutation({
    mutationFn: async (): Promise<UpdateCheckResult> => {
      const freshBackend = await refetchBackendVersion()
      const activeVersion =
        freshBackend.data?.version && freshBackend.data.version !== 'unknown'
          ? freshBackend.data.version
          : currentBackendVersion

      const result = await checkLatestGithubRelease(activeVersion)
      queryClient.setQueryData(versionKeys.release(activeVersion), result)
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
          description: `Running latest version (v${result.currentVersion}).`,
        })
      }
    },
  })

  return {
    frontendVersion: FRONTEND_VERSION,
    backendVersion: currentBackendVersion,
    versionInfo: versionInfo ?? null,
    isLoadingVersion: versionLoading,
    updateCheck: releaseQuery.data ?? null,
    isCheckingUpdates:
      releaseQuery.isFetching || checkForUpdatesMutation.isPending,
    checkForUpdates: () => checkForUpdatesMutation.mutate(),
  }
}
