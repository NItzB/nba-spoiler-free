import { formatDistanceToNow } from 'date-fns'
import { usePlayoffBracket } from '../hooks/usePlayoffBracket'
import { BracketRound } from '../types/bracket'
import SeriesCard from './SeriesCard'

interface BracketPageProps {
  spoilersVisible: boolean
}

function RoundColumn({ round, spoilersVisible }: { round: BracketRound; spoilersVisible: boolean }) {
  return (
    <div className="flex flex-col gap-3 min-w-[180px]">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 text-center pb-1 border-b border-white/5">
        {round.label}
      </h3>
      <div className="flex flex-col gap-3">
        {round.series.map(s => (
          <SeriesCard key={s.id} series={s} spoilersVisible={spoilersVisible} />
        ))}
      </div>
    </div>
  )
}

function ConferenceSection({
  title,
  rounds,
  spoilersVisible,
  reverseRounds,
}: {
  title: string
  rounds: BracketRound[]
  spoilersVisible: boolean
  reverseRounds?: boolean
}) {
  const displayRounds = reverseRounds ? [...rounds].reverse() : rounds

  return (
    <div className="flex-1 min-w-0">
      <h2 className="text-base font-black uppercase tracking-wider text-slate-300 text-center mb-4">
        {title}
      </h2>
      {rounds.length === 0 ? (
        <p className="text-slate-600 text-sm text-center py-8">No bracket data yet</p>
      ) : (
        <div className="flex gap-3 justify-center overflow-x-auto pb-2">
          {displayRounds.map(round => (
            <RoundColumn key={round.round} round={round} spoilersVisible={spoilersVisible} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function BracketPage({ spoilersVisible }: BracketPageProps) {
  const { eastRounds, westRounds, finals, loading, error, season, lastUpdated } = usePlayoffBracket()

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-black text-white">
              {season} NBA Playoffs
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Previous rounds always visible · Last night's results hidden until revealed
            </p>
          </div>
          {lastUpdated && (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>🔄</span>
              {formatDistanceToNow(new Date(lastUpdated))} ago
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-300 text-sm">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <BracketSkeleton />
      ) : (eastRounds.length === 0 && westRounds.length === 0 && !finals) ? (
        <div className="text-center py-20 text-slate-500">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-lg font-bold text-slate-400 mb-1">Playoffs not started yet</p>
          <p className="text-sm">The bracket will appear once playoffs begin.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main bracket — desktop: side by side, mobile: stacked */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-4">
            {/* East: rounds go left→right (R1, Semis, CF) */}
            <ConferenceSection
              title="Eastern Conference"
              rounds={eastRounds}
              spoilersVisible={spoilersVisible}
            />

            {/* West: rounds go right→left (CF, Semis, R1) so CF is closest to center */}
            <ConferenceSection
              title="Western Conference"
              rounds={westRounds}
              spoilersVisible={spoilersVisible}
              reverseRounds={true}
            />
          </div>

          {/* NBA Finals — always at the bottom, centered */}
          {finals && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-yellow-500/40" />
                <h2 className="text-base font-black uppercase tracking-widest text-yellow-400">
                  🏆 NBA Finals
                </h2>
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-yellow-500/40" />
              </div>
              <div className="w-full max-w-xs">
                <SeriesCard series={finals} spoilersVisible={spoilersVisible} />
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}

function BracketSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-pulse">
      {[0, 1].map(i => (
        <div key={i} className="flex-1 space-y-4">
          <div className="h-4 bg-white/5 rounded w-40 mx-auto" />
          <div className="flex gap-3 justify-center">
            {[4, 2, 1].map(count => (
              <div key={count} className="flex flex-col gap-3 min-w-[180px]">
                <div className="h-3 bg-white/5 rounded w-24 mx-auto" />
                {Array.from({ length: count }).map((_, j) => (
                  <div key={j} className="h-24 bg-white/5 rounded-xl" />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
