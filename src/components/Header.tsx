import { format, formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
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
    <header className="sticky top-0 z-50 glass border-b border-white/5 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3">
        {/* Top row */}
        <div className="flex items-center justify-between gap-4">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <button 
              onClick={handleForceSync}
              disabled={isSyncing}
              title="Force Sync"
              className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-fire text-xl transition-all ${isSyncing ? 'animate-pulse opacity-50' : 'hover:scale-105 active:scale-95 cursor-crosshair'}`}
            >
              🏀
            </button>
            <div className="flex flex-col justify-center">
              <h1 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight">
                NBA Spoiler-Free
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 font-medium">
                <span>Watchability Index</span>
                {lastSyncTime && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1" title={new Date(lastSyncTime).toLocaleString()}>
                      <span>🔄</span>
                      {formatDistanceToNow(new Date(lastSyncTime))} ago
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Spoiler toggle + Settings */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all text-slate-300 hover:text-white"
              title="Settings"
            >
              ⚙️
            </button>
            <SpoilerToggle spoilersVisible={spoilersVisible} onToggle={onSpoilerToggle} />
          </div>
        </div>

        {/* Second row: page tabs — centered, full width */}
        <div className="flex items-center justify-center gap-1 mt-2 bg-white/5 rounded-lg p-1 border border-white/8 w-fit mx-auto">
          <button
            onClick={() => onPageChange('games')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activePage === 'games'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏀 Games
          </button>
          <button
            onClick={() => onPageChange('bracket')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activePage === 'bracket'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏆 Bracket
          </button>
        </div>

        {/* Date Navigation — only shown on games page */}
        {activePage === 'games' && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            id="prev-day-btn"
            onClick={handlePrevDay}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all duration-200 text-slate-300 hover:text-white active:scale-95"
            title="Previous day"
          >
            ‹
          </button>

          <div className="flex items-center gap-2">
            <input
              id="date-picker"
              type="date"
              value={selectedDate}
              onChange={e => onDateChange(e.target.value)}
              className="
                bg-white/8 border border-white/15 text-slate-200 text-sm font-medium
                rounded-lg px-3 py-1.5 cursor-pointer
                hover:bg-white/12 hover:border-white/25 transition-all duration-200
                [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-orange-500/50
              "
            />
            {isToday ? (
              <span className="px-2 py-1 rounded-md bg-orange-500/20 border border-orange-400/30 text-orange-300 text-[11px] font-bold uppercase tracking-wider">
                Today
              </span>
            ) : (
              <button
                onClick={() => onDateChange(today)}
                className="px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-all"
              >
                Today
              </button>
            )}
          </div>

          <button
            id="next-day-btn"
            onClick={handleNextDay}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all duration-200 text-slate-300 hover:text-white active:scale-95"
            title="Next day"
          >
            ›
          </button>
        </div>
        )}

        {/* Mock data banner — only relevant on games page */}
        {activePage === 'games' && isUsingMockData && (
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-amber-400/80 font-medium">
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
