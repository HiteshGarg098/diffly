import { defaultKeymap, history, historyKeymap, undo } from '@codemirror/commands'
import {
  Chunk,
  MergeView,
  getChunks,
  getOriginalDoc,
  originalDocChangeEffect,
  unifiedMergeView,
  updateOriginalDoc,
} from '@codemirror/merge'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { Compartment, type Extension, type Text, type Transaction } from '@codemirror/state'
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark'
import { EditorView, drawSelection, highlightSpecialChars, keymap, lineNumbers } from '@codemirror/view'
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { chunkIndexAt, ribbonPath } from '../lib/chunks'
import { diffConfigFor } from '../lib/diffOptions'
import { editorTheme } from '../lib/editorTheme'
import { flash, flashLines } from '../lib/flash'
import { loadLanguage } from '../lib/loadLanguage'

export type Layout = 'split' | 'unified'
export type MergeDirection = 'b-to-a' | 'a-to-b'
export type Side = 'left' | 'right'

export interface DiffStats {
  removals: number
  additions: number
  chunks: number
}

export interface DiffViewHandle {
  next: () => void
  prev: () => void
  /** Scroll to change `i` (0-based) and pulse it. */
  goTo: (i: number) => void
  /** Undo the most recent single-change merge. */
  undoMerge: () => void
  getTexts: () => { left: string; right: string }
}

interface Props {
  left: string
  right: string
  layout: Layout
  dark: boolean
  wrap: boolean
  collapse: boolean
  direction: MergeDirection
  /** Resolved language name from lib/languages, or 'plain'. */
  language: string
  ignoreWhitespace: boolean
  ignoreCase: boolean
  onChange: (left: string, right: string) => void
  onStats: (stats: DiffStats) => void
  /** Index of the change under the cursor, or null. */
  onCurrent: (index: number | null) => void
  /** A single change was merged into `into`. */
  onMerge: (into: Side) => void
}

/** One mark in the change map, as fractions of the scroll height. */
interface Tick {
  top: number
  height: number
  del: boolean
  ins: boolean
}

const SVG_NS = 'http://www.w3.org/2000/svg'

// Line diffs misbehave when a side lacks a trailing newline: appending a line
// after the last one marks that last line as changed too. Pad for display and
// strip the pad when handing text back out.
const pad = (s: string) => (s === '' || s.endsWith('\n') ? s : s + '\n')

function lineSpan(doc: Text, from: number, to: number) {
  if (to <= from) return 0
  return doc.lineAt(Math.min(to - 1, doc.length)).number - doc.lineAt(from).number + 1
}

function computeStats(chunks: readonly Chunk[], a: Text, b: Text): DiffStats {
  let removals = 0
  let additions = 0
  for (const ch of chunks) {
    removals += lineSpan(a, ch.fromA, ch.toA)
    additions += lineSpan(b, ch.fromB, ch.toB)
  }
  return { removals, additions, chunks: chunks.length }
}

/** Vertical extent of from..to in document coordinates; empty ranges have zero height. */
function span(view: EditorView, from: number, to: number): [number, number] {
  const len = view.state.doc.length
  const top = view.lineBlockAt(Math.min(from, len)).top
  return [top, to > from ? view.lineBlockAt(Math.min(to - 1, len)).bottom : top]
}

const sameTicks = (x: Tick[], y: Tick[]) =>
  x.length === y.length &&
  x.every((t, i) => Math.abs(t.top - y[i].top) < 1e-4 && Math.abs(t.height - y[i].height) < 1e-4 && t.del === y[i].del && t.ins === y[i].ins)

function tickBackground(t: Tick) {
  if (t.del && t.ins) return 'linear-gradient(90deg, #f87171 50%, #34d399 50%)'
  return t.del ? '#f87171' : '#34d399'
}

/** Range of the new document touched by a transaction. */
function changedRange(tr: Transaction): [number, number] {
  let from = Infinity
  let to = -1
  tr.changes.iterChangedRanges((_fA, _tA, fB, tB) => {
    from = Math.min(from, fB)
    to = Math.max(to, tB)
  })
  return [from, to]
}

