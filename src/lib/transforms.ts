export interface Transform {
  id: string
  label: string
  apply: (text: string) => string
}

const lines = (s: string) => s.split('\n')

function formatJson(s: string) {
  try {
    return JSON.stringify(JSON.parse(s), null, 2)
  } catch {
    return s // not JSON; leave untouched
  }
}

export const transforms: Transform[] = [
  { id: 'trim', label: 'Trim whitespace', apply: (s) => lines(s).map((l) => l.trim()).join('\n') },
  { id: 'trimEnd', label: 'Trim trailing whitespace', apply: (s) => lines(s).map((l) => l.trimEnd()).join('\n') },
  { id: 'sort', label: 'Sort lines', apply: (s) => lines(s).sort((x, y) => x.localeCompare(y)).join('\n') },
  { id: 'dedupe', label: 'Remove duplicate lines', apply: (s) => [...new Set(lines(s))].join('\n') },
  { id: 'noEmpty', label: 'Remove empty lines', apply: (s) => lines(s).filter((l) => l.trim() !== '').join('\n') },
  { id: 'lower', label: 'Lowercase', apply: (s) => s.toLowerCase() },
  { id: 'tabs', label: 'Tabs → spaces', apply: (s) => s.replace(/\t/g, '  ') },
  { id: 'json', label: 'Format JSON', apply: formatJson },
]
