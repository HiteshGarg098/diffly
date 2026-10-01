export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
/** Label for the primary modifier key: ⌘ on Apple devices, Ctrl elsewhere. */
export const modKey = isMac ? '⌘' : 'Ctrl'
