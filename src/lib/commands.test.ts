import { describe, expect, it } from 'vitest'
import { matchCommands, type Command } from './commands'

const cmd = (label: string, group = 'View'): Command => ({ id: label, label, group, run: () => {} })
const all = [cmd('Next change', 'Navigate'), cmd('Unified layout'), cmd('Take all into left', 'Merge'), cmd('Merge into left', 'Merge')]

describe('matchCommands', () => {
  it('returns everything for an empty query', () => {
    expect(matchCommands(all, '  ')).toEqual(all)
  })

  it('matches every word against group and label', () => {
    expect(matchCommands(all, 'merge left').map((c) => c.label)).toEqual(['Merge into left', 'Take all into left'])
    expect(matchCommands(all, 'navigate next').map((c) => c.label)).toEqual(['Next change'])
  })

  it('is case-insensitive and drops non-matches', () => {
    expect(matchCommands(all, 'UNIFIED').map((c) => c.label)).toEqual(['Unified layout'])
    expect(matchCommands(all, 'zzz')).toEqual([])
  })
})
