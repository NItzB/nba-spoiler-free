import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import * as NBAIcons from 'react-nba-logos'
import { usePlayoffBracket, isSeriesSpoiler } from '../hooks/usePlayoffBracket'
import { PlayoffSeries } from '../types/bracket'
import { getTeam } from '../lib/teams'

interface BracketPageProps {
  spoilersVisible: boolean
}

// ─── Mini series card for bracket display ─────────────────────────────────────

function MiniTeamRow({ abbr, wins, isWinner, isElim }: {
  abbr: string | null
  wins: number
  isWinner: boolean
  isElim: boolean
}) {
  const team = abbr ? getTeam(abbr) : null
  const Logo = abbr
    ? (NBAIcons as Record<string, React.ComponentType<{ size?: number }>>)[abbr]
    : null

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 ${isElim ? 'opacity-35' : ''} ${isWinner ? 'bg-white/6 rounded' : ''}`}>
      <div className="w-5 h-5 shrink-0 flex items-center justify-center">
        {Logo
          ? <Logo size={18} />
          : <div className="w-4 h-4 rounded-full bg-white/10 text-[7px] flex items-center justify-center font-bold">{abbr ?? '?'}</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-bold leading-tight truncate ${isWinner ? 'text-white' : 'text-slate-300'}`}>
          {team ? team.name : (abbr ?? 'TBD')}
        </p>
      </div>
      <div className={`text-sm font-black tabular-nums w-4 text-right ${isWinner ? 'text-white' : 'text-slate-500'}`}>
        {wins}
      </div>
      {isWinner && <span className="text-green-400 text-[9px] font-bold">✓</span>}
    </div>
  )
}

