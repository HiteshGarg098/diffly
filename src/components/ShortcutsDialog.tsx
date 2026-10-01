import { useEffect, useRef } from 'react'
import { modKey as mod } from '../lib/platform'

const SHORTCUTS: [string, string][] = [
  [`${mod} Enter`, 'Find difference'],
  [`${mod} K`, 'Search actions'],
  ['F7', 'Next change'],
  ['Shift F7', 'Previous change'],
  [`${mod} F`, 'Search in editor'],
  [`${mod} Z`, 'Undo edit or merge'],
  [`${mod} Shift Z`, 'Redo'],
  ['?', 'Show this help'],
  ['Esc', 'Close dialog or menu'],
]

interface Props {
  open: boolean
  onClose: () => void
}

/** Native <dialog> gives focus trapping, Esc to close and inert background for free. */
export default function ShortcutsDialog({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="shortcuts-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="shortcuts-title" className="font-semibold">
            Keyboard shortcuts
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            ✕
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          {SHORTCUTS.map(([keys, action]) => (
            <div key={keys} className="flex items-center justify-between gap-4">
              <dt className="text-zinc-600 dark:text-zinc-400">{action}</dt>
              <dd className="flex gap-1">
                {keys.split(' ').map((k) => (
                  <kbd
                    key={k}
                    className="rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </dialog>
  )
}
