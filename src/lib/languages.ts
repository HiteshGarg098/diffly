// Pure detection helpers. Kept free of CodeMirror imports so the input screen
// does not pull the editor bundle; see loadLanguage.ts for the loader.

// Curated list shown in the picker; value is the language-data name.
export const LANGUAGE_OPTIONS = [
  'JavaScript',
  'TypeScript',
  'JSX',
  'TSX',
  'JSON',
  'Go',
  'Python',
  'Java',
  'Kotlin',
  'C#',
  'C++',
  'Rust',
  'Ruby',
  'PHP',
  'Swift',
  'SQL',
  'HTML',
  'CSS',
  'XML',
  'YAML',
  'TOML',
  'Markdown',
  'Shell',
  'Dockerfile',
] as const

export type LanguageChoice = 'auto' | 'plain' | (typeof LANGUAGE_OPTIONS)[number]

const rules: [RegExp, LanguageChoice][] = [
  [/^\s*package\s+\w+\s*$|^\s*func\s+\(?\w/m, 'Go'],
  [/^\s*(def|class)\s+\w+.*:\s*$|^\s*(from\s+\S+\s+)?import\s+\w+\s*$/m, 'Python'],
  [/^\s*(interface|type)\s+\w+.*[={]|:\s*(string|number|boolean)\b/m, 'TypeScript'],
  [/^\s*(const|let|var|function|import|export)\b|=>/m, 'JavaScript'],
  [/^\s*(public|private)\s+(static\s+)?(class|void|final)\b/m, 'Java'],
  [/^\s*fn\s+\w+|^\s*use\s+\w+::/m, 'Rust'],
  [/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\b/im, 'SQL'],
  [/^\s*<!doctype html|<\/(div|html|body|span)>/im, 'HTML'],
  [/^\s*<\?xml|^\s*<[\w:-]+[^>]*>/m, 'XML'],
  [/^#!.*\b(ba|z)?sh\b/m, 'Shell'],
  [/^\s*FROM\s+\S+|^\s*RUN\s+/m, 'Dockerfile'],
  [/^[\w.-]+\s*=\s*.+$/m, 'TOML'],
  [/^\s*[\w-]+:\s+\S|^---\s*$/m, 'YAML'],
  [/^\s*[.#]?[\w-]+\s*\{[^}]*:[^}]*\}/m, 'CSS'],
  [/^#{1,6}\s+\w|^\s*[-*]\s+\w/m, 'Markdown'],
]

export function detectLanguage(text: string): Exclude<LanguageChoice, 'auto'> {
  const sample = text.slice(0, 5000)
  const trimmed = sample.trim()
  if (!trimmed) return 'plain'
  if (/^[[{]/.test(trimmed)) {
    try {
      JSON.parse(text)
      return 'JSON'
    } catch {
      // fall through to pattern rules
    }
  }
  for (const [re, lang] of rules) if (re.test(sample)) return lang as Exclude<LanguageChoice, 'auto'>
  return 'plain'
}

const BY_EXTENSION: Record<string, LanguageChoice> = {
  js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  ts: 'TypeScript', mts: 'TypeScript', cts: 'TypeScript',
  jsx: 'JSX', tsx: 'TSX', json: 'JSON', go: 'Go', py: 'Python', java: 'Java',
  kt: 'Kotlin', kts: 'Kotlin', cs: 'C#', rs: 'Rust', rb: 'Ruby', php: 'PHP', swift: 'Swift',
  cpp: 'C++', cc: 'C++', cxx: 'C++', hpp: 'C++', hh: 'C++',
  sql: 'SQL', html: 'HTML', htm: 'HTML', css: 'CSS', xml: 'XML', svg: 'XML',
  yaml: 'YAML', yml: 'YAML', toml: 'TOML', md: 'Markdown', markdown: 'Markdown',
  sh: 'Shell', bash: 'Shell', zsh: 'Shell',
}

const BY_FILENAME: Record<string, LanguageChoice> = {
  Dockerfile: 'Dockerfile',
  Gemfile: 'Ruby',
  Rakefile: 'Ruby',
  BUILD: 'Python',
}

export function detectFromFilename(name: string): LanguageChoice | null {
  const base = name.split(/[\\/]/).pop() ?? name
  if (BY_FILENAME[base]) return BY_FILENAME[base]
  if (/^Dockerfile\./.test(base)) return 'Dockerfile'
  const ext = base.includes('.') ? base.split('.').pop()!.toLowerCase() : ''
  return BY_EXTENSION[ext] ?? null
}
