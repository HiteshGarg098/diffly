export type Mood = 'idle' | 'scanning' | 'found' | 'identical' | 'merging'

interface Props {
  mood?: Mood
  /** Rendered width in px; height follows the 4:3 viewBox. */
  size?: number
  className?: string
}

/** Minus and Plus: the two sides of a diff. Animations live in index.css (.mascot-*). */
export default function Mascot({ mood = 'idle', size = 32, className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 64 48"
      width={size}
      height={(size * 3) / 4}
      aria-hidden
      className={`mascot mascot-${mood} shrink-0 overflow-visible ${className}`}
    >
      <g className="m-bar m-minus">
        <rect x="10" y="8" width="20" height="34" rx="8" fill="#f87171" />
        <g className="m-eyes" fill="#18181b">
          <circle cx="16.5" cy="20" r="2.4" />
          <circle cx="23.5" cy="20" r="2.4" />
        </g>
        <path d="M17.5 25 q2.5 2.2 5 0" stroke="#18181b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <rect x="16" y="32" width="8" height="2.4" rx="1.2" fill="#fff" />
      </g>
      <g className="m-bar m-plus">
        <rect x="34" y="8" width="20" height="34" rx="8" fill="#34d399" />
        <g className="m-eyes" fill="#18181b">
          <circle cx="40.5" cy="20" r="2.4" />
          <circle cx="47.5" cy="20" r="2.4" />
        </g>
        <path d="M41.5 25 q2.5 2.2 5 0" stroke="#18181b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <rect x="40" y="32" width="8" height="2.4" rx="1.2" fill="#fff" />
        <rect x="42.8" y="29.2" width="2.4" height="8" rx="1.2" fill="#fff" />
      </g>
      {mood === 'identical' && (
        <g className="m-sparkles" fill="#fbbf24">
          <path d="M32 0 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z" />
          <path d="M6 4 l1 2.2 2.2 1 -2.2 1 -1 2.2 -1 -2.2 -2.2 -1 2.2 -1z" />
          <path d="M58 4 l1 2.2 2.2 1 -2.2 1 -1 2.2 -1 -2.2 -2.2 -1 2.2 -1z" />
        </g>
      )}
    </svg>
  )
}
