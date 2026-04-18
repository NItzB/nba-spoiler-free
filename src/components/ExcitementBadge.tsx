import React from 'react'
import { ExcitementTier } from '../types/game'

interface ExcitementBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export function getExcitementTier(score: number): ExcitementTier {
  if (score >= 9.0) return 'must-watch'
  if (score >= 7.0) return 'great'
  if (score >= 5.0) return 'decent'
  return 'skip'
}

const TIER_CONFIG = {
  'must-watch': {
    label: '🔥 Must Watch',
    gradient: 'from-orange-500 via-red-500 to-orange-400',
    textColor: 'text-white',
    ringColor: 'ring-orange-400/50',
    bg: 'bg-gradient-to-br from-orange-500/20 to-red-600/20',
  },
  'great': {
    label: '⭐ Great Game',
    gradient: 'from-blue-500 to-cyan-400',
    textColor: 'text-white',
    ringColor: 'ring-blue-400/50',
    bg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
  },
  'decent': {
    label: '👍 Decent',
    gradient: 'from-violet-500 to-purple-400',
    textColor: 'text-white',
    ringColor: 'ring-violet-400/50',
    bg: 'bg-gradient-to-br from-violet-500/20 to-purple-600/20',
  },
  'skip': {
    label: '💤 Skip it',
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

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`
          relative flex items-center justify-center rounded-full
          ${sizes.ring} ring-2 ${config.ringColor}
          bg-gradient-to-br ${config.gradient}
          ${tier === 'must-watch' ? 'animate-pulse' : ''}
          shadow-lg
        `}
      >
        <span className={`font-black ${sizes.score} ${config.textColor} tracking-tight`}>
          {score.toFixed(1)}
        </span>
      </div>
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
    </div>
  )
}

export { TIER_CONFIG }
