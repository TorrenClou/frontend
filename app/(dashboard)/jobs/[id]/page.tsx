'use client'

import {
    useJob,
    useRetryJob,
    useCancelJob,
} from '@/hooks/useJobs'
import { JobStatus } from '@/types/enums'
import { useParams } from 'next/navigation'
import { useJobsStore } from '@/stores/jobsStore'
import {
    JobTimeline,
    JobHeader,
    JobProgressCard,
    JobErrorCard,
    JobSuccessCard,
    JobDetailsCard,
    JobDestinationCard,
    JobCancelModal,
    JobLoadingState,
    JobErrorState,
    isJobActive,
    isJobFailed,
} from '@/components/jobs'

export default function JobDetailsPage() {
    const params = useParams()
    const jobId = Number(params.id)
    const { setShowCancelModal } = useJobsStore()

    const { data: job, isLoading, error, refetch } = useJob(jobId)

    const retryJobMutation = useRetryJob()
    const cancelJobMutation = useCancelJob()

    const handleRetry = () => {
        retryJobMutation.mutate({ jobId })
    }

    const handleRetryWithProfile = (storageProfileId: number) => {
        retryJobMutation.mutate({ jobId, storageProfileId })
    }

    const handleCancel = () => {
        cancelJobMutation.mutate(jobId, {
            onSuccess: () => setShowCancelModal(false),
        })
    }

    const isRetrying = retryJobMutation.isPending
    const isCancelling = cancelJobMutation.isPending

    if (isLoading) {
        return <JobLoadingState />
    }

    if (error || !job) {
        return (
            <JobErrorState
                error={error}
                onRetry={() => refetch()}
            />
        )
    }

    const jobIsActive = isJobActive(job.status as JobStatus)
    const jobHasFailed = isJobFailed(job.status as JobStatus)

    return (
        <div className="space-y-6">
            <JobHeader
                job={job}
                onRetry={handleRetry}
                isRetrying={isRetrying}
                isCancelling={isCancelling}
            />

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left: main content */}
                <div className="lg:col-span-2 space-y-6">
                    {jobIsActive && <JobProgressCard job={job} />}

                    {jobHasFailed && job.errorMessage && (
                        <JobErrorCard
                            job={job}
                            onRetry={handleRetry}
                            onRetryWithProfile={handleRetryWithProfile}
                            isRetrying={isRetrying}
                        />
                    )}

                    {job.status === JobStatus.COMPLETED && <JobSuccessCard job={job} />}

                    <JobDetailsCard job={job} />
                </div>

                {/* Right: destination + timeline */}
                <div className="space-y-6">
                    <JobDestinationCard job={job} />
                    <JobTimeline jobId={jobId} />
                </div>
            </div>

            <JobCancelModal
                job={job}
                onConfirm={handleCancel}
                loading={isCancelling}
            />
        </div>
    )
}
