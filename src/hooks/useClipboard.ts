'use client'
import { useCallback, useRef, useState } from 'react'

/* Copy text to clipboard with a transient `copied` flag for UI feedback. */
export function useClipboard(resetMs = 1800): {
  copied: boolean
  copy: (text: string) => Promise<void>
} {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), resetMs)
    } catch {
      setCopied(false)
    }
  }, [resetMs])

  return { copied, copy }
}
