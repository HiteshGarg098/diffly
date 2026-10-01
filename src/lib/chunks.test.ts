import { describe, expect, it } from 'vitest'
import { chunkIndexAt, ribbonPath } from './chunks'

const chunks = [
  { fromA: 0, toA: 10, fromB: 0, toB: 12 },
  { fromA: 30, toA: 30, fromB: 40, toB: 50 },
]

describe('chunkIndexAt', () => {
  it('finds the chunk around the cursor on either side', () => {
    expect(chunkIndexAt(chunks, 5, 'a')).toBe(0)
    expect(chunkIndexAt(chunks, 12, 'b')).toBe(0)
    expect(chunkIndexAt(chunks, 30, 'a')).toBe(1)
    expect(chunkIndexAt(chunks, 45, 'b')).toBe(1)
  })

  it('returns null between or after chunks', () => {
    expect(chunkIndexAt(chunks, 20, 'a')).toBeNull()
    expect(chunkIndexAt(chunks, 60, 'b')).toBeNull()
    expect(chunkIndexAt([], 0, 'b')).toBeNull()
  })
})

describe('ribbonPath', () => {
  it('joins both spans across the gutter', () => {
    expect(ribbonPath(10, 30, 10, 50, 40)).toBe('M0 10 C20 10 20 10 40 10 L40 50 C20 50 20 30 0 30 Z')
  })

  it('gives empty spans at least 1px so the ribbon stays visible', () => {
    expect(ribbonPath(10, 10, 10, 30, 40)).toContain('0 11 Z')
  })
})
