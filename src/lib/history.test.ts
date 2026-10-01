import { describe, expect, it } from 'vitest'
import { HISTORY_LIMIT, HISTORY_MAX_CHARS, addEntry, entryTitle, relativeTime, type HistoryEntry } from './history'

const entry = (id: string, left = id, right = id + '!'): HistoryEntry => ({
  id,
  savedAt: 0,
  left,
  right,
  leftName: null,
  rightName: null,
})

describe('addEntry', () => {
  it('puts new entries first and caps the list', () => {
    let list: HistoryEntry[] = []
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) list = addEntry(list, entry(String(i)))
    expect(list).toHaveLength(HISTORY_LIMIT)
    expect(list[0].id).toBe(String(HISTORY_LIMIT + 4))
  })

  it('moves an identical comparison to the top instead of duplicating it', () => {
    const list = addEntry(addEntry([entry('a'), entry('b')], entry('x', 'b', 'b!')), entry('c'))
    expect(list.map((e) => e.id)).toEqual(['c', 'x', 'a'])
  })

  it('skips oversized comparisons', () => {
    const big = entry('big', 'x'.repeat(HISTORY_MAX_CHARS), 'y')
    expect(addEntry([entry('a')], big).map((e) => e.id)).toEqual(['a'])
  })
})

describe('entryTitle', () => {
  it('prefers file names, then the first non-empty line', () => {
    expect(entryTitle({ ...entry('a'), leftName: 'a.go', rightName: 'b.go' })).toBe('a.go ↔ b.go')
    expect(entryTitle({ ...entry('a'), left: '', right: '\n  hello world \n' })).toBe('hello world')
    expect(entryTitle({ ...entry('a'), left: '', right: '' })).toBe('Untitled')
  })
})

describe('relativeTime', () => {
  it('formats recent times', () => {
    expect(relativeTime(0, 10_000)).toBe('just now')
    expect(relativeTime(0, 5 * 60_000)).toBe('5m ago')
    expect(relativeTime(0, 3 * 3_600_000)).toBe('3h ago')
  })
})
