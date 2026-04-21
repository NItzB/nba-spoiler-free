import React, { useState } from 'react'
import * as NBAIcons from 'react-nba-logos'
import { PlayoffSeries } from '../types/bracket'
import { getTeam } from '../lib/teams'
import { isSeriesSpoiler } from '../hooks/usePlayoffBracket'

interface SeriesCardProps {
  series: PlayoffSeries
  spoilersVisible: boolean
}

function TeamRow({
  abbr,
  seed,
  wins,
  isWinner,
  isEliminated,
}: {
  abbr: string | null
  seed: number | null
  wins: number
  isWinner: boolean
  isEliminated: boolean
}) {
  if (!abbr) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 opacity-30">
        <div className="w-6 text-center text-[10px] text-slate-500 font-bold">
          {seed ? `#${seed}` : '?'}
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10" />
        <div className="flex-1 text-slate-500 text-sm italic">TBD</div>
        <div className="text-slate-600 text-lg font-black w-5 text-center">{wins}</div>
      </div>
    )
  }

  const team = getTeam(abbr)
  const LogoComponent = (NBAIcons as Record<string, React.ComponentType<{ size?: number }>>)[team.abbreviation]

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
        isWinner
          ? 'bg-white/8'
          : isEliminated
          ? 'opacity-35'
          : ''
      }`}
    >
      <div className="w-6 text-center text-[10px] font-bold text-slate-500">
        {seed ? `#${seed}` : ''}
      </div>

      <div className="w-8 h-8 flex items-center justify-center shrink-0">
        {LogoComponent ? (
          <LogoComponent size={30} />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-black border border-white/20"
            style={{ backgroundColor: team.primaryColor + '40' }}
          >
            {abbr}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 leading-none truncate">{team.city}</p>
        <p className={`text-sm font-bold leading-tight truncate ${isWinner ? 'text-white' : 'text-slate-300'}`}>
          {team.name}
        </p>
      </div>

      <div
        className={`text-lg font-black w-5 text-center tabular-nums ${
          isWinner ? 'text-white' : 'text-slate-500'
        }`}
      >
        {wins}
      </div>

      {isWinner && (
        <div className="text-green-400 text-xs font-bold ml-0.5">✓</div>
      )}
    </div>
  )
}

function SeriesStatusBadge({ series }: { series: PlayoffSeries }) {
  if (series.status === 'pre') {
    return <span className="text-[10px] text-slate-500 font-medium">Series not started</span>
  }
  if (series.status === 'post') {
    const winnerTeam = series.winner ? getTeam(series.winner) : null
    return (
      <span className="text-[10px] text-slate-400 font-medium">
        {winnerTeam ? `${winnerTeam.city} ${winnerTeam.name} advance` : 'Series complete'}
      </span>
    )
  }
  const totalGames = (series.wins1 ?? 0) + (series.wins2 ?? 0)
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      <span className="text-green-300">Game {totalGames + 1} upcoming</span>
    </span>
  )
}

export default function SeriesCard({ series, spoilersVisible }: SeriesCardProps) {
  const [localReveal, setLocalReveal] = useState(false)

  const isSpoiler = isSeriesSpoiler(series)
  const showResult = spoilersVisible || localReveal || !isSpoiler

  const isFinished = series.status === 'post'
  const team1Won = isFinished && series.winner === series.team1
  const team2Won = isFinished && series.winner === series.team2
  const team1Elim = isFinished && !team1Won
  const team2Elim = isFinished && !team2Won

  const seriesLabel = () => {
    if (series.wins1 === series.wins2) return `Tied ${series.wins1}–${series.wins2}`
    const leading = series.wins1 > series.wins2 ? series.team1 : series.team2
    const leadWins = Math.max(series.wins1, series.wins2)
    const trailWins = Math.min(series.wins1, series.wins2)
    const verb = isFinished ? 'won' : 'lead'
    const team = leading ? getTeam(leading) : null
    return `${team?.name ?? leading} ${verb} ${leadWins}–${trailWins}`
  }

  return (
    <div className={`
      rounded-xl border transition-all duration-200
      ${isFinished
        ? 'bg-bg-card border-white/8'
        : series.status === 'in'
        ? 'bg-bg-card border-green-500/20 shadow-[0_0_12px_rgba(74,222,128,0.08)]'
        : 'bg-white/3 border-white/5'
      }
    `}>
      <div className="p-1 pt-2">
        <TeamRow
          abbr={series.team1}
          seed={series.seed1}
          wins={series.wins1}
          isWinner={team1Won}
          isEliminated={team1Elim}
        />
        <div className="mx-3 border-t border-white/5 my-0.5" />
        <TeamRow
          abbr={series.team2}
          seed={series.seed2}
          wins={series.wins2}
          isWinner={team2Won}
          isEliminated={team2Elim}
        />
      </div>

      {/* Series status footer */}
      <div className="px-3 pb-2 pt-1 border-t border-white/5 flex items-center justify-between gap-2">
        {series.status === 'pre' ? (
          <SeriesStatusBadge series={series} />
        ) : (
          <>
            {showResult ? (
              <span className="text-[10px] text-slate-400 font-medium">{seriesLabel()}</span>
            ) : (
              <button
                onClick={() => setLocalReveal(true)}
                className="text-[10px] text-slate-500 hover:text-slate-300 font-medium underline underline-offset-2 transition-colors"
              >
                Tap to reveal result
              </button>
            )}
            <SeriesStatusBadge series={series} />
          </>
        )}
      </div>
    </div>
  )
}
