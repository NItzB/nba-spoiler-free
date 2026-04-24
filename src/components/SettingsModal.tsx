import { useState } from 'react'
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-bg-card border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-white/10 p-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-black text-white">Settings</h2>
            <p className="text-sm text-slate-400 mt-1">Customize your viewing experience</p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {/* Timezone Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-widest">⏰ Timezone</h3>
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
                type="text"
                placeholder="Type city name or timezone... (e.g., 'New York', 'Tokyo')"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/8 border border-white/15 text-slate-200 text-sm font-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent"
                autoFocus
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
        <div className="border-t border-white/10 p-4 text-center text-xs text-slate-500">
          Settings are saved automatically to your device
        </div>
      </div>
    </div>
  )
}
