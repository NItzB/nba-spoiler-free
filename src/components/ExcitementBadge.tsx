import { useState, useRef, useEffect } from 'react'
import { ExcitementTier } from '../types/game'

interface ExcitementBadgeProps {
  score: number                  // 0–10 (legacy column) — display is score * 10
  size?: 'sm' | 'md' | 'lg'
}

// 0–10 thresholds map 1:1 to 0–100 spec tiers (95/85/70/55/40).
export function getExcitementTier(score: number): ExcitementTier {
  if (score >= 9.5) return 'must-watch'
  if (score >= 8.5) return 'banger'
  if (score >= 7.0) return 'great'
  if (score >= 5.5) return 'solid'
  if (score >= 4.0) return 'decent'
  return 'skip'
}

const TIER_CONFIG = {
  'must-watch': {
    label: '🔥 Must-Watch',
    gradient: 'from-orange-500 via-red-500 to-orange-400',
    textColor: 'text-white',
    ringColor: 'ring-orange-400/60',
    bg: 'bg-gradient-to-br from-orange-500/30 to-red-500/30',
  },
  'banger': {
    label: '🏆 Banger',
    gradient: 'from-amber-400 via-yellow-500 to-amber-300',
    textColor: 'text-slate-900',
    ringColor: 'ring-amber-300/60',
    bg: 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20',
  },
  'great': {
    label: '⭐ Great Game',
    gradient: 'from-emerald-500 to-green-400',
    textColor: 'text-white',
    ringColor: 'ring-emerald-400/50',
    bg: 'bg-gradient-to-br from-emerald-500/20 to-green-500/20',
  },
  'solid': {
    label: '💪 Solid',
    gradient: 'from-teal-500 to-cyan-400',
    textColor: 'text-white',
    ringColor: 'ring-teal-400/50',
    bg: 'bg-gradient-to-br from-teal-500/20 to-cyan-500/20',
  },
  'decent': {
    label: '👍 Decent',
    gradient: 'from-sky-500 to-blue-400',
    textColor: 'text-white',
    ringColor: 'ring-sky-400/50',
    bg: 'bg-gradient-to-br from-sky-500/20 to-blue-500/20',
  },
  'skip': {
    label: '💤 Skip',
    gradient: 'from-slate-600 to-slate-500',
    textColor: 'text-slate-300',
    ringColor: 'ring-slate-500/30',
    bg: 'bg-gradient-to-br from-slate-700/50 to-slate-600/50',
  },
}

const SIZE_CONFIG = {
  sm: { ring: 'w-10 h-10', score: 'text-sm', label: 'text-[10px]' },
  md: { ring: 'w-14 h-14', score: 'text-lg', label: 'text-[10px]' },
  lg: { ring: 'w-20 h-20', score: 'text-2xl', label: 'text-xs' },
}

export default function ExcitementBadge({ score, size = 'lg' }: ExcitementBadgeProps) {
  const tier = getExcitementTier(score)
  const config = TIER_CONFIG[tier]
  const sizes = SIZE_CONFIG[size]
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const display = Math.round(score * 10)

  // Click-outside closes the tooltip on mobile / after tap.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const interactive = size !== 'sm'

  return (
    <div
      ref={wrapRef}
      className="relative flex flex-col items-center gap-1.5"
      onMouseEnter={interactive ? () => setOpen(true) : undefined}
      onMouseLeave={interactive ? () => setOpen(false) : undefined}
    >
      <button
        type="button"
        disabled={!interactive}
        onClick={interactive ? (e) => { e.stopPropagation(); setOpen(v => !v) } : undefined}
        className={`
          relative flex items-center justify-center rounded-full
          ${sizes.ring} ring-2 ${config.ringColor}
          bg-gradient-to-br ${config.gradient}
          ${tier === 'must-watch' ? 'animate-pulse' : ''}
          shadow-lg
          ${interactive ? 'cursor-help' : 'cursor-default'}
        `}
        aria-label={interactive ? 'About the Nitz Watchability Index' : undefined}
      >
        <span className={`font-black ${sizes.score} ${config.textColor} tracking-tight tabular-nums`}>
          {display}
        </span>
      </button>
      {size !== 'sm' && (
        <span
          className={`
            px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
            ${config.bg} ${config.textColor} ring-1 ${config.ringColor}
          `}
        >
          {config.label}
        </span>
      )}

      {interactive && open && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 w-60 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-md shadow-2xl px-3 py-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">
            🏀 Nitz Watchability Index
          </p>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            A 0–100 score for how watchable this game is — kept spoiler-free.
          </p>
          <p className="text-[10px] text-slate-500 leading-relaxed mt-2">
            See <span className="text-slate-300 font-semibold">Settings → About</span> for the full formula.
          </p>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900/95 border-l border-t border-white/10" />
        </div>
      )}
    </div>
  )
}

export { TIER_CONFIG }
