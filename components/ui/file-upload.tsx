'use client'

import * as React from 'react'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { formatFileSize } from '@/lib/utils/formatters'

import { FileUploadProps } from '@/types/ui'


export function FileUpload({
    accept = '.torrent',
    maxSize = 10 * 1024 * 1024, // 10MB default
    onFileSelect,
    selectedFile,
    multiple = false,
    onFilesSelect,
    error,
    className,
    disabled = false,
}: FileUploadProps) {
    const [isDragging, setIsDragging] = React.useState(false)
    const [validationError, setValidationError] = React.useState<string | null>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const displayError = error || validationError

    /**
     * Validates a batch and reports the accepted files. Rejects are summarised rather
     * than aborting the drop — picking nine good torrents and one PDF should queue nine.
     */
    const handleFilesChange = (files: File[]) => {
        setValidationError(null)

        const accepted: File[] = []
        const rejected: string[] = []

        for (const file of files) {
            if (isValidFile(file)) {
                accepted.push(file)
            } else {
                rejected.push(file.name)
            }
        }

        if (rejected.length > 0) {
            setValidationError(
                rejected.length === 1
                    ? `${rejected[0]} was skipped — expected a ${accept} file under ${formatFileSize(maxSize)}`
                    : `${rejected.length} files were skipped — expected ${accept} files under ${formatFileSize(maxSize)}`
            )
        }

        if (accepted.length > 0) {
            onFilesSelect?.(accepted)
        }

        if (inputRef.current) {
            // Allow re-picking the same file straight after removing it.
            inputRef.current.value = ''
        }
    }

    /** Type/size check with no side effects, for use across a batch. */
    const isValidFile = (file: File): boolean => {
        if (accept) {
            const acceptedTypes = accept.split(',').map((t) => t.trim())
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
            const isValidType = acceptedTypes.some(
                (type) =>
                    type === fileExtension ||
                    type === file.type ||
                    (type.endsWith('/*') && file.type.startsWith(type.replace('/*', '')))
            )
            if (!isValidType) return false
        }

        if (maxSize && file.size > maxSize) return false

        return true
    }

    const validateFile = (file: File): boolean => {
        setValidationError(null)

        // Check file type
        if (accept) {
            const acceptedTypes = accept.split(',').map((t) => t.trim())
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
            const isValidType = acceptedTypes.some(
                (type) =>
                    type === fileExtension ||
                    type === file.type ||
                    (type.endsWith('/*') && file.type.startsWith(type.replace('/*', '')))
            )
            if (!isValidType) {
                setValidationError(`Please upload a ${accept} file`)
                return false
            }
        }

        // Check file size
        if (maxSize && file.size > maxSize) {
            setValidationError(`File size must be less than ${formatFileSize(maxSize)}`)
            return false
        }

        return true
    }

    const handleFileChange = (file: File | null) => {
        if (file && validateFile(file)) {
            onFileSelect?.(file)
        } else if (!file) {
            setValidationError(null)
            onFileSelect?.(null)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        if (!disabled) {
            setIsDragging(true)
        }
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (disabled) return

        if (multiple) {
            const files = Array.from(e.dataTransfer.files)
            if (files.length > 0) handleFilesChange(files)
            return
        }

        const file = e.dataTransfer.files[0]
        if (file) {
            handleFileChange(file)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (multiple) {
            const files = Array.from(e.target.files ?? [])
            if (files.length > 0) handleFilesChange(files)
            return
        }

        const file = e.target.files?.[0] || null
        handleFileChange(file)
    }

    const handleRemove = () => {
        handleFileChange(null)
        if (inputRef.current) {
            inputRef.current.value = ''
        }
    }

    // In multiple mode the drop zone never collapses into a single-file preview —
    // the caller renders the queue, so the zone stays available for more drops.
    const showDropZone = multiple || !selectedFile

    return (
        <div className={cn('space-y-2', className)}>
            {showDropZone ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
                        isDragging
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50',
                        disabled && 'cursor-not-allowed opacity-50',
                        displayError && 'border-sage'
                    )}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept={accept}
                        multiple={multiple}
                        onChange={handleInputChange}
                        disabled={disabled}
                        className="absolute inset-0 cursor-pointer opacity-0"
                    />
                    <Upload
                        className={cn(
                            'mb-4 h-12 w-12',
                            isDragging ? 'text-primary' : 'text-muted-foreground'
                        )}
                    />
                    <p className="mb-1 text-sm font-medium">
                        {isDragging
                            ? `Drop your ${multiple ? 'files' : 'file'} here`
                            : `Drag & drop your ${multiple ? 'files' : 'file'} here`}
                    </p>
                    <p className="mb-4 text-xs text-muted-foreground">
                        or click to browse (max {formatFileSize(maxSize)} each)
                    </p>
                    <Button type="button" variant="outline" size="sm" disabled={disabled}>
                        {multiple ? 'Choose Files' : 'Choose File'}
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {formatFileSize(selectedFile.size)}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemove}
                        disabled={disabled}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove file</span>
                    </Button>
                </div>
            )}

            {displayError && (
                <div className="flex items-center gap-2 text-sm text-sage">
                    <AlertCircle className="h-4 w-4" />
                    <span>{displayError}</span>
                </div>
            )}
        </div>
    )
}

