import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'

export interface SharedDiff {
  left: string
  right: string
  leftName?: string | null
  rightName?: string | null
}

const PREFIX = '#d='
/** Above this many characters some chat apps and browsers start truncating links. */
export const SHARE_WARN_CHARS = 32_000
export const SHARE_MAX_CHARS = 2_000_000

// The payload lives in the URL fragment, which browsers never send to the server.
export function encodeShare(data: SharedDiff): string {
  return PREFIX + compressToEncodedURIComponent(JSON.stringify({ v: 1, ...data }))
}

export function decodeShare(hash: string): SharedDiff | null {
  if (!hash.startsWith(PREFIX)) return null
  try {
    const json = decompressFromEncodedURIComponent(hash.slice(PREFIX.length))
    if (!json) return null
    const data = JSON.parse(json)
    if (data?.v !== 1 || typeof data.left !== 'string' || typeof data.right !== 'string') return null
    const name = (n: unknown) => (typeof n === 'string' ? n : null)
    return { left: data.left, right: data.right, leftName: name(data.leftName), rightName: name(data.rightName) }
  } catch {
    return null
  }
}
