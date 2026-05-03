import { useState } from 'react'
import { TIMEZONES } from '../lib/timezones'
import ModalShell from './ModalShell'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  timezone: string
  onTimezoneChange: (timezone: string) => void
}

export default function SettingsModal({
  isOpen,
  onClose,
  timezone,
  onTimezoneChange,
}: SettingsModalProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTimezones = TIMEZONES.filter(tz =>
    tz.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tz.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const currentTz = TIMEZONES.find(t => t.name === timezone)

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} panelClassName="max-w-2xl max-h-[90vh] flex flex-col">
      {/* Header — sticky inside the scrollable area below */}
      <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between shrink-0 bg-gradient-to-b from-white/5 to-transparent">
        <div className="min-w-0">
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white truncate">Settings</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 truncate">Customize your viewing experience</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="shrink-0 ml-3 w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-lg font-bold transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-5 py-5 sm:px-6 sm:py-6">
            {/* Timezone Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-widest">⏰ Timezone</h3>
                <p className="text-sm text-slate-400 mt-2 mb-4">
                  Select your timezone to see all game times in your local time. This helps you plan which games to watch!
                </p>
              </div>

            {/* Current Selection Display */}
            {currentTz && (
              <div className="bg-white/5 border border-orange-400/30 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Currently Selected</p>
                <p className="text-lg font-black text-white">
                  {currentTz.flag} {currentTz.city}
                </p>
                <p className="text-xs text-slate-400 mt-1">{currentTz.name}</p>
              </div>
            )}

            {/* Search Input */}
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Search Timezone</label>
              <input
                type="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Type city name or timezone... (e.g., 'New York', 'Tokyo')"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-white/15 text-white text-sm font-medium rounded-lg px-4 py-3 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent [&::-webkit-search-cancel-button]:hidden"
                style={{
                  WebkitTextFillColor: '#ffffff',
                  WebkitBoxShadow: '0 0 0 1000px rgb(30 41 59) inset',
                }}
              />
            </div>

            {/* Timezone List */}
            <div className="space-y-2">
              {filteredTimezones.length > 0 ? (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                  {filteredTimezones.map((tz) => (
                    <button
                      key={tz.name}
                      onClick={() => {
                        onTimezoneChange(tz.name)
                        setSearchTerm('')
                        onClose()
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                        timezone === tz.name
                          ? 'bg-orange-500/20 border-orange-400/50 text-white shadow-lg'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-base">{tz.flag} {tz.city}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{tz.name}</p>
                        </div>
                        {timezone === tz.name && (
                          <span className="text-lg">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">No timezones found</p>
                  <p className="text-slate-600 text-xs mt-1">Try searching for a city name like "New York" or "London"</p>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-8"></div>

          {/* About Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-widest">ℹ️ About</h3>
              <p className="text-sm text-slate-400 mt-2">How this site works</p>
            </div>

            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                <span className="text-white font-bold">NBA Spoiler-Free</span> shows you which of last
                night's games are worth watching — without revealing the score.
              </p>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">🏀 Nitz Watchability Index</p>
                <p className="text-slate-300">
                  Every completed game gets a <span className="text-white font-bold">0–100 score</span> blended
                  from four play-by-play signals — plus narrative bonuses for the moments that make a game memorable.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Game DNA</p>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li><span className="text-white font-bold">Swing</span> <span className="text-slate-500">· 40%</span> — how much the win probability bounced around.</li>
                  <li><span className="text-white font-bold">Clutch</span> <span className="text-slate-500">· 30%</span> — share of Q4 spent within 5 points.</li>
                  <li><span className="text-white font-bold">Drama</span> <span className="text-slate-500">· 25%</span> — biggest comeback or lead that disappeared.</li>
                  <li><span className="text-white font-bold">Pace</span> <span className="text-slate-500">· 5%</span> — combined scoring vs. a typical NBA game.</li>
                </ul>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider pt-1">Bonuses</p>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li><span className="text-white font-bold">Stakes</span> — playoff games, with G7 / clinchers / forced-G7 worth more.</li>
                  <li><span className="text-white font-bold">Clutch finish</span> — a final margin of 5 points or fewer.</li>
                  <li><span className="text-white font-bold">OT</span> — overtime gets a small bump.</li>
                  <li><span className="text-white font-bold">Upset</span> — when the underdog wins (extra credit for road upsets).</li>
                  <li><span className="text-white font-bold">Star</span> — a 30+ point individual performance.</li>
                </ul>
                <p className="text-[11px] text-slate-500 italic">Hover or tap a score ring to see the full breakdown for that game.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 border border-orange-400/30 rounded-lg p-3">
                  <p className="flex items-center gap-1.5 font-bold text-white">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> 🔥 Must-Watch
                  </p>
                  <p className="text-slate-400 mt-1">95+ — drop everything.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="flex items-center gap-1.5 font-bold text-white">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span> 🏆 Banger
                  </p>
                  <p className="text-slate-400 mt-1">85–94 — don't miss this one.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="flex items-center gap-1.5 font-bold text-white">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ⭐ Great Game
                  </p>
                  <p className="text-slate-400 mt-1">70–84 — worth your evening.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="flex items-center gap-1.5 font-bold text-white">
                    <span className="w-2 h-2 rounded-full bg-teal-400"></span> 💪 Solid
                  </p>
                  <p className="text-slate-400 mt-1">55–69 — a good watch.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="flex items-center gap-1.5 font-bold text-white">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span> 👍 Decent
                  </p>
                  <p className="text-slate-400 mt-1">40–54 — fine if you have time.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 opacity-70">
                  <p className="flex items-center gap-1.5 font-bold text-white">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span> 💤 Skip
                  </p>
                  <p className="text-slate-400 mt-1">Below 40 — save the time.</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">How to use it</p>
                <ul className="space-y-1.5 text-slate-300">
                  <li>• Scores stay hidden until you toggle <span className="text-white font-bold">Spoilers ON</span>.</li>
                  <li>• Tap a game for the box score, highlights link, and stats.</li>
                  <li>• Use the date picker to browse past game days.</li>
                  <li>• Ratings refresh automatically throughout the day.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-8"></div>

          {/* Future Settings Placeholder */}
          <div className="space-y-4">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Coming Soon</p>
            <div className="space-y-2">
              <div className="bg-white/3 border border-white/5 rounded-lg p-4 opacity-50">
                <p className="text-sm font-bold text-slate-300">🎨 Theme</p>
                <p className="text-xs text-slate-500 mt-1">Light, Dark, and Auto options</p>
              </div>
              <div className="bg-white/3 border border-white/5 rounded-lg p-4 opacity-50">
                <p className="text-sm font-bold text-slate-300">🔔 Notifications</p>
                <p className="text-xs text-slate-500 mt-1">Game alerts and reminders</p>
              </div>
            </div>
          </div>
        </div>

      </div>{/* /flex-1 overflow-y-auto */}

      {/* Footer */}
      <div className="border-t border-white/10 p-4 text-center text-xs text-slate-500 shrink-0">
        Settings are saved automatically to your device
      </div>
    </ModalShell>
  )
}
