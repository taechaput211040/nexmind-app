'use client'
import { useEffect, useState } from 'react'

/* Returns true after `delayMs`, for staggered enter animations. */
export function useRevealOnMount(delayMs = 0): boolean {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delayMs)
    return () => clearTimeout(t)
  }, [delayMs])
  return visible
}
