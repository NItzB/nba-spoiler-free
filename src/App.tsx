import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
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

// Tab order — used to derive slide direction for the page transition.
const PAGE_ORDER: ActivePage[] = ['games', 'bracket']

const pageVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 40 : -40,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -40 : 40,
    transition: { duration: 0.22, ease: [0.64, 0, 0.78, 0] },
  }),
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
  // Reveal-event one-shot key — bumped only when going OFF→ON so the
  // page-level flash and card reverb fire on actual reveals (not on hides).
  const [revealKey, setRevealKey] = useState(0)

  const handleSpoilerToggle = () => {
    setSpoilersVisible(prev => {
      if (!prev) {
        // OFF → ON: fire reveal event + page flash
        setRevealKey(Date.now())
        // Cards listen for this and pulse a golden ring in unison.
        window.dispatchEvent(new CustomEvent('spoilers-revealed'))
      }
      return !prev
    })
  }

  const { games, loading, error, isUsingMockData, lastSyncTime } = useGames(selectedDate)

  // Track the previous page so the new page knows which direction to slide
  // in from (forward = right→left, back = left→right).
  const prevPageRef = useRef<ActivePage>(activePage)
  const direction =
    PAGE_ORDER.indexOf(activePage) - PAGE_ORDER.indexOf(prevPageRef.current)
  useEffect(() => {
    prevPageRef.current = activePage
  }, [activePage])

  useEffect(() => {
    try {
      localStorage.setItem('selectedTimezone', timezone)
    } catch {
      // localStorage unavailable, silently fail
    }
  }, [timezone])

  return (
    <div className="min-h-screen">
      {/* Page-level reveal flash — radial bloom from where the toggle sits
          (top-right of header). Only fires on OFF→ON; respects reduced motion
          since the body-level CSS rule clamps the duration to ~0. */}
      <AnimatePresence>
        {revealKey > 0 && (
          <motion.div
            key={revealKey}
            className="fixed inset-0 z-[60] pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at calc(100% - 80px) 32px, rgba(249,115,22,0.55) 0%, rgba(239,68,68,0.25) 25%, transparent 55%)',
              mixBlendMode: 'screen',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, times: [0, 0.22, 1], ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => setRevealKey(0)}
          />
        )}
      </AnimatePresence>

      <Header
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        spoilersVisible={spoilersVisible}
        onSpoilerToggle={handleSpoilerToggle}
        isUsingMockData={isUsingMockData}
        lastSyncTime={lastSyncTime}
        activePage={activePage}
        onPageChange={setActivePage}
        timezone={timezone}
        onTimezoneChange={setTimezone}
      />

      <div className="relative overflow-x-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          {activePage === 'bracket' && (
            <motion.div
              key="bracket"
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <BracketPage spoilersVisible={spoilersVisible} />
            </motion.div>
          )}

          {activePage === 'games' && (
            <motion.main
              key="games"
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="max-w-6xl mx-auto px-4 py-6"
            >
              {/* Page title row */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {loading ? 'Loading games…' : games.length > 0
                      ? `${games.length} Game${games.length !== 1 ? 's' : ''} Rated`
                      : 'No Games'
                    }
                  </h2>
                  <p className="text-slate-500 text-sm mt-0.5">
                    Sorted by Watchability Index · Scores hidden by default
                  </p>
                </div>

                {/* Score legend — colors match the new tier palette */}
                {!loading && games.length > 0 && (
                  <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      Must-Watch
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Banger
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Great
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
            </motion.main>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16 py-5 px-4 text-center text-[11px] text-slate-600 max-w-3xl mx-auto leading-snug">
        <p>
          <span className="font-semibold text-slate-500">NBA Spoiler-Free Dashboard 🏀</span>
          {' · '}
          Unofficial fan project, not affiliated with the NBA, ESPN, YouTube, or any team. NBA team names and logos are trademarks of NBA Properties, Inc. Game data from public APIs; recap videos embedded from YouTube (no video content hosted here). No personal data collected; anonymous pageview stats via Cloudflare.
          {' · '}
          Contact:{' '}
          <a
            href="mailto:nitz76@gmail.com"
            className="text-slate-500 hover:text-slate-300 underline underline-offset-2"
          >
            nitz76@gmail.com
          </a>
        </p>
      </footer>
    </div>
  )
}
