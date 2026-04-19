import { useState } from 'react'
import { format } from 'date-fns'
import Header from './components/Header'
import GameGrid from './components/GameGrid'
import SkeletonLoader from './components/SkeletonLoader'
import EmptyState from './components/EmptyState'
import { useGames } from './hooks/useGames'

// Default to today in Israel — we just use local format and let the hook deal with it
function getTodayIsrael(): string {
  // The user is in Israel (UTC+3), so new Date() in their browser already reflects this correctly
  return format(new Date(), 'yyyy-MM-dd')
}

export default function App() {
  const [selectedDate, setSelectedDate] = useState(getTodayIsrael)
  const [spoilersVisible, setSpoilersVisible] = useState(false)
  const { games, loading, error, isUsingMockData, lastSyncTime } = useGames(selectedDate)

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        spoilersVisible={spoilersVisible}
        onSpoilerToggle={() => setSpoilersVisible(v => !v)}
        isUsingMockData={isUsingMockData}
        lastSyncTime={lastSyncTime}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Page title row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              {loading ? 'Loading games…' : games.length > 0
                ? `${games.length} Game${games.length !== 1 ? 's' : ''} Rated`
                : 'No Games'
              }
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Sorted by Watchability Index · Scores hidden by default
            </p>
          </div>

          {/* Score legend */}
          {!loading && games.length > 0 && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                Must Watch
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Great
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-400" />
                Decent
              </span>
              <span className="flex items-center gap-1.5 opacity-50">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                Skip
              </span>
            </div>
          )}
        </div>

        {/* Error notice */}
        {error && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-300 text-sm">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <SkeletonLoader />
        ) : games.length === 0 ? (
          <EmptyState date={selectedDate} />
        ) : (
          <GameGrid games={games} spoilersVisible={spoilersVisible} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16 py-8 text-center text-xs text-slate-600">
        <p className="mb-1">
          NBA Spoiler-Free Dashboard · Built for Israeli NBA fans 🇮🇱
        </p>
        <p>
          NBA names and logos are property of NBA Properties, Inc. Not affiliated with or endorsed by the NBA.
        </p>
      </footer>
    </div>
  )
}
