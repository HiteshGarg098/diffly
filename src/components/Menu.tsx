import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export interface MenuItem {
  label: string
  hint?: string
  onSelect: () => void
  /** Renders as a menuitemcheckbox with a check mark. */
  checked?: boolean
  disabled?: boolean
}

interface Props {
  label: ReactNode
  items: MenuItem[]
  /** Accessible name when the label is an icon. */
  ariaLabel?: string
  title?: string
  /** Open above the button (for menus in a footer). */
  up?: boolean
  align?: 'left' | 'right'
}

const ITEMS = '[role^="menuitem"]:not(:disabled)'

/** Dropdown menu following the WAI-ARIA menu button pattern. */
export default function Menu({ label, items, ariaLabel, title, up = false, align = 'right' }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    list.current?.querySelector<HTMLElement>(ITEMS)?.focus()
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  const close = () => {
    setOpen(false)
    button.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const els = [...(list.current?.querySelectorAll<HTMLElement>(ITEMS) ?? [])]
    const i = els.indexOf(document.activeElement as HTMLElement)
    const focus = (n: number) => els[(n + els.length) % els.length]?.focus()
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowDown') focus(i + 1)
    else if (e.key === 'ArrowUp') focus(i - 1)
    else if (e.key === 'Home') focus(0)
    else if (e.key === 'End') focus(-1)
    else if (e.key === 'Tab') setOpen(false)
    else return
    if (e.key !== 'Tab') e.preventDefault()
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={ariaLabel}
        title={title}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="rounded-md px-2.5 py-1 text-sm whitespace-nowrap text-zinc-600 transition-colors hover:bg-zinc-200/60 aria-expanded:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:aria-expanded:bg-zinc-800"
      >
        {label}
      </button>
      {open && (
        <div
          ref={list}
          id={id}
          role="menu"
          onKeyDown={onKeyDown}
          className={`absolute z-20 min-w-56 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 ${
            up ? 'bottom-full mb-1' : 'mt-1'
          } ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
              aria-checked={item.checked}
              tabIndex={-1}
              disabled={item.disabled}
              onClick={() => {
                close()
                item.onSelect()
              }}
              className="flex w-full items-center justify-between gap-4 rounded-md px-2.5 py-1.5 text-left text-sm text-zinc-700 outline-none hover:bg-zinc-100 focus:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
            >
              <span className="flex items-center gap-2">
                {item.checked !== undefined && (
                  <span aria-hidden className={`w-3 text-indigo-600 dark:text-indigo-400 ${item.checked ? '' : 'invisible'}`}>
                    ✓
                  </span>
                )}
                {item.label}
              </span>
              {item.hint && <span className="text-xs text-zinc-400">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
