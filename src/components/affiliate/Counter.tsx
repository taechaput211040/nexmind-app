'use client'
import { useCountUp } from '@/hooks/useCountUp'

/* Renders an animated, locale-formatted number with optional affixes. */
export function Counter({
  target,
  prefix = '',
  suffix = '',
  active = true,
}: {
  target: number
  prefix?: string
  suffix?: string
  active?: boolean
}) {
  const val = useCountUp(target, active)
  const settled = active && target !== 0 && val === target
  return (
    <span className={settled ? 'aff-count is-settled' : 'aff-count'}>
      {prefix}{val.toLocaleString()}{suffix}
    </span>
  )
}
