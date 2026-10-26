import { JobStatus } from '@/types/enums'
import type { Job } from '@/types/jobs'
import { formatTransferSpeed } from './formatters'

export interface JobPhaseProgress {
  status: JobStatus
  isDownloadingPhase: boolean
  isUploadingPhase: boolean
  isPastDownloadPhase: boolean
  isCompleted: boolean
  isFailed: boolean
  isDownloadFailed: boolean
  isUploadFailed: boolean
  isActive: boolean
  downloadPct: number
  uploadPct: number
  effectiveBytesDownloaded: number
  effectiveBytesUploaded: number
  downloadSpeed: string | null
  uploadSpeed: string | null
}

/**
 * Authoritative dual-phase progress normalization shared across JobCard and JobProgressCard.
 */
export function getJobPhaseProgress(job: Job): JobPhaseProgress {
  const status = (job.status as JobStatus) || JobStatus.QUEUED

  const isDownloadingPhase = [
    JobStatus.DOWNLOADING,
    JobStatus.TORRENT_DOWNLOAD_RETRY,
  ].includes(status)

  const isUploadingPhase = [
    JobStatus.UPLOADING,
    JobStatus.UPLOAD_RETRY,
  ].includes(status)

  const isPastDownloadPhase = [
    JobStatus.PENDING_UPLOAD,
    JobStatus.UPLOADING,
    JobStatus.UPLOAD_RETRY,
    JobStatus.UPLOAD_FAILED,
    JobStatus.GOOGLE_DRIVE_FAILED,
    JobStatus.COMPLETED,
  ].includes(status)

  const isCompleted = status === JobStatus.COMPLETED

  const isFailed = [
    JobStatus.FAILED,
    JobStatus.TORRENT_FAILED,
    JobStatus.UPLOAD_FAILED,
    JobStatus.GOOGLE_DRIVE_FAILED,
  ].includes(status)

  const isDownloadFailed = status === JobStatus.TORRENT_FAILED

  const isUploadFailed = [
    JobStatus.UPLOAD_FAILED,
    JobStatus.GOOGLE_DRIVE_FAILED,
  ].includes(status)

  const isActive =
    job.isActive ??
    [
      JobStatus.QUEUED,
      JobStatus.DOWNLOADING,
      JobStatus.PENDING_UPLOAD,
      JobStatus.UPLOADING,
      JobStatus.TORRENT_DOWNLOAD_RETRY,
      JobStatus.UPLOAD_RETRY,
    ].includes(status)

  const rawDownloadPct = Number(job.progressPercentage ?? job.progress ?? 0)
  const safeDownloadPct = Number.isFinite(rawDownloadPct)
    ? Math.min(100, Math.max(0, rawDownloadPct))
    : 0

  const rawUploadPct = Number(job.uploadProgressPercentage ?? 0)
  const safeUploadPct = Number.isFinite(rawUploadPct)
    ? Math.min(100, Math.max(0, rawUploadPct))
    : 0

  const downloadPct =
    isCompleted || isPastDownloadPhase
      ? 100
      : isDownloadingPhase || safeDownloadPct > 0
        ? safeDownloadPct
        : 0

  const uploadPct =
    isCompleted
      ? 100
      : isUploadingPhase || safeUploadPct > 0
        ? safeUploadPct
        : 0

  const effectiveBytesDownloaded =
    isCompleted || isPastDownloadPhase
      ? job.totalBytes
      : Math.min(job.totalBytes || job.bytesDownloaded, job.bytesDownloaded)

  const effectiveBytesUploaded = isCompleted
    ? job.totalBytes
    : Math.min(
        job.totalBytes || (job.bytesUploaded ?? 0),
        job.bytesUploaded ?? 0
      )

  const downloadSpeed = isDownloadingPhase
    ? formatTransferSpeed(job.downloadSpeedBytesPerSecond)
    : null

  const uploadSpeed = isUploadingPhase
    ? formatTransferSpeed(job.uploadSpeedBytesPerSecond)
    : null

  return {
    status,
    isDownloadingPhase,
    isUploadingPhase,
    isPastDownloadPhase,
    isCompleted,
    isFailed,
    isDownloadFailed,
    isUploadFailed,
    isActive,
    downloadPct,
    uploadPct,
    effectiveBytesDownloaded,
    effectiveBytesUploaded,
    downloadSpeed,
    uploadSpeed,
  }
}
