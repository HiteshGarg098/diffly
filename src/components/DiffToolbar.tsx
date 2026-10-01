import type { ReactNode } from 'react'
import { LANGUAGE_OPTIONS, type LanguageChoice } from '../lib/languages'
import type { Options } from '../lib/options'
import type { DiffStats, Side } from './DiffView'
import Menu from './Menu'

export type ExportKind = 'left' | 'right' | 'patch' | 'html'

interface Props {
  options: Options
  onOptions: (patch: Partial<Options>) => void
  detected: string
  stats: DiffStats
  /** False until the first diff result arrives. */
  ready: boolean
  current: number | null
  /** Texts differ from what "Find difference" compared. */
  dirty: boolean
  same: boolean
  names: { left: string; right: string }
  onEdit: () => void
  onPrev: () => void
  onNext: () => void
  onShare: () => void
  onExport: (kind: ExportKind) => void
  onCopy: (side: Side) => void
  onTakeAll: (into: Side) => void
  onReset: () => void
  onSwap: () => void
  onClear: () => void
  onShortcuts: () => void
}

function Btn({ children, onClick, title, label }: { children: ReactNode; onClick: () => void; title?: string; label?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={label}
      className="rounded-md px-2.5 py-1 text-sm whitespace-nowrap text-zinc-600 transition-colors hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  )
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex rounded-lg bg-zinc-200/70 p-0.5 dark:bg-zinc-800">
      {options.map(([v, text]) => (
        <button
          key={v}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`rounded-md px-2.5 py-0.5 text-sm whitespace-nowrap transition-colors ${
            value === v
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-white'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

function Chip({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-sm whitespace-nowrap transition-colors ${
        on
          ? 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-500/50 dark:bg-indigo-500/15 dark:text-indigo-200'
          : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600'
      }`}
    >
      {on && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12l5 5L20 7" />
        </svg>
      )}
      {label}
    </button>
  )
}

const Divider = () => <span aria-hidden className="hidden h-5 w-px bg-zinc-200 lg:block dark:bg-zinc-800" />

function Status({ stats, ready, current, dirty }: Pick<Props, 'stats' | 'ready' | 'current' | 'dirty'>) {
  if (!ready) return <span className="text-sm text-zinc-500">Comparing…</span>
  if (stats.chunks === 0) return <span className="text-sm text-zinc-500">{dirty ? 'No differences left' : 'No differences'}</span>
  const where = current === null ? `${stats.chunks} ${stats.chunks === 1 ? 'change' : 'changes'}` : `Change ${current + 1} of ${stats.chunks}`
  return (
    <span className="flex items-center gap-2 text-sm whitespace-nowrap">
      <span className="text-zinc-700 tabular-nums dark:text-zinc-300">{where}</span>
      <span title={`${stats.removals} removed lines`} className="font-semibold text-red-600 tabular-nums dark:text-red-400">
        −{stats.removals}
      </span>
      <span title={`${stats.additions} added lines`} className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
        +{stats.additions}
      </span>
    </span>
  )
}

/** Diff screen toolbar: navigate | view | output, with rare actions under ⋯. */
export default function DiffToolbar(props: Props) {
  const { options, onOptions, names } = props
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <Btn onClick={props.onEdit} label="Edit input" title="Back to the input screen">
          ← <span className="hidden sm:inline">Edit</span>
        </Btn>
        <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-900">
          <Btn onClick={props.onPrev} label="Previous change" title="Previous change (Shift+F7)">
            ↑
          </Btn>
          <Btn onClick={props.onNext} label="Next change" title="Next change (F7)">
            ↓
          </Btn>
        </div>
        <Status {...props} />
      </div>

      <Divider />

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Layout"
          value={options.layout}
          options={[
            ['split', 'Split'],
            ['unified', 'Unified'],
          ]}
          onChange={(layout) => onOptions({ layout })}
        />
        <Chip label="Ignore whitespace" on={options.ignoreWhitespace} onChange={(ignoreWhitespace) => onOptions({ ignoreWhitespace })} />
        <Chip label="Hide unchanged" on={options.collapse} onChange={(collapse) => onOptions({ collapse })} />
        {options.layout === 'split' && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Merge into</span>
            <Segmented
              label="Merge into"
              value={options.direction}
              options={[
                ['b-to-a', '← Left'],
                ['a-to-b', 'Right →'],
              ]}
              onChange={(direction) => onOptions({ direction })}
            />
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <select
          aria-label="Syntax"
          title="Syntax highlighting"
          value={options.language}
          onChange={(e) => onOptions({ language: e.target.value as LanguageChoice })}
          className="max-w-28 rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
        >
          <option value="auto">Auto ({props.detected})</option>
          <option value="plain">Plain text</option>
          {LANGUAGE_OPTIONS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <Btn onClick={props.onShare} title="Copy a link containing both texts. Anyone you send it to can read them.">
          🔗 Share
        </Btn>
        <Menu
          label="Export ▾"
          ariaLabel="Export"
          items={[
            { label: 'Download original', hint: names.left, onSelect: () => props.onExport('left') },
            { label: 'Download changed', hint: names.right, onSelect: () => props.onExport('right') },
            { label: 'Unified patch', hint: '.patch', onSelect: () => props.onExport('patch') },
            { label: 'HTML report', hint: '.html', onSelect: () => props.onExport('html') },
            { label: 'Copy original', hint: 'clipboard', onSelect: () => props.onCopy('left') },
            { label: 'Copy changed', hint: 'clipboard', onSelect: () => props.onCopy('right') },
          ]}
        />
        <Menu
          label="⋯"
          ariaLabel="More actions"
          items={[
            { label: 'Take all into left', hint: '⇐', disabled: props.same, onSelect: () => props.onTakeAll('left') },
            { label: 'Take all into right', hint: '⇒', disabled: props.same, onSelect: () => props.onTakeAll('right') },
            { label: 'Reset merges', hint: '↺', disabled: !props.dirty, onSelect: props.onReset },
            { label: 'Swap sides', hint: '⇄', onSelect: props.onSwap },
            { label: 'Line wrap', checked: options.wrap, onSelect: () => onOptions({ wrap: !options.wrap }) },
            { label: 'Ignore case', checked: options.ignoreCase, onSelect: () => onOptions({ ignoreCase: !options.ignoreCase }) },
            { label: 'Keyboard shortcuts', hint: '?', onSelect: props.onShortcuts },
            { label: 'Clear', onSelect: props.onClear },
          ]}
        />
      </div>
    </div>
  )
}
