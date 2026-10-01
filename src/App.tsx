import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CommandPalette from './components/CommandPalette'
import DiffToolbar, { type ExportKind } from './components/DiffToolbar'
import type { DiffStats, DiffViewHandle, Side } from './components/DiffView'
import Mascot, { type Mood } from './components/Mascot'
import Menu from './components/Menu'
import RecentStrip from './components/RecentStrip'
import ShortcutsDialog from './components/ShortcutsDialog'
import type { Command } from './lib/commands'
import { addEntry, entryTitle, type HistoryEntry } from './lib/history'
import { LANGUAGE_OPTIONS, detectFromFilename, detectLanguage } from './lib/languages'
import { DEFAULT_OPTIONS, type Options } from './lib/options'
import { modKey } from './lib/platform'
import { SHARE_MAX_CHARS, SHARE_WARN_CHARS, decodeShare, encodeShare } from './lib/share'
import { readJson, writeJson } from './lib/storage'
import { transforms } from './lib/transforms'

// CodeMirror is most of the bundle; the input screen does not need it.
const loadDiffView = () => import('./components/DiffView')
const DiffView = lazy(loadDiffView)

const MAX_FILE_BYTES = 5 * 1024 * 1024

const loadOptions = (): Options => ({ ...DEFAULT_OPTIONS, ...readJson<Partial<Options>>('options', {}) })

/** Persist history, dropping the oldest entries if the storage quota is hit. */
function persistHistory(entries: HistoryEntry[]) {
  for (let list = entries; ; list = list.slice(0, -1)) {
    if (writeJson('history', list) || list.length === 0) return
  }
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

interface Toast {
  text: string
  tone: 'ok' | 'warn'
  action?: { label: string; run: () => void }
}

function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef(0)
  const show = useCallback((text: string, tone: Toast['tone'] = 'ok', action?: Toast['action']) => {
    clearTimeout(timer.current)
    setToast({ text, tone, action })
    timer.current = window.setTimeout(() => setToast(null), tone === 'warn' ? 6000 : action ? 4500 : 2500)
  }, [])
  const hide = useCallback(() => setToast(null), [])
  return { toast, show, hide }
}

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // Storage unavailable (private mode); theme still applies for this session.
    }
    setDark(next)
  }
  return { dark, toggle }
}

/** True for `ms` after each call to the returned trigger. */
function useBlip(ms: number) {
  const [on, setOn] = useState(false)
  const timer = useRef(0)
  const trigger = useCallback(() => {
    clearTimeout(timer.current)
    setOn(true)
    timer.current = window.setTimeout(() => setOn(false), ms)
  }, [ms])
  return [on, trigger] as const
}

interface PaneProps {
  label: string
  value: string
  fileName: string | null
  onChange: (v: string) => void
  onFile: (text: string, name: string) => void
}

