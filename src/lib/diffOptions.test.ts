import { describe, expect, it } from 'vitest'
import { Chunk } from '@codemirror/merge'
import { Text } from '@codemirror/state'
import { diffConfigFor, ignoringDiff } from './diffOptions'
import { transforms } from './transforms'

const apply = (id: string, s: string) => transforms.find((t) => t.id === id)!.apply(s)

describe('ignoringDiff', () => {
  it('treats indentation-only changes as equal', () => {
    expect(ignoringDiff('if (x) {\n  y()\n}', 'if (x) {\n\ty()\n}', { whitespace: true, case: false })).toEqual([])
  })

  it('treats case-only changes as equal', () => {
    expect(ignoringDiff('Hello World', 'hello world', { whitespace: false, case: true })).toEqual([])
  })

  it('maps real changes back to original positions', () => {
    const a = '  foo = 1'
    const b = 'foo  =  2'
    const [c] = ignoringDiff(a, b, { whitespace: true, case: false })
    expect(a.slice(c.fromA, c.toA)).toBe('1')
    expect(b.slice(c.fromB, c.toB)).toBe('2')
  })

  it('maps insertions to a point position', () => {
    const [c] = ignoringDiff('a b', 'a b c', { whitespace: true, case: false })
    expect(c.fromA).toBe(c.toA)
    expect('a b c'.slice(c.fromB, c.toB)).toBe('c')
  })
})

function bigTexts(lines: number) {
  const left: string[] = []
  const right: string[] = []
  for (let i = 0; i < lines; i++) {
    const line = `  const value${i} = compute(${i}, "item-${i}") // row ${i}`
    left.push(line)
    if (i % 400 === 0) continue
    right.push(i % 100 === 0 ? line.replace('compute', 'computeFast') : line)
    if (i % 250 === 0) right.push(`  log("inserted after ${i}")`)
  }
  return { a: left.join('\n') + '\n', b: right.join('\n') + '\n' }
}

const chunksFor = (a: string, b: string, opts = { whitespace: false, case: false }) =>
  Chunk.build(Text.of(a.split('\n')), Text.of(b.split('\n')), diffConfigFor(opts))

describe('diffConfigFor', () => {
  it('finds each change in a 10k-line file instead of one whole-file chunk', () => {
    const { a, b } = bigTexts(10_000)
    const start = performance.now()
    const chunks = chunksFor(a, b)
    expect(performance.now() - start).toBeLessThan(2000)
    // Rows divisible by 100, 250 or 400 are edited, followed by an insert, or deleted: 120 rows.
    expect(chunks.length).toBe(120)
    const doc = Text.of(a.split('\n'))
    for (const ch of chunks) expect(doc.lineAt(ch.toA).number - doc.lineAt(ch.fromA).number).toBeLessThanOrEqual(2)
  })

  it('keeps word-level changes inside a changed line', () => {
    const [ch] = chunksFor('a\nfoo = 1\nb\n', 'a\nfoo = 2\nb\n')
    expect(ch.changes).toHaveLength(1)
    const c = ch.changes[0]
    expect('foo = 1\n'.slice(c.fromA, c.toA)).toBe('1')
  })

  it('ignores whitespace and case at the line level too', () => {
    expect(chunksFor('A\n  b\nc\n', 'a\nb\nc\n', { whitespace: true, case: true })).toEqual([])
    expect(chunksFor('a\nb\nc\n', 'a\nx\nc\n', { whitespace: true, case: false })).toHaveLength(1)
  })
})

describe('transforms', () => {
  it('sorts, dedupes and trims lines', () => {
    expect(apply('sort', 'b\na\nc')).toBe('a\nb\nc')
    expect(apply('dedupe', 'a\nb\na')).toBe('a\nb')
    expect(apply('trim', '  a  \n\tb')).toBe('a\nb')
  })

  it('formats JSON and leaves non-JSON alone', () => {
    expect(apply('json', '{"a":1}')).toBe('{\n  "a": 1\n}')
    expect(apply('json', 'not json')).toBe('not json')
  })
})
