import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Unmount React trees and reset spies between tests.
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
