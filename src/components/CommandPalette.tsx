import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { matchCommands, type Command } from '../lib/commands'

interface Props {
  open: boolean
  onClose: () => void
  /** Called each time the palette opens. */
  getCommands: () => Command[]
}

/** ⌘K action search. Native <dialog> handles focus trapping and Esc. */
export default function CommandPalette({ open, onClose, getCommands }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [commands, setCommands] = useState<Command[]>([])
  const listId = useId()
  const latest = useRef(getCommands)
  useLayoutEffect(() => {
    latest.current = getCommands
  })

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      setQuery('')
      setActive(0)
      setCommands(latest.current())
      d.showModal()
      input.current?.focus()
    } else if (!open && d.open) d.close()
  }, [open])

  const results = useMemo(() => matchCommands(commands, query), [commands, query])
  const current = Math.min(active, results.length - 1)

  useEffect(() => {
    document.getElementById(`${listId}-${current}`)?.scrollIntoView({ block: 'nearest' })
  }, [current, listId])

  const run = (c: Command | undefined) => {
    if (!c) return
    onClose()
    c.run()
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label="Command palette"
      className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <span aria-hidden className="text-zinc-400">
          ⌕
        </span>
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive((current + 1) % Math.max(results.length, 1))
            else if (e.key === 'ArrowUp') setActive((current - 1 + results.length) % Math.max(results.length, 1))
            else if (e.key === 'Enter') run(results[current])
            else return
            e.preventDefault()
          }}
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={results.length ? `${listId}-${current}` : undefined}
          aria-label="Search actions"
          placeholder="Search actions…"
          spellCheck={false}
          className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
        />
        <kbd className="rounded border border-zinc-300 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:border-zinc-700">esc</kbd>
      </div>
      <ul id={listId} role="listbox" aria-label="Actions" className="max-h-80 overflow-y-auto p-1">
        {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-zinc-500">No matching actions</li>}
        {results.map((c, i) => (
          <li key={c.id}>
            {(i === 0 || results[i - 1].group !== c.group) && (
              <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">{c.group}</div>
            )}
            <div
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === current}
              onClick={() => run(c)}
              onMouseMove={() => i !== current && setActive(i)}
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-md px-3 py-2 text-sm ${
                i === current ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-100' : 'text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {c.label}
              {c.hint && <span className="text-xs text-zinc-400">{c.hint}</span>}
            </div>
          </li>
        ))}
      </ul>
    </dialog>
  )
}
