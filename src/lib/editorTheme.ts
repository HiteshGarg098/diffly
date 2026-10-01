import { EditorView } from '@codemirror/view'

// Colors mirror the Tailwind zinc/red/emerald palette used by the app shell.
export function editorTheme(dark: boolean) {
  const c = dark
    ? {
        bg: '#18181b',
        fg: '#e4e4e7',
        gutter: '#71717a',
        border: '#27272a',
        delLine: 'rgba(248,113,113,0.12)',
        delText: 'rgba(248,113,113,0.35)',
        insLine: 'rgba(52,211,153,0.12)',
        insText: 'rgba(52,211,153,0.35)',
        hatch: '#27272a',
        selection: 'rgba(99,102,241,0.35)',
      }
    : {
        bg: '#ffffff',
        fg: '#18181b',
        gutter: '#a1a1aa',
        border: '#e4e4e7',
        delLine: 'rgba(239,68,68,0.10)',
        delText: 'rgba(239,68,68,0.30)',
        insLine: 'rgba(16,185,129,0.12)',
        insText: 'rgba(16,185,129,0.32)',
        hatch: '#f4f4f5',
        selection: 'rgba(99,102,241,0.2)',
      }

  return EditorView.theme(
    {
      '&': { backgroundColor: c.bg, color: c.fg, fontSize: '13px', height: '100%' },
      '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
      '.cm-content': { caretColor: c.fg },
      '.cm-gutters': { backgroundColor: c.bg, color: c.gutter, border: 'none', borderRight: `1px solid ${c.border}` },
      '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'transparent' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: `${c.selection} !important` },

      // Line-level highlights
      '&.cm-merge-a .cm-changedLine, .cm-deletedChunk': { backgroundColor: c.delLine },
      '&.cm-merge-b .cm-changedLine, .cm-inlineChangedLine': { backgroundColor: c.insLine },

      // Word/char-level highlights: solid background instead of the default underline
      '&.cm-merge-a .cm-changedText, .cm-deletedChunk .cm-deletedText': {
        background: c.delText,
        borderRadius: '2px',
        textDecoration: 'none',
      },
      '&.cm-merge-b .cm-changedText, &:not(.cm-merge-b) .cm-changedText': {
        background: c.insText,
        borderRadius: '2px',
      },
      // <ins>/<del> wrap whole changed lines; only the inner spans should be tinted.
      '.cm-insertedLine, .cm-deletedLine': { textDecoration: 'none', background: 'none' },

      '&.cm-merge-a .cm-changedLineGutter, .cm-deletedLineGutter': { background: '#ef4444' },
      '&.cm-merge-b .cm-changedLineGutter': { background: '#10b981' },

      // Filler rows where one side has no matching lines
      '.cm-mergeSpacer': {
        backgroundImage: `repeating-linear-gradient(-45deg, transparent 0 6px, ${c.hatch} 6px 12px)`,
      },

      '.cm-collapsedLines': {
        backgroundColor: dark ? '#27272a' : '#f4f4f5',
        color: c.gutter,
        fontFamily: 'var(--font-sans)',
        fontSize: '12px',
        padding: '4px 12px',
        cursor: 'pointer',
      },
    },
    { dark },
  )
}
