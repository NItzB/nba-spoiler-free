import React, { useState } from 'react'
import { TIMEZONES, formatTimezoneLabel } from '../lib/timezones'

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-bg-card border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-white/10 p-5 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-black text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Timezone Section */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-3">Timezone</h3>

            {/* Search */}
            <input
              type="text"
              placeholder="Search city or timezone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/8 border border-white/15 text-slate-200 text-sm font-medium rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />

            {/* Timezone Grid */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTimezones.map((tz) => (
                <button
                  key={tz.name}
                  onClick={() => {
                    onTimezoneChange(tz.name)
                    onClose()
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    timezone === tz.name
                      ? 'bg-orange-500/20 border-orange-400/50 text-white'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {tz.flag} {tz.city}
                    </span>
                    <span className="text-xs text-slate-500">{tz.name}</span>
                  </div>
                </button>
              ))}
            </div>

            {filteredTimezones.length === 0 && (
              <p className="text-center text-slate-500 py-4">No timezones found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
