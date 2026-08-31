export interface StatusIndicatorProps {
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired'
    label?: string
    showDot?: boolean
    className?: string
}

export interface FileUploadProps {
    accept?: string
    maxSize?: number // in bytes
    /** Required in single mode. Ignored when `multiple` is set. */
    onFileSelect?: (file: File | null) => void
    selectedFile?: File | null
    /**
     * Accept several files per drop/pick. The component stays a drop zone rather than
     * switching to the single-file preview, and reports each accepted file through
     * `onFilesSelect`. Files failing validation are listed instead of rejecting the drop.
     */
    multiple?: boolean
    onFilesSelect?: (files: File[]) => void
    error?: string
    className?: string
    disabled?: boolean
}
