/** Geometry helpers for the diff extras (ribbons, change map). No CodeMirror imports. */

export interface ChunkRange {
  fromA: number
  toA: number
  fromB: number
  toB: number
}

/** Index of the chunk containing `head` on the given side, or null when the cursor is between chunks. */
export function chunkIndexAt(chunks: readonly ChunkRange[], head: number, side: 'a' | 'b'): number | null {
  for (let i = 0; i < chunks.length; i++) {
    const ch = chunks[i]
    const [from, to] = side === 'a' ? [ch.fromA, ch.toA] : [ch.fromB, ch.toB]
    if (head < from) return null
    if (head <= to) return i
  }
  return null
}

/**
 * Closed SVG path for a ribbon joining a left span (topA..botA) to a right span
 * (topB..botB) across a gutter `width` wide. Empty spans become a thin wedge.
 */
export function ribbonPath(topA: number, botA: number, topB: number, botB: number, width: number): string {
  const mid = width / 2
  const r = (n: number) => Math.round(n * 10) / 10
  return [
    `M0 ${r(topA)}`,
    `C${mid} ${r(topA)} ${mid} ${r(topB)} ${width} ${r(topB)}`,
    `L${width} ${r(Math.max(botB, topB + 1))}`,
    `C${mid} ${r(Math.max(botB, topB + 1))} ${mid} ${r(Math.max(botA, topA + 1))} 0 ${r(Math.max(botA, topA + 1))}`,
    'Z',
  ].join(' ')
}
