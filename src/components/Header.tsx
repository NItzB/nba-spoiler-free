import { format } from 'date-fns'
import SpoilerToggle from './SpoilerToggle'

interface HeaderProps {
  selectedDate: string
  onDateChange: (date: string) => void
  spoilersVisible: boolean
  onSpoilerToggle: () => void
  isUsingMockData: boolean
}

export default function Header({
  selectedDate,
  onDateChange,
  spoilersVisible,
  onSpoilerToggle,
  isUsingMockData,
}: HeaderProps) {
  const today = format(new Date(), 'yyyy-MM-dd')

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
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-fire text-xl">
              🏀
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight">
                NBA Spoiler-Free
              </h1>
              <p className="text-[11px] text-slate-400 leading-none font-medium">
                Watchability Index • 🇮🇱 Israel Time
              </p>
            </div>
          </div>

          {/* Spoiler Toggle */}
          <SpoilerToggle
            spoilersVisible={spoilersVisible}
            onToggle={onSpoilerToggle}
          />
        </div>

        {/* Date Navigation */}
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

        {/* Mock data banner */}
        {isUsingMockData && (
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-amber-400/80 font-medium">
            <span>⚡</span>
            <span>Demo mode — add your Supabase credentials to load real data</span>
          </div>
        )}
      </div>
    </header>
  )
}
