import { entryTitle, relativeTime, type HistoryEntry } from '../lib/history'

interface Props {
  history: HistoryEntry[]
  saveHistory: boolean
  onToggleSave: (v: boolean) => void
  onOpen: (entry: HistoryEntry) => void
  onDelete: (id: string) => void
  onClear: () => void
}

/** Saved comparisons, shown under the input panes. */
export default function RecentStrip({ history, saveHistory, onToggleSave, onOpen, onDelete, onClear }: Props) {
  return (
    <section aria-label="Recent comparisons" className="shrink-0 px-4 pb-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
        <h2 className="font-semibold tracking-wider uppercase">Recent</h2>
        <label className="flex items-center gap-2">
          <button
            role="switch"
            aria-checked={saveHistory}
            aria-label="Save comparisons"
            onClick={() => onToggleSave(!saveHistory)}
            className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${saveHistory ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${saveHistory ? 'translate-x-3' : ''}`}
            />
          </button>
          Save comparisons
        </label>
        <span>Stored only in this browser. Nothing is uploaded.</span>
        {history.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Delete all saved comparisons from this browser?')) onClear()
            }}
            className="ml-auto rounded px-1.5 py-0.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Clear history
          </button>
        )}
      </div>
      {history.length === 0 ? (
        <p className="text-xs text-zinc-400">No saved comparisons yet.</p>
      ) : (
        <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {history.map((e) => (
            <li
              key={e.id}
              className="group flex max-w-64 shrink-0 items-center rounded-lg border border-zinc-200 bg-white hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500/50"
            >
              <button onClick={() => onOpen(e)} className="min-w-0 flex-1 px-3 py-1.5 text-left">
                <span className="block truncate text-sm text-zinc-800 dark:text-zinc-200">{entryTitle(e)}</span>
                <span className="block text-xs text-zinc-500">{relativeTime(e.savedAt)}</span>
              </button>
              <button
                onClick={() => onDelete(e.id)}
                aria-label={`Delete ${entryTitle(e)}`}
                className="mr-1 rounded px-1.5 py-0.5 text-zinc-400 hover:text-red-600 focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
