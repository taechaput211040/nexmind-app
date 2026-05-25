'use client'
import { useEffect, useState } from 'react'

/* Animated count-up toward `target`, eased on requestAnimationFrame for a
   smooth deceleration (ease-out cubic). Handles negatives.
   `active` gates the animation so cards can count up on reveal. */
export function useCountUp(target: number, active = true, durationMs = 880): number {
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!active) return
    if (durationMs <= 0 || target === 0) {
      setVal(target)
      return
    }

    let raf = 0
    let startTs = 0
    const from = 0
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (ts: number) => {
      if (!startTs) startTs = ts
      const p = Math.min(1, (ts - startTs) / durationMs)
      setVal(Math.round(from + (target - from) * easeOutCubic(p)))
      if (p < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setVal(target)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, durationMs])

  return val
}
