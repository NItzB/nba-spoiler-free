import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getTeam } from '../lib/teams'

interface GameProbabilitiesModalProps {
  isOpen: boolean
  onClose: () => void
  winprobability_data: any[]
  home_team: string
  away_team: string
}

export default function GameProbabilitiesModal({
  isOpen,
  onClose,
  winprobability_data,
  home_team,
  away_team,
}: GameProbabilitiesModalProps) {
  const [activeTab, setActiveTab] = useState<'win' | 'flow' | 'cover'>('win')

  if (!isOpen) return null

  const homeTeamInfo = getTeam(home_team)
  const awayTeamInfo = getTeam(away_team)

  // Prepare data for chart: convert to percentage and add play number
  const chartData = (winprobability_data || []).map((item: any, idx: number) => ({
    playNumber: idx + 1,
    homeWinPct: (item.homeWinPercentage * 100).toFixed(1),
    awayWinPct: (100 - item.homeWinPercentage * 100).toFixed(1),
  }))

  // Get final probabilities
  const finalData = chartData.length > 0 ? chartData[chartData.length - 1] : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-bg-card border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-bg-card border-b border-white/10 p-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Probabilities & Game Flow</h2>
          <button
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-4 border-b border-white/10 bg-white/5">
          <button
            onClick={() => setActiveTab('win')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'win'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Win Probability
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'flow'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Game Flow
          </button>
          <button
            onClick={() => setActiveTab('cover')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'cover'
                ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cover Probability
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'win' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Win probability as game progressed</p>

              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="playNumber"
                      stroke="rgba(148,163,184,0.5)"
                      tick={{ fontSize: 12 }}
                      interval={Math.floor(chartData.length / 10) || 0}
                    />
                    <YAxis
                      stroke="rgba(148,163,184,0.5)"
                      tick={{ fontSize: 12 }}
                      domain={[0, 100]}
                      label={{ value: 'Win %', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => `${value}%`}
                    />
                    <Line
                      type="monotone"
                      dataKey="homeWinPct"
                      stroke={homeTeamInfo.primaryColor}
                      name={homeTeamInfo.name}
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="awayWinPct"
                      stroke={awayTeamInfo.primaryColor}
                      name={awayTeamInfo.name}
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-500 text-center py-8">No win probability data available</p>
              )}

              {finalData && (
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-[11px] text-slate-500 uppercase font-bold mb-2">{homeTeamInfo.name}</p>
                    <p className="text-2xl font-black" style={{ color: homeTeamInfo.primaryColor }}>
                      {finalData.homeWinPct}%
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-[11px] text-slate-500 uppercase font-bold mb-2">{awayTeamInfo.name}</p>
                    <p className="text-2xl font-black" style={{ color: awayTeamInfo.primaryColor }}>
                      {finalData.awayWinPct}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'flow' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Game flow and scoring progression</p>
              <p className="text-slate-500 py-8 text-center">Game flow visualization coming soon</p>
            </div>
          )}

          {activeTab === 'cover' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Probability to cover the spread</p>
              <p className="text-slate-500 py-8 text-center">Cover probability visualization coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