const DiffView = forwardRef<DiffViewHandle, Props>(function DiffView(props, ref) {
  const { layout, dark, wrap, collapse, direction, language, ignoreWhitespace, ignoreCase } = props
  const host = useRef<HTMLDivElement>(null)
  const viewportBox = useRef<HTMLDivElement>(null)
  const merge = useRef<MergeView | null>(null)
  const unified = useRef<EditorView | null>(null)
  const langSlot = useRef(new Compartment())
  const [ticks, setTicks] = useState<Tick[]>([])
  const [current, setCurrent] = useState<number | null>(null)
  // Latest texts/callbacks, so rebuilding the view on option changes keeps user edits.
  const texts = useRef({ left: props.left, right: props.right })
  const cb = useRef(props)
  const lastUndo = useRef<(() => void) | null>(null)
  // Set by the build effect; they close over the live views.
  const actions = useRef({ goTo: (_i: number) => {}, step: (_dir: 1 | -1) => {} })
  useLayoutEffect(() => {
    cb.current = props
  })

  useImperativeHandle(ref, () => ({
    next: () => actions.current.step(1),
    prev: () => actions.current.step(-1),
    goTo: (i) => actions.current.goTo(i),
    undoMerge: () => {
      lastUndo.current?.()
      lastUndo.current = null
    },
    getTexts: () => texts.current,
  }))

  useEffect(() => {
    const parent = host.current!
    let frame = 0
    let extrasFrame = 0
    let currentIdx: number | null = null
    let pulseFlip = false

    const padded = {
      left: pad(texts.current.left) !== texts.current.left,
      right: pad(texts.current.right) !== texts.current.right,
    }
    const unpad = (doc: Text, wasPadded: boolean) => {
      const s = doc.toString()
      return wasPadded && s.endsWith('\n') ? s.slice(0, -1) : s
    }

    const chunksNow = (): readonly Chunk[] =>
      merge.current?.chunks ?? (unified.current ? (getChunks(unified.current.state)?.chunks ?? []) : [])
    const scroller = () => (merge.current ? parent : unified.current?.scrollDOM)

    const report = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (merge.current) {
          const { a, b } = merge.current
          texts.current = { left: unpad(a.state.doc, padded.left), right: unpad(b.state.doc, padded.right) }
          cb.current.onStats(computeStats(merge.current.chunks, a.state.doc, b.state.doc))
        } else if (unified.current) {
          const state = unified.current.state
          const original = getOriginalDoc(state)
          texts.current = { left: unpad(original, padded.left), right: unpad(state.doc, padded.right) }
          const info = getChunks(state)
          if (info) cb.current.onStats(computeStats(info.chunks, original, state.doc))
        }
        cb.current.onChange(texts.current.left, texts.current.right)
      })
    }

    // Ribbons connecting each change across the split gutter.
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('class', 'sbs-ribbons')
    svg.setAttribute('aria-hidden', 'true')
    const gradId = `rib-${Math.random().toString(36).slice(2)}`
    svg.innerHTML = `<defs><linearGradient id="${gradId}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#f87171"/><stop offset="1" stop-color="#34d399"/></linearGradient></defs><g fill="url(#${gradId})"></g>`
    const ribbonGroup = svg.lastChild as SVGGElement

    const drawRibbons = () => {
      const mv = merge.current
      const gutter = mv?.dom.querySelector<HTMLElement>('.cm-merge-revert')
      if (!mv || !gutter) return
      if (svg.parentNode !== mv.dom) mv.dom.appendChild(svg)
      const w = gutter.offsetWidth
      const h = (mv.dom.firstChild as HTMLElement).offsetHeight
      svg.style.left = `${gutter.offsetLeft}px`
      svg.setAttribute('width', String(w))
      svg.setAttribute('height', String(h))
      const domTop = mv.dom.getBoundingClientRect().top
      const offA = mv.a.documentTop - domTop
      const offB = mv.b.documentTop - domTop
      const vpA = mv.a.viewport
      const vpB = mv.b.viewport
      const paths: string[] = []
      mv.chunks.forEach((ch, i) => {
        if ((ch.toA < vpA.from && ch.toB < vpB.from) || (ch.fromA > vpA.to && ch.fromB > vpB.to)) return
        const [tA, bA] = span(mv.a, ch.fromA, ch.toA)
        const [tB, bB] = span(mv.b, ch.fromB, ch.toB)
        const d = ribbonPath(tA + offA, bA + offA, tB + offB, bB + offB, w)
        paths.push(`<path d="${d}"${i === currentIdx ? ' class="current"' : ''}/>`)
      })
      ribbonGroup.innerHTML = paths.join('')
    }

    const updateViewportBox = () => {
      const box = viewportBox.current
      const sc = scroller()
      if (!box || !sc) return
      const total = Math.max(sc.scrollHeight, 1)
      box.style.top = `${(sc.scrollTop / total) * 100}%`
      box.style.height = `${(sc.clientHeight / total) * 100}%`
    }

    const measureExtras = () => {
      extrasFrame = 0
      const view = merge.current?.b ?? unified.current
      const sc = scroller()
      if (!view || !sc) return
      const total = Math.max(sc.scrollHeight, 1)
      // Document origin in the scroller's content coordinates.
      const origin = view.documentTop - sc.getBoundingClientRect().top + sc.scrollTop
      const next = chunksNow().map((ch) => {
        const [top, bottomB] = span(view, ch.fromB, ch.toB)
        const bottom = merge.current ? Math.max(bottomB, span(merge.current.a, ch.fromA, ch.toA)[1]) : bottomB
        return { top: (origin + top) / total, height: (bottom - top) / total, del: ch.toA > ch.fromA, ins: ch.toB > ch.fromB }
      })
      setTicks((prev) => (sameTicks(prev, next) ? prev : next))
      updateViewportBox()
      drawRibbons()
    }

    const scheduleExtras = () => {
      if (!extrasFrame) extrasFrame = requestAnimationFrame(measureExtras)
    }

    const setCurrentIdx = (idx: number | null) => {
      if (idx === currentIdx) return
      currentIdx = idx
      setCurrent(idx)
      cb.current.onCurrent(idx)
      scheduleExtras()
    }

    const pulse = (i: number) => {
      const ch = chunksNow()[i]
      if (!ch) return
      pulseFlip = !pulseFlip
      const cls = pulseFlip ? 'cm-pulse-a' : 'cm-pulse-b'
      if (merge.current) {
        flash(merge.current.a, ch.fromA, ch.toA, cls)
        flash(merge.current.b, ch.fromB, ch.toB, cls)
      } else if (unified.current) flash(unified.current, ch.fromB, ch.toB, cls)
    }

    actions.current = {
      goTo: (i) => {
        const ch = chunksNow()[i]
        const view = merge.current?.b ?? unified.current
        if (!ch || !view) return
        const at = Math.min(ch.fromB, view.state.doc.length)
        view.dispatch({ selection: { anchor: at }, effects: EditorView.scrollIntoView(at, { y: 'center' }), userEvent: 'select.byChunk' })
        pulse(i)
      },
      // From the current change, or from the cursor when it is between changes.
      step: (dir) => {
        const list = chunksNow()
        const view = merge.current?.b ?? unified.current
        if (!list.length || !view) return
        const n = list.length
        let i: number
        if (currentIdx !== null) i = (currentIdx + dir + n) % n
        else {
          const head = view.state.selection.main.head
          i = dir > 0 ? list.findIndex((ch) => ch.fromB >= head) : list.findLastIndex((ch) => ch.toB <= head)
          if (i < 0) i = dir > 0 ? 0 : n - 1
        }
        actions.current.goTo(i)
      },
    }

    const onMerged = (view: EditorView, side: 'a' | 'b', tr: Transaction) => {
      const accepted = tr.effects.find((e) => e.is(updateOriginalDoc))
      if (accepted?.is(updateOriginalDoc)) {
        // Unified "accept": the original doc changed, which the history extension does not track.
        const inverse = accepted.value.changes.invert(getOriginalDoc(tr.startState))
        lastUndo.current = () => view.dispatch({ effects: originalDocChangeEffect(view.state, inverse) })
        cb.current.onMerge('left')
        return
      }
      const into: Side = side === 'a' ? 'left' : 'right'
      const [from, to] = changedRange(tr)
      queueMicrotask(() => flash(view, from, to, into === 'left' ? 'cm-merged-from-right' : 'cm-merged-from-left', 1100))
      lastUndo.current = () => undo(view)
      cb.current.onMerge(into)
    }

    const tracker = (side: 'a' | 'b') =>
      EditorView.updateListener.of((u) => {
        if (u.docChanged) report()
        if (u.selectionSet || u.docChanged) setCurrentIdx(chunkIndexAt(chunksNow(), u.state.selection.main.head, side))
        if (u.docChanged || u.heightChanged || u.viewportChanged || u.geometryChanged) scheduleExtras()
        for (const tr of u.transactions) if (tr.isUserEvent('revert') || tr.isUserEvent('accept')) onMerged(u.view, side, tr)
      })

    const common = (side: 'a' | 'b'): Extension[] => [
      lineNumbers(),
      highlightSpecialChars(),
      drawSelection(),
      history(),
      highlightSelectionMatches(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      editorTheme(dark),
      syntaxHighlighting(dark ? oneDarkHighlightStyle : defaultHighlightStyle, { fallback: true }),
      langSlot.current.of([]),
      wrap ? EditorView.lineWrapping : [],
      flashLines,
      tracker(side),
    ]
    const collapseConf = collapse ? { margin: 3, minSize: 6 } : undefined
    const diffConfig = diffConfigFor({ whitespace: ignoreWhitespace, case: ignoreCase })

    if (layout === 'split') {
      const intoLeft = direction === 'b-to-a'
      const mergeLabel = `Merge change into ${intoLeft ? 'left' : 'right'}`
      merge.current = new MergeView({
        parent,
        a: { doc: pad(texts.current.left), extensions: common('a') },
        b: { doc: pad(texts.current.right), extensions: common('b') },
        revertControls: direction,
        renderRevertControl: () => {
          const btn = document.createElement('button')
          btn.setAttribute('aria-label', mergeLabel)
          btn.title = mergeLabel
          btn.textContent = intoLeft ? '←' : '→'
          return btn
        },
        highlightChanges: true,
        gutter: true,
        collapseUnchanged: collapseConf,
        diffConfig,
      })
    } else {
      unified.current = new EditorView({
        parent,
        doc: pad(texts.current.right),
        extensions: [
          ...common('b'),
          unifiedMergeView({
            original: pad(texts.current.left),
            highlightChanges: true,
            gutter: true,
            mergeControls: true,
            collapseUnchanged: collapseConf,
            diffConfig,
          }),
        ],
      })
    }
    report()
    scheduleExtras()
    cb.current.onCurrent(null)

    const sc = scroller()!
    sc.addEventListener('scroll', updateViewportBox, { passive: true })
    const resize = new ResizeObserver(scheduleExtras)
    resize.observe(parent)

    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(extrasFrame)
      sc.removeEventListener('scroll', updateViewportBox)
      resize.disconnect()
      merge.current?.destroy()
      unified.current?.destroy()
      merge.current = null
      unified.current = null
      lastUndo.current = null
      svg.remove()
    }
  }, [layout, dark, wrap, collapse, direction, ignoreWhitespace, ignoreCase])

  // Swap syntax highlighting in place; no need to rebuild the diff.
  useEffect(() => {
    let cancelled = false
    loadLanguage(language).then((support) => {
      if (cancelled) return
      const views = merge.current ? [merge.current.a, merge.current.b] : unified.current ? [unified.current] : []
      for (const v of views) v.dispatch({ effects: langSlot.current.reconfigure(support ?? []) })
    })
    return () => {
      cancelled = true
    }
  }, [language, layout, dark, wrap, collapse, direction, ignoreWhitespace, ignoreCase])

  return (
    <div className="flex h-full min-h-0">
      <div ref={host} className="diff-host h-full min-h-0 min-w-0 flex-1 overflow-auto" />
      <nav aria-label="Change map" className="relative w-4 shrink-0 border-l border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        <div ref={viewportBox} aria-hidden className="pointer-events-none absolute inset-x-0 bg-zinc-900/8 dark:bg-white/10" />
        {ticks.map((t, i) => (
          <button
            key={i}
            tabIndex={-1}
            aria-label={`Go to change ${i + 1}`}
            aria-current={i === current || undefined}
            onClick={() => actions.current.goTo(i)}
            style={{ top: `${t.top * 100}%`, height: `max(3px, ${t.height * 100}%)`, background: tickBackground(t) }}
            className="absolute inset-x-[3px] rounded-[1px] opacity-80 hover:opacity-100 aria-[current]:inset-x-px aria-[current]:opacity-100 aria-[current]:ring-2 aria-[current]:ring-indigo-500"
          />
        ))}
      </nav>
    </div>
  )
})

export default DiffView
