import { describe, expect, it } from 'vitest'
import { decodeShare, encodeShare } from './share'

describe('share', () => {
  it('round-trips texts, names and unicode', () => {
    const data = { left: 'héllo\n🙂', right: 'a&b=c#d', leftName: 'x.ts', rightName: null }
    const hash = encodeShare(data)
    expect(hash).toMatch(/^#d=[\w+$-]+$/)
    expect(decodeShare(hash)).toEqual(data)
  })

  it('rejects foreign or corrupt hashes', () => {
    expect(decodeShare('#section')).toBeNull()
    expect(decodeShare('#d=not-valid')).toBeNull()
    expect(decodeShare('#d=' + encodeShare({ left: 'a', right: 'b' }).slice(3, 10))).toBeNull()
  })
})