function BracketSeriesCard({ series, spoilersVisible }: { series: PlayoffSeries; spoilersVisible: boolean }) {
  const [localReveal, setLocalReveal] = React.useState(false)
  const isSpoiler = isSeriesSpoiler(series)
  const showResult = spoilersVisible || localReveal || !isSpoiler

  const done = series.status === 'post'
  const t1Won = done && series.winner === series.team1
  const t2Won = done && series.winner === series.team2

  const statusLine = () => {
    if (series.status === 'pre') return null
    if (!showResult) return (
      <button onClick={() => setLocalReveal(true)} className="text-[9px] text-slate-500 hover:text-slate-300 underline underline-offset-1">
        Reveal
      </button>
    )
    if (series.wins1 === series.wins2) return <span className="text-[9px] text-slate-400">Tied {series.wins1}–{series.wins2}</span>
    const leadWins = Math.max(series.wins1, series.wins2)
    const trailWins = Math.min(series.wins1, series.wins2)
    const leader = series.wins1 > series.wins2 ? series.team1 : series.team2
    const leaderTeam = leader ? getTeam(leader) : null
    const verb = done ? 'wins' : 'lead'
    return <span className="text-[9px] text-slate-400">{leaderTeam?.name ?? leader} {verb} {leadWins}–{trailWins}</span>
  }

  return (
    <div className={`rounded-lg border overflow-hidden ${
      series.status === 'in'
        ? 'border-green-500/20 bg-bg-card'
        : done
        ? 'border-white/10 bg-bg-card'
        : 'border-white/5 bg-white/3'
    }`}>
      <MiniTeamRow abbr={series.team1} wins={series.wins1} isWinner={t1Won} isElim={done && !t1Won} />
      <div className="border-t border-white/5" />
      <MiniTeamRow abbr={series.team2} wins={series.wins2} isWinner={t2Won} isElim={done && !t2Won} />
      {series.status !== 'pre' && (
        <div className="px-2 py-1 border-t border-white/5 flex items-center gap-1.5">
          {series.status === 'in' && <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse shrink-0" />}
          {statusLine()}
        </div>
      )}
    </div>
  )
}

// How many series slots each round should show when TBD
const ROUND_SLOT_COUNT: Record<number, number> = { 1: 4, 2: 2, 3: 1, 4: 1 }

function TbdCard() {
  return (
    <div className="rounded-lg border border-white/5 bg-white/2 p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 opacity-30">
        <div className="w-5 h-5 rounded-full bg-white/10" />
        <div className="h-3 bg-white/10 rounded flex-1" />
        <div className="w-4 h-3 bg-white/10 rounded" />
      </div>
      <div className="border-t border-white/5" />
      <div className="flex items-center gap-2 opacity-30">
        <div className="w-5 h-5 rounded-full bg-white/10" />
        <div className="h-3 bg-white/10 rounded flex-1" />
        <div className="w-4 h-3 bg-white/10 rounded" />
      </div>
      <div className="border-t border-white/5 pt-1">
        <div className="h-2 bg-white/5 rounded w-16 mx-auto" />
      </div>
    </div>
  )
}

// ─── Round column with bracket connector lines ─────────────────────────────────

function RoundColumn({
  round,
  label,
  series,
  spoilersVisible,
  connectorSide = 'none',
}: {
  round: number
  label: string
  series: PlayoffSeries[]
  spoilersVisible: boolean
  connectorSide?: 'right' | 'left' | 'none'
}) {
  const slotCount = series.length > 0 ? series.length : (ROUND_SLOT_COUNT[round] ?? 1)
  const count = slotCount
  const showConnector = connectorSide !== 'none' && count > 1
  const connRight = connectorSide === 'right'
  const edgeOffset = connRight ? { right: -12 } : { left: -12 }

  return (
    <div className="flex flex-col" style={{ minWidth: 170, flex: 1 }}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center mb-2 shrink-0">
        {label}
      </p>
      {/* justify-around: ensures Semis/CF align perfectly with their R1 pairs */}
      <div className="flex-1 flex flex-col justify-around gap-2 relative">
        {series.length > 0
          ? series.map((s) => (
              <div key={s.id} className="relative">
                <BracketSeriesCard series={s} spoilersVisible={spoilersVisible} />
                {showConnector && (
                  <div
                    className="absolute top-1/2 w-3 border-t border-white/15 -translate-y-px pointer-events-none"
                    style={connRight ? { right: -12 } : { left: -12 }}
                  />
                )}
              </div>
            ))
          : Array.from({ length: count }).map((_, i) => (
              <div key={i} className="relative">
                <TbdCard />
                {showConnector && (
                  <div
                    className="absolute top-1/2 w-3 border-t border-white/15 -translate-y-px pointer-events-none"
                    style={connRight ? { right: -12 } : { left: -12 }}
                  />
                )}
              </div>
            ))
        }

        {/* Vertical connector lines between paired series */}
        {showConnector && count === 4 && (
          <>
            <div className="absolute pointer-events-none" style={{ ...edgeOffset, top: '12.5%', height: '25%', width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <div className="absolute pointer-events-none" style={{ ...edgeOffset, top: '62.5%', height: '25%', width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          </>
        )}
        {showConnector && count === 2 && (
          <div className="absolute pointer-events-none" style={{ ...edgeOffset, top: '25%', height: '50%', width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        )}
      </div>
    </div>
  )
}

// ─── Conference half of the bracket ────────────────────────────────────────────

function ConferenceBracket({
  title,
  rounds,
  spoilersVisible,
  direction,
}: {
  title: string
  rounds: { round: number; label: string; series: PlayoffSeries[] }[]
  spoilersVisible: boolean
  direction: 'ltr' | 'rtl' // ltr = West (R1→CF), rtl = East (CF→R1)
}) {
  const ordered = direction === 'ltr' ? rounds : [...rounds].reverse()

  const connSide = direction === 'ltr' ? 'right' : 'left'

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-center mb-3">
        {title}
      </h2>
      {ordered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">No data</div>
      ) : (
        <div className="flex-1 flex gap-6">
          {ordered.map((r, idx) => (
            <RoundColumn
              key={r.round}
              round={r.round}
              label={r.label}
              series={r.series}
              spoilersVisible={spoilersVisible}
              connectorSide={idx < ordered.length - 1 ? connSide : 'none'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function BracketPage({ spoilersVisible }: BracketPageProps) {
  const { eastRounds, westRounds, finals, loading, error, season, lastUpdated } = usePlayoffBracket()

  return (
    <main className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <div>
          <h2 className="text-xl font-black text-white">{season} NBA Playoffs</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Previous rounds always visible · Last night's results hidden until revealed
          </p>
        </div>
        {lastUpdated && (
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>🔄</span>{formatDistanceToNow(new Date(lastUpdated))} ago
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <BracketSkeleton />
      ) : (eastRounds.every(r => r.series.length === 0) && westRounds.every(r => r.series.length === 0) && !finals) ? (
        <div className="text-center py-20 text-slate-500">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-lg font-bold text-slate-400 mb-1">Playoffs not started yet</p>
          <p className="text-sm">The bracket will appear once playoffs begin.</p>
        </div>
      ) : (
        <>
          {/* ── Desktop: 7-column side-by-side bracket ── */}
          <div className="hidden lg:flex items-stretch gap-6" style={{ minHeight: 520 }}>
            {/* West: R1 → Semis → CF */}
            <ConferenceBracket
              title="Western Conference"
              rounds={westRounds}
              spoilersVisible={spoilersVisible}
              direction="ltr"
            />

            {/* Finals — center column */}
            <div className="flex flex-col items-center justify-center shrink-0 w-44">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px w-6 bg-yellow-500/30" />
                <h2 className="text-[11px] font-black uppercase tracking-widest text-yellow-400">NBA Finals</h2>
                <div className="h-px w-6 bg-yellow-500/30" />
              </div>
              {finals
                ? <BracketSeriesCard series={finals} spoilersVisible={spoilersVisible} />
                : <div className="w-full rounded-lg border border-white/8 bg-white/3 p-4 text-center text-slate-600 text-xs">TBD</div>
              }
            </div>

            {/* East: CF → Semis → R1 */}
            <ConferenceBracket
              title="Eastern Conference"
              rounds={eastRounds}
              spoilersVisible={spoilersVisible}
              direction="rtl"
            />
          </div>

          {/* ── Mobile: stacked sections ── */}
          <div className="lg:hidden space-y-8">
            <MobileConference title="Western Conference" rounds={westRounds} spoilersVisible={spoilersVisible} />
            {finals && (
              <div>
                <h2 className="text-[11px] font-black uppercase tracking-widest text-yellow-400 text-center mb-3">
                  🏆 NBA Finals
                </h2>
                <div className="max-w-xs mx-auto">
                  <BracketSeriesCard series={finals} spoilersVisible={spoilersVisible} />
                </div>
              </div>
            )}
            <MobileConference title="Eastern Conference" rounds={eastRounds} spoilersVisible={spoilersVisible} />
          </div>
        </>
      )}
    </main>
  )
}

// ─── Mobile: vertical conference sections ─────────────────────────────────────

function MobileConference({ title, rounds, spoilersVisible }: {
  title: string
  rounds: { round: number; label: string; series: PlayoffSeries[] }[]
  spoilersVisible: boolean
}) {
  return (
    <div>
      <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-center mb-3">{title}</h2>
      <div className="space-y-4">
        {rounds.map(r => (
          <div key={r.round}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 text-center mb-2">{r.label}</p>
            <div className="grid grid-cols-2 gap-2">
              {r.series.map(s => (
                <BracketSeriesCard key={s.id} series={s} spoilersVisible={spoilersVisible} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BracketSkeleton() {
  return (
    <div className="animate-pulse flex gap-6 items-stretch" style={{ minHeight: 520 }}>
      {[4, 2, 1].map(n => (
        <div key={n} className="flex-1 flex flex-col gap-4 justify-around">
          <div className="h-3 bg-white/5 rounded w-20 mx-auto mb-2" />
          {Array.from({ length: n }).map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-lg" />
          ))}
        </div>
      ))}
      <div className="w-44 flex flex-col items-center justify-center gap-2">
        <div className="h-3 bg-white/5 rounded w-20" />
        <div className="h-20 bg-white/5 rounded-lg w-full" />
      </div>
      {[1, 2, 4].map(n => (
        <div key={n} className="flex-1 flex flex-col gap-4 justify-around">
          <div className="h-3 bg-white/5 rounded w-20 mx-auto mb-2" />
          {Array.from({ length: n }).map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  )
}
