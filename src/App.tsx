import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Header, { ActivePage } from './components/Header'
import GameGrid from './components/GameGrid'
import BracketPage from './components/BracketPage'
import SkeletonLoader from './components/SkeletonLoader'
import EmptyState from './components/EmptyState'
import { useGames } from './hooks/useGames'
import { getSystemTimezone } from './lib/timezones'

// Default to today in Israel — we just use local format and let the hook deal with it
function getTodayIsrael(): string {
  const now = new Date();
  const currentHour = now.getHours(); // 0-23 in local (Israel) time
  
  // If it's early morning (before 12 PM), the "Live" games or games
  // that just finished belong to the PREVIOUS US day. 
  // We shift the default view to "Yesterday" for a better morning experience.
  if (currentHour < 12) {
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    return format(yesterday, 'yyyy-MM-dd');
  }
  
  return format(now, 'yyyy-MM-dd');
}

export default function App() {
  const [selectedDate, setSelectedDate] = useState(getTodayIsrael)
  const [spoilersVisible, setSpoilersVisible] = useState(false)
  const [activePage, setActivePage] = useState<ActivePage>('games')
  const [timezone, setTimezone] = useState(() => {
    try {
      return localStorage.getItem('selectedTimezone') || getSystemTimezone()
    } catch {
      return getSystemTimezone()
    }
  })
  const { games, loading, error, isUsingMockData, lastSyncTime } = useGames(selectedDate)

  // Save timezone to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('selectedTimezone', timezone)
    } catch {
      // localStorage unavailable, silently fail
    }
  }, [timezone])

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        spoilersVisible={spoilersVisible}
        onSpoilerToggle={() => setSpoilersVisible(v => !v)}
        isUsingMockData={isUsingMockData}
        lastSyncTime={lastSyncTime}
        activePage={activePage}
        onPageChange={setActivePage}
        timezone={timezone}
        onTimezoneChange={setTimezone}
      />

      {activePage === 'bracket' && (
        <BracketPage spoilersVisible={spoilersVisible} />
      )}

      {activePage === 'games' && (
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
          <GameGrid games={games} spoilersVisible={spoilersVisible} timezone={timezone} />
        )}
      </main>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16 py-8 text-center text-xs text-slate-600">
        <p className="mb-1">
          NBA Spoiler-Free Dashboard 🏀
        </p>
        <p>
          NBA names and logos are property of NBA Properties, Inc. Not affiliated with or endorsed by the NBA.
        </p>
      </footer>
    </div>
  )
}
