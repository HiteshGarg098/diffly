export interface Command {
  id: string
  label: string
  group: string
  hint?: string
  run: () => void
}

/**
 * Every query word must appear in the group or label. Commands whose label
 * starts with the first word sort first; otherwise the original order is kept.
 */
export function matchCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase()
  if (!q) return commands
  const words = q.split(/\s+/)
  const hits = commands.filter((c) => {
    const hay = `${c.group} ${c.label}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
  const starts = (c: Command) => (c.label.toLowerCase().startsWith(words[0]) ? 0 : 1)
  return hits.map((c, i) => ({ c, i })).sort((x, y) => starts(x.c) - starts(y.c) || x.i - y.i).map((x) => x.c)
}
