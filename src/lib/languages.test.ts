import { describe, expect, it } from 'vitest'
import { detectFromFilename, detectLanguage } from './languages'

describe('detectFromFilename', () => {
  it('maps extensions and special file names', () => {
    expect(detectFromFilename('main.go')).toBe('Go')
    expect(detectFromFilename('src/App.TSX')).toBe('TSX')
    expect(detectFromFilename('Dockerfile')).toBe('Dockerfile')
    expect(detectFromFilename('Dockerfile.prod')).toBe('Dockerfile')
    expect(detectFromFilename('notes')).toBeNull()
    expect(detectFromFilename('archive.zip')).toBeNull()
  })
})

describe('detectLanguage', () => {
  it('recognises common snippets', () => {
    expect(detectLanguage('{"a": 1}')).toBe('JSON')
    expect(detectLanguage('package main\n\nfunc main() {}')).toBe('Go')
    expect(detectLanguage('def run():\n    pass')).toBe('Python')
    expect(detectLanguage('SELECT * FROM users')).toBe('SQL')
    expect(detectLanguage('just some words')).toBe('plain')
    expect(detectLanguage('   ')).toBe('plain')
  })
})
