import { format, formatDistanceToNow } from 'date-fns'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SpoilerToggle from './SpoilerToggle'
import SettingsModal from './SettingsModal'

export type ActivePage = 'games' | 'bracket'

interface HeaderProps {
  selectedDate: string
  onDateChange: (date: string) => void
  spoilersVisible: boolean
  onSpoilerToggle: () => void
  isUsingMockData: boolean
  lastSyncTime?: string | null
  activePage: ActivePage
  onPageChange: (page: ActivePage) => void
  timezone: string
  onTimezoneChange: (timezone: string) => void
}

const TABS: { id: ActivePage; label: string; icon: string }[] = [
  { id: 'games',   label: 'Games',   icon: '🏀' },
  { id: 'bracket', label: 'Bracket', icon: '🏆' },
]

export default function Header({
  selectedDate,
  onDateChange,
  spoilersVisible,
  onSpoilerToggle,
  isUsingMockData,
  lastSyncTime,
  activePage,
  onPageChange,
  timezone,
  onTimezoneChange,
}: HeaderProps) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Boost the bottom border + shadow when the page has been scrolled — a tiny
  // signal that the header is now "elevated" above content.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleForceSync = async () => {
    let token = localStorage.getItem('gh_pat')
    if (!token) {
      token = window.prompt("Enter your GitHub Personal Access Token to force a sync:")
      if (!token) return
      localStorage.setItem('gh_pat', token)
    }

    setIsSyncing(true)
    try {
      const res = await fetch("https://api.github.com/repos/NItzB/nba-spoiler-free/actions/workflows/nba_cron.yml/dispatches", {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ref: "main" })
      })

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('gh_pat')
          alert("Invalid token. Please try again.")
          return
        }
        throw new Error(`Status ${res.status}`)
      }

      alert("Sync triggered successfully! Refresh in 15 seconds.")
    } catch (e: any) {
      console.error(e)
      alert("Failed to trigger sync: " + e.message)
    } finally {
      setIsSyncing(false)
    }
  }

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    onDateChange(format(d, 'yyyy-MM-dd'))
  }

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    onDateChange(format(d, 'yyyy-MM-dd'))
  }

  const isToday = selectedDate === today

  return (
    <header
      className={`sticky top-0 z-50 glass transition-shadow duration-300 ${
        scrolled
          ? 'border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.45)]'
          : 'border-b border-white/5 shadow-lg'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 py-3">
        {/* Top row */}
        <div className="flex items-center justify-between gap-4">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleForceSync}
              disabled={isSyncing}
              title="Force sync — re-run the score agent"
              whileHover={{ scale: 1.06, rotate: -8 }}
              whileTap={{ scale: 0.92, rotate: 8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-fire text-xl ${
                isSyncing ? 'animate-pulse opacity-50' : 'cursor-pointer'
              }`}
            >
              🏀
            </motion.button>
            <div className="flex flex-col justify-center">
              <h1 className="font-display text-lg sm:text-xl font-extrabold text-white leading-tight tracking-tight">
                NBA Spoiler-Free
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 font-medium">
                <span className="uppercase tracking-wider">Watchability Index</span>
                {lastSyncTime && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span
                      className="flex items-center gap-1 tabular-nums"
                      title={new Date(lastSyncTime).toLocaleString()}
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                      {formatDistanceToNow(new Date(lastSyncTime))} ago
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Settings + Spoiler toggle */}
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setIsSettingsOpen(true)}
              whileHover={{ scale: 1.06, rotate: 12 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white"
              title="Settings"
              aria-label="Open settings"
            >
              ⚙️
            </motion.button>
            <SpoilerToggle spoilersVisible={spoilersVisible} onToggle={onSpoilerToggle} />
          </div>
        </div>

        {/* Tab pill — animated indicator slides via shared layoutId */}
        <div className="mt-2 flex justify-center">
          <div
            role="tablist"
            aria-label="Page sections"
            className="relative inline-flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10 backdrop-blur-sm"
          >
            {TABS.map(tab => {
              const active = activePage === tab.id
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => onPageChange(tab.id)}
                  className="relative px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider z-10 transition-colors"
                  style={{
                    color: active ? '#fff' : 'rgba(203,213,225,0.7)',
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="header-tab-indicator"
                      className="absolute inset-0 rounded-lg bg-gradient-to-br from-orange-500/30 to-red-500/30 ring-1 ring-orange-400/40"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <span aria-hidden>{tab.icon}</span>
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Date Navigation — only on games page */}
        {activePage === 'games' && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <motion.button
              id="prev-day-btn"
              onClick={handlePrevDay}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white"
              aria-label="Previous day"
              title="Previous day"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </motion.button>

            <div className="flex items-center gap-2">
              <input
                id="date-picker"
                type="date"
                value={selectedDate}
                onChange={e => onDateChange(e.target.value)}
                className="
                  bg-white/8 border border-white/15 text-slate-100 text-sm font-semibold
                  rounded-xl px-3 py-1.5 cursor-pointer tabular-nums
                  hover:bg-white/12 hover:border-white/25 transition
                  [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-orange-500/50
                "
              />
              {isToday ? (
                <motion.span
                  key="today-pill"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="px-2.5 py-1 rounded-lg bg-orange-500/20 border border-orange-400/40 text-orange-200 text-[11px] font-bold uppercase tracking-widest shadow-[0_0_12px_rgba(249,115,22,0.25)]"
                >
                  Today
                </motion.span>
              ) : (
                <motion.button
                  onClick={() => onDateChange(today)}
                  whileTap={{ scale: 0.92 }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300 hover:text-white text-[11px] font-bold uppercase tracking-widest transition"
                >
                  Today
                </motion.button>
              )}
            </div>

            <motion.button
              id="next-day-btn"
              onClick={handleNextDay}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white"
              aria-label="Next day"
              title="Next day"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </motion.button>
          </div>
        )}

        {/* Mock data banner — only on games page */}
        {activePage === 'games' && isUsingMockData && (
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-amber-300/80 font-medium">
            <span>⚡</span>
            <span>Demo mode — add your Supabase credentials to load real data</span>
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        timezone={timezone}
        onTimezoneChange={onTimezoneChange}
      />
    </header>
  )
}
