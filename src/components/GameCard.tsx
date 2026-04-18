import React, { useState } from 'react'
import * as NBAIcons from 'react-nba-logos'
import { format, parseISO } from 'date-fns'
import { Game } from '../types/game'
import { getTeam, getTagInfo } from '../lib/teams'
import ExcitementBadge, { getExcitementTier, TIER_CONFIG } from './ExcitementBadge'

// Israel Standard Time / Daylight Time is UTC+2 / UTC+3
// We'll dynamically compute it, but use a fixed offset for simplicity

interface GameCardProps {
  game: Game
  globalSpoilerVisible: boolean
  rank: number
}

function getIsraelTime(utcString: string | null): string {
  if (!utcString) return 'TBD'
  try {
    const date = parseISO(utcString)
    // Convert to Israel time (+3 during DST, +2 standard)
    const offset = 3 // IDT (Israel Daylight Time — April in Israel)
    const israelDate = new Date(date.getTime() + offset * 60 * 60 * 1000)
    return format(israelDate, 'HH:mm') + ' IL'
  } catch {
    return 'TBD'
  }
}

function TeamDisplay({ abbr, side }: { abbr: string; side: 'home' | 'away' }) {
  const team = getTeam(abbr)
  // Dynamically get the logo component
  const LogoComponent = (NBAIcons as Record<string, React.ComponentType<{ size?: number }>>)[abbr]

  return (
    <div className={`flex flex-col items-center gap-2 ${side === 'home' ? 'text-right' : 'text-left'}`}>
      <div className="relative">
        {LogoComponent ? (
          <LogoComponent size={52} />
        ) : (
          <div
            className="w-13 h-13 rounded-full flex items-center justify-center text-xs font-black border-2 border-white/20"
            style={{ backgroundColor: team.primaryColor + '40', borderColor: team.primaryColor + '80', width: 52, height: 52 }}
          >
            {abbr}
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-[11px] text-slate-400 font-medium leading-tight">{team.city}</p>
        <p className="text-sm font-bold text-white leading-tight">{team.name}</p>
      </div>
    </div>
  )
}

export default function GameCard({ game, globalSpoilerVisible, rank }: GameCardProps) {
  const [localSpoilerVisible, setLocalSpoilerVisible] = useState(false)
  const tier = getExcitementTier(game.excitement_score)
  const tierConfig = TIER_CONFIG[tier]
  const showScore = globalSpoilerVisible || localSpoilerVisible
  const isSkip = tier === 'skip'
  const isMustWatch = tier === 'must-watch'
  const isLive = game.status === 'in_progress'
  const israelTime = getIsraelTime(game.game_time_utc)

  return (
    <div
      className={`
        relative rounded-2xl overflow-hidden transition-all duration-300
        animate-fade-in
        ${isSkip ? 'opacity-60 grayscale hover:opacity-80 hover:grayscale-0' : ''}
        ${isMustWatch ? 'glow-fire' : ''}
        group hover:scale-[1.01] hover:shadow-card-hover
      `}
      style={{
        boxShadow: isLive 
          ? '0 0 0 1px rgba(239,68,68,0.4), 0 4px 24px rgba(0,0,0,0.4)'
          : isMustWatch
          ? '0 0 0 1px rgba(255,107,53,0.4), 0 4px 24px rgba(0,0,0,0.4)'
          : tier === 'great'
          ? '0 0 0 1px rgba(74,158,255,0.3), 0 4px 24px rgba(0,0,0,0.4)'
          : '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-bg-card" />
      <div className="absolute inset-0 shadow-inner-glow" />

      {/* Top accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${tierConfig.gradient}`}
      />

      {/* Rank badge */}
      {!isLive && (
        <div className="absolute top-3 left-3 flex items-center justify-center w-6 h-6 rounded-full bg-white/8 border border-white/10 text-[11px] font-bold text-slate-400">
          #{rank}
        </div>
      )}

      {/* Live Badge Component */}
      {isLive && (
        <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase tracking-widest animate-pulse flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-fire" />
          LIVE
        </div>
      )}

      {/* OT badge */}
      {game.is_overtime && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-300 text-[10px] font-bold uppercase tracking-widest">
          OT
        </div>
      )}

      {/* Main content */}
      <div className="relative p-5 pt-8">
        {/* Teams row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <TeamDisplay abbr={game.away_team} side="away" />

          {/* Center: score/time + excitement */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            {isLive ? (
              <div className="text-sm font-black text-white px-3 py-1 bg-red-500/20 rounded-xl border border-red-500/30 whitespace-nowrap">
                IN PROGRESS
              </div>
            ) : (
              <ExcitementBadge score={game.excitement_score} size="lg" />
            )}

            {/* Game time */}
            <div className="text-center">
              <p className="text-[11px] text-slate-500 font-medium">🕐 {israelTime}</p>
            </div>
          </div>

          <TeamDisplay abbr={game.home_team} side="home" />
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 mb-3" />

        {/* Tags */}
        {game.tags && game.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {game.tags.map(tag => {
              const tagInfo = getTagInfo(tag)
              return (
                <span
                  key={tag}
                  className="tag-pill font-medium"
                  style={{
                    color: tagInfo.color,
                    backgroundColor: tagInfo.bgColor,
                    border: `1px solid ${tagInfo.color}30`,
                  }}
                >
                  <span>{tagInfo.icon}</span>
                  {tagInfo.label}
                </span>
              )
            })}
          </div>
        )}

        {/* Score + Actions row */}
        <div className="flex items-center justify-between gap-2 mt-2">
          {/* Score reveal */}
          <div className="flex items-center gap-2">
            {isLive ? (
              <button
                id={`score-hidden-${game.id}`}
                disabled
                className="btn-reveal bg-red-500/10 text-red-300 border border-red-500/20 opacity-80 cursor-not-allowed"
              >
                🔒 In Progress
              </button>
            ) : game.final_score && !globalSpoilerVisible ? (
              <button
                id={`reveal-score-${game.id}`}
                onClick={() => setLocalSpoilerVisible(v => !v)}
                className="btn-reveal bg-white/5 hover:bg-white/10"
              >
                {localSpoilerVisible ? '🙈 Hide' : '👁️ Score'}
              </button>
            ) : null}

            {game.final_score && (
              <div
                className={`
                  text-lg font-black tracking-wide text-white
                  ${showScore ? 'spoiler-reveal' : 'spoiler-blur pointer-events-none select-none'}
                `}
              >
                {game.final_score}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 ml-auto">
            {game.full_game_url && (
              <a
                id={`watch-game-${game.id}`}
                href={game.full_game_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-slate-200 hover:text-white"
              >
                <span>▶</span>
                <span className="hidden sm:inline">Full Game</span>
              </a>
            )}
            {game.highlights_url && (
              <a
                id={`highlights-${game.id}`}
                href={game.highlights_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-slate-200 hover:text-white bg-orange-500/10 hover:bg-orange-500/20 border-orange-400/20"
              >
                <span>⚡</span>
                <span className="hidden sm:inline">Highlights</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
