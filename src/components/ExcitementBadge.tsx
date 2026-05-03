import { useState, useRef, useEffect } from 'react'
import { ExcitementTier, NwiBreakdown } from '../types/game'

interface ExcitementBadgeProps {
  score: number                  // 0–10 (legacy column) — display is score * 10
  size?: 'sm' | 'md' | 'lg'
  breakdown?: NwiBreakdown | null
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

// 0–100 → 1–5 stars, with no row dropped to zero stars (anything is at least ★).
function starsFor(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value / 20)))
}

function StarRow({ label, value }: { label: string; value: number }) {
  const filled = starsFor(value)
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-slate-400 w-14 shrink-0">{label}</span>
      <span className="text-amber-300 tracking-tighter">
        {'★'.repeat(filled)}
        <span className="text-slate-600">{'★'.repeat(5 - filled)}</span>
      </span>
      <span className="ml-auto text-slate-500 tabular-nums">{Math.round(value)}</span>
    </div>
  )
}

export default function ExcitementBadge({ score, size = 'lg', breakdown }: ExcitementBadgeProps) {
  const tier = getExcitementTier(score)
  const config = TIER_CONFIG[tier]
  const sizes = SIZE_CONFIG[size]
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const display = Math.round(score * 10)
  const hasBreakdown = !!breakdown && (
    breakdown.gei != null || breakdown.hsp != null ||
    breakdown.cm != null || breakdown.ofi != null
  )
  const bonusChips: { label: string; value: number }[] = []
  if (breakdown?.bonuses) {
    const b = breakdown.bonuses
    if (b.ot > 0)     bonusChips.push({ label: 'OT',     value: b.ot })
    if (b.stakes > 0) bonusChips.push({ label: b.stakes >= 7 ? 'Stakes' : 'Playoff', value: b.stakes })
    if (b.clutch > 0) bonusChips.push({ label: 'Clutch', value: b.clutch })
    if (b.upset > 0)  bonusChips.push({ label: 'Upset',  value: b.upset })
    if (b.star > 0)   bonusChips.push({ label: 'Star',   value: b.star })
  }

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

  const interactive = hasBreakdown && size !== 'sm'

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
        aria-label={interactive ? 'Show Game DNA breakdown' : undefined}
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

      {interactive && open && breakdown && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 w-56 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-md shadow-2xl px-3 py-2.5 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500 mb-2">Game DNA</p>
          <div className="space-y-1.5">
            {breakdown.hsp != null && <StarRow label="Clutch"  value={breakdown.hsp} />}
            {breakdown.gei != null && <StarRow label="Swing"   value={breakdown.gei} />}
            {breakdown.cm  != null && <StarRow label="Drama"   value={breakdown.cm}  />}
            {breakdown.ofi != null && <StarRow label="Pace"    value={breakdown.ofi} />}
          </div>
          {bonusChips.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/5">
              <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500 mb-1.5">Bonuses</p>
              <div className="flex flex-wrap gap-1">
                {bonusChips.map(chip => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 ring-1 ring-amber-300/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-200 tabular-nums"
                  >
                    {chip.label}
                    <span className="text-amber-300">+{chip.value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Nitz Index</span>
            <span className="text-[11px] font-black text-white tabular-nums">{Math.round(breakdown.nwi)}/100</span>
          </div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900/95 border-l border-t border-white/10" />
        </div>
      )}
    </div>
  )
}

export { TIER_CONFIG }