function Pane({ label, value, fileName, onChange, onFile }: PaneProps) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const read = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      alert(`${file.name} is larger than 5 MB.`)
      return
    }
    onFile(await file.text(), file.name)
  }

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        read(e.dataTransfer.files[0])
      }}
    >
      <header className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="truncate font-medium text-zinc-600 dark:text-zinc-400">
          {label}
          {fileName && <span className="ml-2 font-normal text-zinc-400 dark:text-zinc-500">{fileName}</span>}
        </span>
        <button
          onClick={() => input.current?.click()}
          className="shrink-0 rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ⇪ Open file
        </button>
        <input
          ref={input}
          type="file"
          hidden
          onChange={(e) => {
            read(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </header>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        spellCheck={false}
        placeholder="Paste text or drop a file here…"
        className={`min-h-64 w-full flex-1 resize-none rounded-lg border bg-white p-3 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:bg-zinc-900 ${
          dragging ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-zinc-200 dark:border-zinc-800'
        }`}
      />
    </section>
  )
}

function clearHash() {
  window.history.replaceState(null, '', location.pathname + location.search)
}

const headerBtn =
  'shrink-0 rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'

export default function App() {
  const { dark, toggle } = useTheme()
  // A share link (#d=...) opens straight into the diff.
  const [shared] = useState(() => decodeShare(location.hash))
  const [left, setLeft] = useState(shared?.left ?? '')
  const [right, setRight] = useState(shared?.right ?? '')
  const [files, setFiles] = useState<{ left: string | null; right: string | null }>({
    left: shared?.leftName ?? null,
    right: shared?.rightName ?? null,
  })
  const [mode, setMode] = useState<'edit' | 'diff'>(shared ? 'diff' : 'edit')
  const [history, setHistory] = useState<HistoryEntry[]>(() => readJson('history', []))
  const [helpOpen, setHelpOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { toast, show, hide } = useToast()
  const [options, setOptions] = useState<Options>(loadOptions)
  // Bumped when text is replaced from outside the diff view (transforms), forcing a rebuild.
  const [revision, setRevision] = useState(0)
  const [stats, setStats] = useState<DiffStats>({ removals: 0, additions: 0, chunks: 0 })
  const [ready, setReady] = useState(false)
  const [current, setCurrent] = useState<number | null>(null)
  const [merging, blipMerging] = useBlip(1200)
  // Texts as they were when "Find difference" was pressed; target of "Reset merges".
  const [baseline, setBaseline] = useState({ left: shared?.left ?? '', right: shared?.right ?? '' })
  const diff = useRef<DiffViewHandle>(null)

  useEffect(() => {
    writeJson('options', options)
  }, [options])

  useEffect(() => persistHistory(history), [history])

  // Drop the payload from the address bar so reloads and bookmarks do not carry it around.
  useEffect(() => {
    if (shared) clearHash()
  }, [shared])

  // Warm the editor chunk while the user is still typing input.
  useEffect(() => {
    const id = 'requestIdleCallback' in window ? requestIdleCallback(() => loadDiffView()) : setTimeout(loadDiffView, 1500)
    return () => ('cancelIdleCallback' in window ? cancelIdleCallback(id) : clearTimeout(id))
  }, [])

  const detected = useMemo(() => {
    const byName = (files.right && detectFromFilename(files.right)) || (files.left && detectFromFilename(files.left))
    return byName || detectLanguage(right || left)
  }, [files, left, right])
  const language = options.language === 'auto' ? detected : options.language

  const onDiffChange = useCallback((l: string, r: string) => {
    setLeft(l)
    setRight(r)
  }, [])

  const onStats = useCallback((s: DiffStats) => {
    setStats(s)
    setReady(true)
  }, [])

  const enterDiff = () => {
    setReady(false)
    setCurrent(null)
    setMode('diff')
  }

  const compare = useCallback(() => {
    if (!left && !right) return
    setBaseline({ left, right })
    setReady(false)
    setCurrent(null)
    setMode('diff')
    if (options.saveHistory) {
      const entry = { id: crypto.randomUUID(), savedAt: Date.now(), left, right, leftName: files.left, rightName: files.right }
      setHistory((h) => addEntry(h, entry))
    }
  }, [left, right, files, options.saveHistory])

  const openEntry = (e: { left: string; right: string; leftName?: string | null; rightName?: string | null }) => {
    setLeft(e.left)
    setRight(e.right)
    setFiles({ left: e.leftName ?? null, right: e.rightName ?? null })
    setBaseline({ left: e.left, right: e.right })
    enterDiff()
    setRevision((n) => n + 1)
  }

  // Also handle a share link pasted into an already-open tab.
  useEffect(() => {
    const onHash = () => {
      const data = decodeShare(location.hash)
      if (!data) return
      openEntry(data)
      clearHash()
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      } else if (paletteOpen) {
        // The palette handles its own keys.
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        compare()
      } else if (e.key === '?' && !isTyping(e.target)) {
        e.preventDefault()
        setHelpOpen(true)
      } else if (mode === 'diff' && e.key === 'F7') {
        e.preventDefault()
        if (e.shiftKey) diff.current?.prev()
        else diff.current?.next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [compare, mode, paletteOpen])

  const patchOptions = (patch: Partial<Options>) => setOptions((o) => ({ ...o, ...patch }))

  const replaceTexts = (l: string, r: string) => {
    setLeft(l)
    setRight(r)
    setRevision((n) => n + 1)
  }

  const applyTransform = (id: string) => {
    const t = transforms.find((x) => x.id === id)
    if (t) replaceTexts(t.apply(left), t.apply(right))
  }

  const swap = () => {
    replaceTexts(right, left)
    setFiles({ left: files.right, right: files.left })
    setBaseline((b) => ({ left: b.right, right: b.left }))
  }

  const liveTexts = () => diff.current?.getTexts() ?? { left, right }

  const onMerge = useCallback(
    (into: Side) => {
      blipMerging()
      show(`Merged 1 change into ${into}`, 'ok', { label: 'Undo', run: () => diff.current?.undoMerge() })
    },
    [blipMerging, show],
  )

  const takeAll = (into: Side) => {
    const before = liveTexts()
    if (into === 'left') replaceTexts(before.right, before.right)
    else replaceTexts(before.left, before.left)
    blipMerging()
    show(`Took all changes into ${into}`, 'ok', { label: 'Undo', run: () => replaceTexts(before.left, before.right) })
  }

  const resetMerges = () => replaceTexts(baseline.left, baseline.right)

  const dirty = left !== baseline.left || right !== baseline.right
  const names = { left: files.left ?? 'original.txt', right: files.right ?? 'changed.txt' }

  // Export helpers pull in jsdiff, so load them only when the user exports.
  const exportAs = async (kind: ExportKind) => {
    const { downloadText, htmlReport, stem, unifiedPatch } = await import('./lib/export')
    const { left: l, right: r } = liveTexts()
    if (kind === 'left') downloadText(names.left, l)
    else if (kind === 'right') downloadText(names.right, r)
    else if (kind === 'patch') downloadText(`${stem(names.right)}.patch`, unifiedPatch(l, r, names), 'text/x-diff')
    else downloadText(`${stem(names.left)}-vs-${stem(names.right)}.html`, htmlReport(l, r, names), 'text/html')
  }

  const copySide = async (side: Side) => {
    try {
      await navigator.clipboard.writeText(liveTexts()[side])
      show(`Copied ${side === 'left' ? 'original' : 'changed'} text`)
    } catch {
      show('Could not copy to clipboard.', 'warn')
    }
  }

  const share = async () => {
    const { left: l, right: r } = liveTexts()
    const hash = encodeShare({ left: l, right: r, leftName: files.left, rightName: files.right })
    if (hash.length > SHARE_MAX_CHARS) {
      show('Too large to share as a link. Use Export instead.', 'warn')
      return
    }
    const url = `${location.origin}${location.pathname}${hash}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      show('Could not copy to clipboard.', 'warn')
      return
    }
    const kb = Math.round(url.length / 1024)
    if (url.length > SHARE_WARN_CHARS) show(`Link copied (${kb} KB). Some apps truncate long links.`, 'warn')
    else show('Share link copied. Anyone with repo access can open it.')
  }

  const clear = () => {
    setLeft('')
    setRight('')
    setFiles({ left: null, right: null })
    setMode('edit')
  }

  const mood: Mood =
    mode === 'edit' ? 'idle' : merging ? 'merging' : !ready ? 'scanning' : stats.chunks === 0 ? 'identical' : 'found'

  // Built when the palette opens, so it always reflects the current state.
  const buildCommands = () => {
    const commands: Command[] = []
    const add = (group: string, label: string, run: () => void, hint?: string) =>
      commands.push({ id: `${group}:${label}`, group, label, run, hint })
    const onOff = (v: boolean) => (v ? 'on' : 'off')
    if (mode === 'edit') {
      add('Compare', 'Find difference', compare, `${modKey}↵`)
      add('Compare', 'Swap sides', swap)
      for (const t of transforms) add('Transform both sides', t.label, () => applyTransform(t.id))
      for (const e of history.slice(0, 10)) add('Recent', entryTitle(e), () => openEntry(e))
    } else {
      add('Navigate', 'Next change', () => diff.current?.next(), 'F7')
      add('Navigate', 'Previous change', () => diff.current?.prev(), '⇧F7')
      for (let i = 0; i < Math.min(stats.chunks, 50); i++) add('Navigate', `Go to change ${i + 1}`, () => diff.current?.goTo(i))
      add('Navigate', 'Edit input', () => setMode('edit'))
      add('View', 'Split layout', () => patchOptions({ layout: 'split' }))
      add('View', 'Unified layout', () => patchOptions({ layout: 'unified' }))
      add('View', 'Ignore whitespace', () => patchOptions({ ignoreWhitespace: !options.ignoreWhitespace }), onOff(options.ignoreWhitespace))
      add('View', 'Ignore case', () => patchOptions({ ignoreCase: !options.ignoreCase }), onOff(options.ignoreCase))
      add('View', 'Hide unchanged lines', () => patchOptions({ collapse: !options.collapse }), onOff(options.collapse))
      add('View', 'Line wrap', () => patchOptions({ wrap: !options.wrap }), onOff(options.wrap))
      add('Merge', 'Merge arrows into left', () => patchOptions({ direction: 'b-to-a' }))
      add('Merge', 'Merge arrows into right', () => patchOptions({ direction: 'a-to-b' }))
      add('Merge', 'Take all into left', () => takeAll('left'))
      add('Merge', 'Take all into right', () => takeAll('right'))
      if (dirty) add('Merge', 'Reset merges', resetMerges)
      add('Merge', 'Swap sides', swap)
      add('Output', 'Copy share link', share)
      add('Output', 'Export unified patch', () => exportAs('patch'))
      add('Output', 'Export HTML report', () => exportAs('html'))
      add('Output', 'Download original', () => exportAs('left'))
      add('Output', 'Download changed', () => exportAs('right'))
      add('Output', 'Copy original', () => copySide('left'))
      add('Output', 'Copy changed', () => copySide('right'))
      add('Syntax', 'Syntax: auto', () => patchOptions({ language: 'auto' }))
      add('Syntax', 'Syntax: plain text', () => patchOptions({ language: 'plain' }))
      for (const l of LANGUAGE_OPTIONS) add('Syntax', `Syntax: ${l}`, () => patchOptions({ language: l }))
      add('App', 'Clear', clear)
    }
    add('App', dark ? 'Light theme' : 'Dark theme', toggle)
    add('App', 'Keyboard shortcuts', () => setHelpOpen(true), '?')
    return commands
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Mascot mood={mood} size={34} />
          <span className="font-semibold tracking-tight">sidebyside</span>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            beta
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Search actions"
            title={`Search actions (${modKey}K)`}
            className={`${headerBtn} flex items-center gap-2 md:border md:border-zinc-200 md:pr-1.5 md:dark:border-zinc-800`}
          >
            <span aria-hidden>⌕</span>
            <span className="hidden text-zinc-500 md:inline">Search actions</span>
            <kbd className="hidden rounded border border-zinc-200 px-1 font-mono text-[10px] text-zinc-500 md:inline dark:border-zinc-700">
              {modKey}K
            </kbd>
          </button>
          <button onClick={() => setHelpOpen(true)} className={headerBtn} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
            ⌨
          </button>
          <button onClick={toggle} className={headerBtn} aria-label="Toggle theme">
            {dark ? '☀︎' : '☾'}
            <span className="ml-1 hidden sm:inline">{dark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </header>

      {mode === 'edit' ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:flex-row">
            <Pane
              label="Original text"
              value={left}
              fileName={files.left}
              onChange={setLeft}
              onFile={(text, name) => {
                setLeft(text)
                setFiles((f) => ({ ...f, left: name }))
              }}
            />
            <Pane
              label="Changed text"
              value={right}
              fileName={files.right}
              onChange={setRight}
              onFile={(text, name) => {
                setRight(text)
                setFiles((f) => ({ ...f, right: name }))
              }}
            />
          </main>
          <RecentStrip
            history={history}
            saveHistory={options.saveHistory}
            onToggleSave={(saveHistory) => patchOptions({ saveHistory })}
            onOpen={openEntry}
            onDelete={(id) => setHistory((h) => h.filter((e) => e.id !== id))}
            onClear={() => setHistory([])}
          />
          <footer className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-zinc-200 p-3 md:justify-between dark:border-zinc-800">
            <div className="hidden items-center gap-2 md:flex">
              <Mascot mood={left && right ? 'scanning' : 'idle'} size={40} />
              <span className="rounded-xl rounded-bl-sm bg-white px-3 py-1.5 text-sm text-zinc-600 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800">
                {left && right ? 'Ready when you are.' : "Paste both sides. We'll spot every change."}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Menu
                label="Transform ▾"
                ariaLabel="Transform both sides"
                title="Apply to both sides"
                up
                items={transforms.map((t) => ({ label: t.label, disabled: !left && !right, onSelect: () => applyTransform(t.id) }))}
              />
              <button
                onClick={swap}
                className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                ⇄ Swap
              </button>
              <button
                onClick={compare}
                disabled={!left && !right}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Find difference <kbd className="ml-1.5 text-xs opacity-70">{modKey}↵</kbd>
              </button>
            </div>
          </footer>
        </div>
      ) : (
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <DiffToolbar
            options={options}
            onOptions={patchOptions}
            detected={detected}
            stats={stats}
            ready={ready}
            current={current}
            dirty={dirty}
            same={left === right}
            names={names}
            onEdit={() => setMode('edit')}
            onPrev={() => diff.current?.prev()}
            onNext={() => diff.current?.next()}
            onShare={share}
            onExport={exportAs}
            onCopy={copySide}
            onTakeAll={takeAll}
            onReset={resetMerges}
            onSwap={swap}
            onClear={clear}
            onShortcuts={() => setHelpOpen(true)}
          />
          <div className="min-h-0 flex-1">
            <Suspense
              fallback={
                <div className="flex items-center gap-3 p-6 text-sm text-zinc-500">
                  <Mascot mood="scanning" size={40} /> Loading editor…
                </div>
              }
            >
              <DiffView
                key={revision}
                ref={diff}
                left={left}
                right={right}
                dark={dark}
                layout={options.layout}
                wrap={options.wrap}
                collapse={options.collapse}
                direction={options.direction}
                ignoreWhitespace={options.ignoreWhitespace}
                ignoreCase={options.ignoreCase}
                language={language}
                onChange={onDiffChange}
                onStats={onStats}
                onCurrent={setCurrent}
                onMerge={onMerge}
              />
            </Suspense>
          </div>
        </main>
      )}

      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} getCommands={buildCommands} />
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        {toast && (
          <div
            className={`sbs-toast pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-2 text-sm shadow-lg ${
              toast.tone === 'warn' ? 'bg-amber-500 text-amber-950' : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            }`}
          >
            {toast.text}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action?.run()
                  hide()
                }}
                className="-my-1 rounded px-2 py-1 font-semibold text-indigo-300 hover:bg-white/10 dark:text-indigo-700 dark:hover:bg-black/10"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
