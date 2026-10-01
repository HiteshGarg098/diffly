import { LanguageDescription, type LanguageSupport } from '@codemirror/language'
import { languages as all } from '@codemirror/language-data'

const cache = new Map<string, Promise<LanguageSupport | null>>()

// Language packages are code-split by language-data and only fetched on first use.
export function loadLanguage(name: string): Promise<LanguageSupport | null> {
  if (name === 'plain') return Promise.resolve(null)
  let p = cache.get(name)
  if (!p) {
    const desc = LanguageDescription.matchLanguageName(all, name, false)
    p = desc ? desc.load().catch(() => null) : Promise.resolve(null)
    cache.set(name, p)
  }
  return p
}
