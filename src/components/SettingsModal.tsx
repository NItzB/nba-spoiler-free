import { useState } from 'react'
import { createPortal } from 'react-dom'
import { TIMEZONES } from '../lib/timezones'

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

  if (!isOpen) return null

  const filteredTimezones = TIMEZONES.filter(tz =>
    tz.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tz.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const currentTz = TIMEZONES.find(t => t.name === timezone)

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto overscroll-contain" onClick={onClose}>
      <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
        <div
          className="bg-bg-card border border-white/10 rounded-2xl w-full max-w-2xl my-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — sticky so ✕ is always reachable */}
          <div className="sticky top-0 z-10 bg-bg-card border-b border-white/10 px-5 py-4 flex items-center justify-between shrink-0 rounded-t-2xl">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-white truncate">Settings</h2>
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

          {/* Content */}
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

          {/* Divider for future sections */}
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

          {/* Footer */}
          <div className="border-t border-white/10 p-4 text-center text-xs text-slate-500 rounded-b-2xl">
            Settings are saved automatically to your device
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
