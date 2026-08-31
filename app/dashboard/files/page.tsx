'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { TorrentJob } from '@/types/api'
import { jobsKeys } from '@/hooks/useJobs'

export default function FilesPage() {
  const queryClient = useQueryClient()

  const { data: jobs, isLoading } = useQuery<TorrentJob[]>({
    queryKey: ['torrent-jobs'],
    queryFn: async () => {
      const response = await apiClient.get<TorrentJob[]>('/torrents/jobs')
      return response.data
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/torrents/jobs/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['torrent-jobs'] })
      // Also refresh jobs list & statistics used on the main jobs page
      queryClient.invalidateQueries({ queryKey: jobsKeys.all })
      toast.success('Job deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete job')
    },
  })

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/torrents/jobs/${id}/retry`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['torrent-jobs'] })
      // Also refresh jobs list & statistics used on the main jobs page
      queryClient.invalidateQueries({ queryKey: jobsKeys.all })
      toast.success('Job retried successfully')
    },
    onError: () => {
      toast.error('Failed to retry job')
    },
  })

  const formatSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusBadge = (status: TorrentJob['status']) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="success">Completed</Badge>
      case 'Downloading':
        return <Badge variant="default">Downloading</Badge>
      case 'Uploading':
        return <Badge variant="default">Uploading</Badge>
      case 'Failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">My Files</h1>
        <p className="text-muted-foreground">
          Manage your active torrent downloads
        </p>
      </div>

      {/* A five-column table cannot fit a phone; let it scroll inside its own box
          rather than pushing the whole page sideways. */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filename</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs && jobs.length > 0 ? (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.filename}</TableCell>
                  <TableCell>{formatSize(job.size)}</TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={job.progress} className="w-24 sm:w-32" />
                      <span className="text-sm text-muted-foreground">
                        {job.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {job.status === 'Failed' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => retryMutation.mutate(job.id)}
                          disabled={retryMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(job.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No active jobs. Start a download from the Dashboard.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}


