export interface HistoryEntry {
  id: string
  savedAt: number
  left: string
  right: string
  leftName: string | null
  rightName: string | null
}

export const HISTORY_LIMIT = 30
/** Skip very large comparisons so a single entry cannot fill the ~5 MB storage quota. */
export const HISTORY_MAX_CHARS = 500_000

/** Newest first; an identical comparison moves to the top instead of being duplicated. */
export function addEntry(entries: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  if (entry.left.length + entry.right.length > HISTORY_MAX_CHARS) return entries
  const rest = entries.filter((e) => e.left !== entry.left || e.right !== entry.right)
  return [entry, ...rest].slice(0, HISTORY_LIMIT)
}

export function entryTitle(e: Pick<HistoryEntry, 'left' | 'right' | 'leftName' | 'rightName'>): string {
  if (e.leftName || e.rightName) return [e.leftName, e.rightName].filter(Boolean).join(' ↔ ')
  const firstLine = (e.right || e.left).split('\n').find((l) => l.trim()) ?? ''
  return firstLine.trim().slice(0, 60) || 'Untitled'
}

export function relativeTime(then: number, now = Date.now()): string {
  const s = Math.round((now - then) / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return d < 30 ? `${d}d ago` : new Date(then).toLocaleDateString()
}
