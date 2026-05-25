import { describe, it, expect } from 'vitest'
import {
  getTierProgress,
  TIER_THRESHOLDS,
  STATS,
  COMMISSIONS,
  REFERRALS,
  PAYOUTS,
  CURRENT_EARNINGS,
} from './affiliate'

describe('getTierProgress', () => {
  it('computes percent and gap toward the next tier (default account state)', () => {
    const p = getTierProgress()
    // gold→platinum: (284750-200000)/(500000-200000) = 28.25%
    expect(p.cur).toBe(TIER_THRESHOLDS.gold)
    expect(p.next).toBe(TIER_THRESHOLDS.platinum)
    expect(p.gap).toBe(TIER_THRESHOLDS.platinum - CURRENT_EARNINGS)
    expect(p.pct).toBeCloseTo(28.25, 2)
  })

  it('clamps percent to 0 when below the current threshold', () => {
    const p = getTierProgress(0, 'gold', 'platinum')
    expect(p.pct).toBe(0)
  })

  it('clamps percent to 100 when earnings reach or exceed the next threshold', () => {
    const p = getTierProgress(600000, 'gold', 'platinum')
    expect(p.pct).toBe(100)
    expect(p.gap).toBeLessThan(0)
  })

  it('reports a positive gap while still short of the next tier', () => {
    const p = getTierProgress(250000, 'gold', 'platinum')
    expect(p.gap).toBe(250000)
    expect(p.pct).toBeGreaterThan(0)
    expect(p.pct).toBeLessThan(100)
  })
})

describe('mock data integrity', () => {
  it('exposes four performance stats with unique keys', () => {
    expect(STATS).toHaveLength(4)
    const keys = STATS.map(s => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('keeps every commission status within the allowed set', () => {
    const allowed = new Set(['positive', 'pending', 'negative'])
    expect(COMMISSIONS.every(c => allowed.has(c.status))).toBe(true)
  })

  it('has at least one churned and one active referral', () => {
    expect(REFERRALS.some(r => r.status === 'churned')).toBe(true)
    expect(REFERRALS.some(r => r.status === 'active')).toBe(true)
  })

  it('gives every payout a unique reference id', () => {
    const refs = PAYOUTS.map(p => p.ref)
    expect(new Set(refs).size).toBe(refs.length)
  })
})
