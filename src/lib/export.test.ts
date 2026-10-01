import { applyPatch } from 'diff'
import { describe, expect, it } from 'vitest'
import { diffRows, htmlReport, stem, unifiedPatch } from './export'

const names = { left: 'old.ts', right: 'new.ts' }

describe('unifiedPatch', () => {
  it('writes git-style headers and hunks', () => {
    const patch = unifiedPatch('a\nb\nc\n', 'a\nB\nc\n', names)
    expect(patch).toContain('--- a/old.ts')
    expect(patch).toContain('+++ b/new.ts')
    expect(patch).toContain('@@ -1,3 +1,3 @@')
    expect(patch).toContain('-b\n+B')
    expect(patch).not.toContain('Index:')
  })

  it('round-trips through applyPatch, including a missing final newline', () => {
    const left = 'one\ntwo\nthree'
    const right = 'one\n2\nthree\nfour'
    expect(applyPatch(left, unifiedPatch(left, right, names))).toBe(right)
  })
})

describe('diffRows', () => {
  it('pairs removed and added lines on the same row', () => {
    expect(diffRows('x\ny\n', 'x\nz\nw\n')).toEqual([
      { kind: 'same', a: 1, b: 1, text: 'x' },
      { kind: 'change', a: 2, left: 'y', b: 2, right: 'z' },
      { kind: 'change', b: 3, right: 'w' },
    ])
  })

  it('handles pure removals', () => {
    expect(diffRows('x\ny\n', 'x\n')).toEqual([
      { kind: 'same', a: 1, b: 1, text: 'x' },
      { kind: 'change', a: 2, left: 'y' },
    ])
  })
})

describe('htmlReport', () => {
  it('escapes content and marks word changes', () => {
    const html = htmlReport('<b>hi</b> world\n', '<b>hi</b> there\n', names)
    expect(html).toContain('&lt;b&gt;hi&lt;/b&gt;')
    expect(html).not.toContain('<b>hi</b>')
    expect(html).toContain('<del>world</del>')
    expect(html).toContain('<ins>there</ins>')
    expect(html).toContain('−1 removals')
  })

  it('escapes file names', () => {
    expect(htmlReport('', '', { left: '<x>', right: 'y' })).toContain('&lt;x&gt;')
  })
})

describe('stem', () => {
  it('drops the extension', () => {
    expect(stem('config.yaml')).toBe('config')
    expect(stem('Makefile')).toBe('Makefile')
    expect(stem('.env')).toBe('.env')
  })
})
