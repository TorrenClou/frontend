'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useCopyToClipboard(timeoutMs = 1800) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  const copy = useCallback(
    async (text: string) => {
      if (!text || typeof navigator === 'undefined' || !navigator.clipboard) {
        return false
      }
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current)
        }
        timerRef.current = window.setTimeout(() => {
          setCopied(false)
          timerRef.current = null
        }, timeoutMs)
        return true
      } catch {
        return false
      }
    },
    [timeoutMs]
  )

  return { copied, copy }
}
