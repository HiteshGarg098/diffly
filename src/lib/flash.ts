import { StateEffect, StateField, type Range } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'

// Temporary line highlight used for the jump pulse and merge slide-in.
// Only imported by DiffView, so it stays in the lazy editor chunk.

const setFlash = StateEffect.define<{ from: number; to: number; cls: string } | null>()

const flashField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes)
    for (const e of tr.effects) {
      if (!e.is(setFlash)) continue
      if (!e.value) {
        deco = Decoration.none
        continue
      }
      const { doc } = tr.state
      const mark = Decoration.line({ class: e.value.cls })
      const from = Math.min(e.value.from, doc.length)
      const last = doc.lineAt(Math.min(Math.max(from, e.value.to - 1), doc.length)).number
      const ranges: Range<Decoration>[] = []
      for (let n = doc.lineAt(from).number; n <= last; n++) ranges.push(mark.range(doc.line(n).from))
      deco = Decoration.set(ranges)
    }
    return deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

export const flashLines = flashField

const timers = new WeakMap<EditorView, number>()

/** Highlight lines from..to with `cls` for `ms`, then remove it. Empty ranges are ignored. */
export function flash(view: EditorView, from: number, to: number, cls: string, ms = 900) {
  if (to <= from) return
  view.dispatch({ effects: setFlash.of({ from, to, cls }) })
  clearTimeout(timers.get(view))
  timers.set(
    view,
    window.setTimeout(() => {
      if (view.dom.isConnected) view.dispatch({ effects: setFlash.of(null) })
    }, ms),
  )
}
