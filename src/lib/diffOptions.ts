import { Change, diff, type DiffConfig } from '@codemirror/merge'

export interface IgnoreOptions {
  whitespace: boolean
  case: boolean
}

// Whitespace other than newlines, so line structure survives normalization.
const WS = /[ \t\r\f\v ]/

interface Normalized {
  text: string
  // idx[i] = position in the original string of normalized char i
  idx: number[]
  length: number
}

export function normalize(s: string, opts: IgnoreOptions): Normalized {
  let text = ''
  const idx: number[] = []
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (opts.whitespace && WS.test(ch)) continue
    text += ch
    idx.push(i)
  }
  if (opts.case) {
    const lower = text.toLowerCase()
    // A few Unicode chars change length when lowercased; skip case folding then
    // rather than corrupt the position map.
    if (lower.length === text.length) text = lower
  }
  return { text, idx, length: s.length }
}

function mapRange(n: Normalized, from: number, to: number): [number, number] {
  if (from === to) {
    const pos = from === 0 ? 0 : n.idx[from - 1] + 1
    return [pos, pos]
  }
  return [n.idx[from], n.idx[to - 1] + 1]
}

export function ignoringDiff(a: string, b: string, opts: IgnoreOptions): readonly Change[] {
  const na = normalize(a, opts)
  const nb = normalize(b, opts)
  return diff(na.text, nb.text).map((c) => {
    const [fromA, toA] = mapRange(na, c.fromA, c.toA)
    const [fromB, toB] = mapRange(nb, c.fromB, c.toB)
    return new Change(fromA, toA, fromB, toB)
  })
}

const WS_ALL = /[ \t\r\f\v ]/g

/** Line identity under the ignore options, consistent with normalize(). */
function lineKey(line: string, opts: IgnoreOptions): string {
  let k = opts.whitespace ? line.replace(WS_ALL, '') : line
  if (opts.case) {
    const lower = k.toLowerCase()
    if (lower.length === k.length) k = lower
  }
  return k
}

function splitLines(s: string): string[] {
  const out: string[] = []
  for (let i = 0; i < s.length; ) {
    const nl = s.indexOf('\n', i)
    const end = nl < 0 ? s.length : nl + 1
    out.push(s.slice(i, end))
    i = end
  }
  return out
}

// Each distinct line becomes one UTF-16 unit; skip the surrogate range so the
// encoded string stays well formed.
const MAX_LINE_IDS = 0xffff - 0x800
const lineChar = (id: number) => String.fromCharCode(id < 0xd800 ? id : id + 0x800)

// Budgets: the line pass is cheap (one symbol per line); char passes run only
// inside changed blocks, for word highlights.
const LINE_PASS: DiffConfig = { scanLimit: 5000, timeout: 1500 }
const CHAR_PASS: DiffConfig = { scanLimit: 5000, timeout: 500 }

/**
 * Diff by lines first, then by characters within each changed block.
 * A character diff over a whole large file blows the scan budget and gives up,
 * reporting the entire file as one change; diffing ~10k line symbols does not.
 */
export function lineFirstDiff(
  a: string,
  b: string,
  inner: (a: string, b: string) => readonly Change[],
  key: (line: string) => string = (l) => l,
): readonly Change[] {
  const linesA = splitLines(a)
  const linesB = splitLines(b)
  const ids = new Map<string, number>()
  const encode = (lines: string[]) => {
    let out = ''
    for (const line of lines) {
      const k = key(line)
      let id = ids.get(k)
      if (id === undefined) {
        if (ids.size >= MAX_LINE_IDS) return null
        id = ids.size
        ids.set(k, id)
      }
      out += lineChar(id)
    }
    return out
  }
  const encA = encode(linesA)
  const encB = encA === null ? null : encode(linesB)
  if (encA === null || encB === null) return inner(a, b)

  const offsets = (lines: string[]) => {
    const o = [0]
    for (const line of lines) o.push(o[o.length - 1] + line.length)
    return o
  }
  const offA = offsets(linesA)
  const offB = offsets(linesB)
  const out: Change[] = []
  for (const c of diff(encA, encB, LINE_PASS)) {
    const fromA = offA[c.fromA]
    const toA = offA[c.toA]
    const fromB = offB[c.fromB]
    const toB = offB[c.toB]
    if (fromA === toA || fromB === toB) {
      out.push(new Change(fromA, toA, fromB, toB))
      continue
    }
    for (const d of inner(a.slice(fromA, toA), b.slice(fromB, toB))) {
      out.push(new Change(d.fromA + fromA, d.toA + fromA, d.fromB + fromB, d.toB + fromB))
    }
  }
  return out
}

export function diffConfigFor(opts: IgnoreOptions): DiffConfig {
  if (!opts.whitespace && !opts.case) return { override: (a, b) => lineFirstDiff(a, b, (x, y) => diff(x, y, CHAR_PASS)) }
  return {
    override: (a, b) =>
      lineFirstDiff(
        a,
        b,
        (x, y) => ignoringDiff(x, y, opts),
        (line) => lineKey(line, opts),
      ),
  }
}
