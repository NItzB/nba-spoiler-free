import React, { useState, useEffect } from 'react'
import * as NBAIcons from 'react-nba-logos'
import { parseISO } from 'date-fns'
import { Game } from '../types/game'
import { getTeam, getTagInfo } from '../lib/teams'
import ExcitementBadge, { getExcitementTier, TIER_CONFIG } from './ExcitementBadge'
import BoxScoreModal from './BoxScoreModal'

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
    return date.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }) + ' IL'
  } catch {
    return 'TBD'
  }
}

function TeamDisplay({ abbr, side, record }: { abbr: string; side: 'home' | 'away'; record?: string }) {
  const team = getTeam(abbr)
  const normalizedAbbr = team.abbreviation;
  // Dynamically get the logo component
  const LogoComponent = (NBAIcons as Record<string, React.ComponentType<{ size?: number }>>)[normalizedAbbr]

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
        {record && (
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">{record}</p>
        )}
      </div>
    </div>
  )
}

export default function GameCard({ game, globalSpoilerVisible, rank }: GameCardProps) {
  const [localSpoilerVisible, setLocalSpoilerVisible] = useState(false)
  const [isBoxScoreOpen, setIsBoxScoreOpen] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const tier = getExcitementTier(game.excitement_score)
  const tierConfig = TIER_CONFIG[tier]
  const showScore = globalSpoilerVisible || localSpoilerVisible
  const isLive = game.status === 'in_progress'
  const isScheduled = game.status === 'scheduled'

  // Defensive tag parsing
  let processedTags: string[] = []
  try {
    processedTags = Array.isArray(game.tags) ? game.tags : JSON.parse(game.tags || '[]')
  } catch {
    processedTags = []
  }

  useEffect(() => {
    if (game.home_team === 'NY' || game.home_team === 'SA') {
      console.log(`[DEBUG] Game ${game.id} tags:`, game.tags);
    }
  }, [game]);
  const isSkip = tier === 'skip' && !isLive && !isScheduled
  const isMustWatch = tier === 'must-watch'
  const isCompleted = game.status === 'completed'
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
      {!isLive && !isScheduled && (
        <div className="absolute top-3 left-3 flex items-center justify-center w-6 h-6 rounded-full bg-white/8 border border-white/10 text-[11px] font-bold text-slate-400">
          #{rank}
        </div>
      )}

      {/* Live Badge Component */}
      {isLive && (
        <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase tracking-widest animate-pulse flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-fire" />
          {game.live_period && game.live_clock ? `Q${game.live_period} ${game.live_clock}` : 'LIVE'}
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
          <TeamDisplay abbr={game.away_team} side="away" record={game.away_record} />

          {/* Center: score/time + excitement */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            {isLive ? (
              <div className="text-sm font-black text-white px-3 py-1 bg-red-500/20 rounded-xl border border-red-500/30 whitespace-nowrap">
                {game.live_period && game.live_clock ? `Q${game.live_period} ${game.live_clock}` : 'IN PROGRESS'}
              </div>
            ) : isScheduled ? (
              <div className="text-sm font-black text-amber-200 px-3 py-1 bg-amber-500/20 rounded-xl border border-amber-500/30 whitespace-nowrap">
                UPCOMING
              </div>
            ) : (
              <ExcitementBadge score={game.excitement_score} size="lg" />
            )}

            {/* Game time */}
            <div className="text-center">
              <p className="text-[11px] text-slate-500 font-medium">🕐 {israelTime}</p>
            </div>
          </div>

          <TeamDisplay abbr={game.home_team} side="home" record={game.home_record} />
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 mb-3" />

        {/* Tags */}
        {processedTags && processedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {processedTags.map(tag => {
              const tagInfo = getTagInfo(tag)
              return (
                <span
                  key={tag}
                  className={`tag-pill font-medium relative cursor-pointer transition-all ${
                    activeTooltip === tag ? 'ring-2 ring-white/20 scale-105' : 'hover:scale-105'
                  }`}
                  style={{
                    color: tagInfo.color,
                    backgroundColor: tagInfo.bgColor,
                    border: `1px solid ${tagInfo.color}30`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(activeTooltip === tag ? null : tag);
                  }}
                >
                  <span>{tagInfo.icon}</span>
                  {tagInfo.label}

                  {/* Premium Tag Tooltip (Click to Toggle) */}
                  {activeTooltip === tag && (
                    <div 
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl text-[10px] leading-relaxed text-slate-200 w-48 z-50 transform origin-bottom animate-in fade-in zoom-in-95 duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="font-semibold mb-0.5" style={{ color: tagInfo.color }}>
                        {tagInfo.label}
                      </p>
                      {tagInfo.explanation}
                      {/* Tooltip arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900/95" />
                    </div>
                  )}
                </span>
              )
            })}
          </div>
        )}

        {/* Score row — centered with hide button on left */}
        <div className="flex items-center justify-center gap-2 mt-2 relative">
          {game.final_score && !globalSpoilerVisible ? (
            <button
              id={`reveal-score-${game.id}`}
              onClick={() => setLocalSpoilerVisible(v => !v)}
              className="btn-reveal bg-white/5 hover:bg-white/10 absolute left-0"
            >
              {localSpoilerVisible ? '🙈 Hide' : '👁️ Score'}
            </button>
          ) : null}

          {game.final_score && (
            <div
              className={`
                flex flex-col items-center justify-center
                ${showScore ? 'spoiler-reveal' : 'spoiler-blur pointer-events-none select-none text-transparent'}
              `}
            >
              <div className="text-lg font-black tracking-wide text-white leading-none">
                {game.final_score}
              </div>
              {game.series_summary && (
                <div className="text-[10px] font-bold text-slate-300 mt-1 uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded">
                  {game.series_summary}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons row */}
        {isCompleted && showScore && (
          <div className="flex items-center gap-1.5 mt-2">
            <a
              id={`highlights-${game.id}`}
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(game.away_team + ' ' + game.home_team + ' NBA highlights')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-slate-200 hover:text-white bg-red-500/10 hover:bg-red-500/20 border-red-400/20 text-xs px-2 py-1 h-8"
            >
              <span className="text-sm">▶</span>
              <span>Watch Highlights</span>
            </a>
            {game.full_game_url && (
              <a
                id={`stats-${game.id}`}
                href={game.full_game_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-slate-200 hover:text-white bg-slate-500/10 hover:bg-slate-500/20 border-slate-400/20 text-xs px-2 py-1 h-8"
              >
                <span className="text-sm">📈</span>
                <span>Stats</span>
              </a>
            )}
            {game.boxscore_data && (
              <button
                onClick={() => setIsBoxScoreOpen(true)}
                className="btn-primary text-slate-200 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border-blue-400/20 text-xs px-2 py-1 h-8"
              >
                <span className="text-sm">📊</span>
                <span>Box Score</span>
              </button>
            )}
          </div>
        )}

        {/* Modal */}
        <BoxScoreModal
          isOpen={isBoxScoreOpen}
          onClose={() => setIsBoxScoreOpen(false)}
          data={game.boxscore_data}
        />

        {/* Detailed Stats (Revealed) */}
        {showScore && (
          <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Linescore mini-table */}
            {(game.home_line || game.away_line) && (
              <div className="mb-4 bg-white/5 rounded-lg overflow-hidden border border-white/5">
                <div className="grid grid-cols-6 text-[10px] uppercase font-bold text-slate-500 py-1.5 px-3 bg-white/5">
                  <div className="col-span-2">Quarter</div>
                  <div>1</div>
                  <div>2</div>
                  <div>3</div>
                  <div>4</div>
                </div>
                <div className="grid grid-cols-6 text-[11px] font-black text-slate-300 py-1.5 px-3 border-t border-white/5">
                  <div className="col-span-2">{game.away_team}</div>
                  {game.away_line?.map((s, i) => <div key={i}>{s}</div>)}
                </div>
                <div className="grid grid-cols-6 text-[11px] font-black text-slate-300 py-1.5 px-3 border-t border-white/5">
                  <div className="col-span-2">{game.home_team}</div>
                  {game.home_line?.map((s, i) => <div key={i}>{s}</div>)}
                </div>
              </div>
            )}

            {/* Recap */}
            {game.game_recap && (
              <p className="text-[11px] text-slate-400 italic mb-4 leading-relaxed px-1">
                "{game.game_recap}"
              </p>
            )}

            {/* Top Leaders */}
            <div className="grid grid-cols-2 gap-3">
              {game.away_leaders && (
                <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                  <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">{game.away_team} Star</p>
                  <p className="text-xs font-black text-white truncate">{game.away_leaders.name}</p>
                  <p className="text-[10px] font-bold text-orange-400">{game.away_leaders.stat} PTS</p>
                </div>
              )}
              {game.home_leaders && (
                <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                  <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">{game.home_team} Star</p>
                  <p className="text-xs font-black text-white truncate">{game.home_leaders.name}</p>
                  <p className="text-[10px] font-bold text-orange-400">{game.home_leaders.stat} PTS</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Venue Info */}
        {game.venue_name && (
          <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-slate-600 flex items-center justify-center gap-1.5">
            <span>📍</span>
            <span className="uppercase tracking-widest font-bold">{game.venue_name}</span>
          </div>
        )}
      </div>
    </div>
  )
}
