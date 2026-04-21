import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { getTeam } from '../lib/teams'

interface GameProbabilitiesModalProps {
  isOpen: boolean
  onClose: () => void
  winprobability_data: any[]
  home_team: string
  away_team: string
  home_line?: any[]
  away_line?: any[]
}

export default function GameProbabilitiesModal({
  isOpen,
  onClose,
  winprobability_data,
  home_team,
  away_team,
  home_line,
  away_line,
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

  // Prepare game flow data (quarter by quarter)
  const gameFlowData = []
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
  if (home_line && away_line) {
    for (let i = 0; i < Math.min(home_line.length, away_line.length, 4); i++) {
      gameFlowData.push({
        quarter: quarters[i],
        [homeTeamInfo.abbreviation]: parseInt(home_line[i]),
        [awayTeamInfo.abbreviation]: parseInt(away_line[i]),
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-bg-card border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-white/10 p-5 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-black text-white">Probabilities & Game Flow</h2>
          <button
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4 border-b border-white/10 bg-white/3 shrink-0">
          <button
            onClick={() => setActiveTab('win')}
            className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'win'
                ? 'bg-orange-500/20 text-orange-300 border-b-2 border-orange-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Win Probability
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'flow'
                ? 'bg-blue-500/20 text-blue-300 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Game Flow
          </button>
          <button
            onClick={() => setActiveTab('cover')}
            className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'cover'
                ? 'bg-green-500/20 text-green-300 border-b-2 border-green-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cover Probability
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {activeTab === 'win' && (
            <div className="space-y-6">
              <p className="text-sm text-slate-400">Win probability as game progressed</p>

              {chartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
                        strokeWidth={3}
                      />
                      <Line
                        type="monotone"
                        dataKey="awayWinPct"
                        stroke={awayTeamInfo.primaryColor}
                        name={awayTeamInfo.name}
                        dot={false}
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  {finalData && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <p className="text-[11px] text-slate-500 uppercase font-bold mb-2">{homeTeamInfo.name}</p>
                        <p className="text-3xl font-black" style={{ color: homeTeamInfo.primaryColor }}>
                          {finalData.homeWinPct}%
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <p className="text-[11px] text-slate-500 uppercase font-bold mb-2">{awayTeamInfo.name}</p>
                        <p className="text-3xl font-black" style={{ color: awayTeamInfo.primaryColor }}>
                          {finalData.awayWinPct}%
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-slate-500 text-center py-12">No win probability data available</p>
              )}
            </div>
          )}

          {activeTab === 'flow' && (
            <div className="space-y-6">
              <p className="text-sm text-slate-400">Quarter-by-quarter scoring</p>

              {gameFlowData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={gameFlowData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="quarter" stroke="rgba(148,163,184,0.5)" tick={{ fontSize: 12 }} />
                      <YAxis stroke="rgba(148,163,184,0.5)" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey={homeTeamInfo.abbreviation} fill={homeTeamInfo.primaryColor} />
                      <Bar dataKey={awayTeamInfo.abbreviation} fill={awayTeamInfo.primaryColor} />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="grid grid-cols-4 gap-2">
                    {gameFlowData.map((item, idx) => (
                      <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-xs text-slate-500 font-bold uppercase mb-2">{item.quarter}</p>
                        <p className="text-sm font-black" style={{ color: homeTeamInfo.primaryColor }}>
                          {item[homeTeamInfo.abbreviation]}
                        </p>
                        <p className="text-sm font-black" style={{ color: awayTeamInfo.primaryColor }}>
                          {item[awayTeamInfo.abbreviation]}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-center py-12">No game flow data available</p>
              )}
            </div>
          )}

          {activeTab === 'cover' && (
            <div className="space-y-6">
              <p className="text-sm text-slate-400">Probability to cover the spread</p>
              <div className="bg-white/5 rounded-lg p-8 border border-white/10 text-center">
                <p className="text-slate-500">Cover probability data coming soon</p>
                <p className="text-xs text-slate-600 mt-2">Requires odds data integration</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
