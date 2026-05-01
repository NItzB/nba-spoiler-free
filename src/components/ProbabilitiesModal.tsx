import React, { useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import * as NBAIcons from 'react-nba-logos'
import { Game } from '../types/game'
import { getTeam } from '../lib/teams'

type Tab = 'win' | 'flow' | 'cover'

interface ProbabilitiesModalProps {
  isOpen: boolean
  onClose: () => void
  game: Game
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'win', label: 'Win Probability' },
  { id: 'flow', label: 'Game Flow' },
  { id: 'cover', label: 'Cover Probability' },
]

function TeamLogo({ abbr, size = 36 }: { abbr: string; size?: number }) {
  const team = getTeam(abbr)
  const Logo = (NBAIcons as Record<string, React.ComponentType<{ size?: number }>>)[team.abbreviation]
  if (Logo) return <Logo size={size} />
  return (
    <div
      className="rounded-full flex items-center justify-center text-[10px] font-black border-2"
      style={{
        width: size,
        height: size,
        backgroundColor: team.primaryColor + '40',
        borderColor: team.primaryColor + '80',
        color: '#fff',
      }}
    >
      {abbr}
    </div>
  )
}

interface ChartPoint {
  t: number              // 0..1 progression
  awayPct: number        // away win % (0..100)
  playId: string | null  // for matching against plays_data
}

function buildWinProbabilitySeries(data: any[] | undefined): ChartPoint[] {
  if (!Array.isArray(data) || data.length === 0) return []
  const n = data.length
  return data.map((p, i) => {
    const home = typeof p?.homeWinPercentage === 'number' ? p.homeWinPercentage : 0.5
    const homePct = Math.max(0, Math.min(100, home * 100))
    const playId = p?.playId != null ? String(p.playId) : null
    return { t: n === 1 ? 0 : i / (n - 1), awayPct: 100 - homePct, playId }
  })
}

interface SlimPlay {
  id: string
  type?: string | null
  text?: string | null
  clock?: string | null
  period?: number | null
  homeScore?: number | null
  awayScore?: number | null
  scoringPlay?: boolean | null
}

function periodLabel(period?: number | null): string {
  if (!period) return ''
  if (period === 1) return '1st'
  if (period === 2) return '2nd'
  if (period === 3) return '3rd'
  if (period === 4) return '4th'
  return period === 5 ? 'OT' : `OT${period - 4}`
}

// Convert hex to HSL components
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let hue = 0
  let sat = 0
  if (max !== min) {
    const d = max - min
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)); break
      case g: hue = ((b - r) / d + 2); break
      case b: hue = ((r - g) / d + 4); break
    }
    hue /= 6
  }
  return { h: hue * 360, s: sat, l }
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// Brighten dark team colors so they're readable on the dark modal background.
// Hue is preserved; lightness floored to ~58% with a saturation floor for vividness.
function toChartColor(hex: string): string {
  const { h, s, l } = hexToHsl(hex)
  if (l >= 0.45) return hex
  return hslToHex(h, Math.max(s, 0.55), 0.6)
}

export default function ProbabilitiesModal({ isOpen, onClose, game }: ProbabilitiesModalProps) {
  const [tab, setTab] = useState<Tab>('win')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  const winSeries = useMemo(() => buildWinProbabilitySeries(game.winprobability_data), [game.winprobability_data])

  const playsById = useMemo(() => {
    const m = new Map<string, SlimPlay>()
    if (Array.isArray(game.plays_data)) {
      for (const p of game.plays_data) {
        if (p?.id != null) m.set(String(p.id), { ...p, id: String(p.id) })
      }
    }
    return m
  }, [game.plays_data])

  // Chart geometry — must be declared before any early return so hooks order is stable.
  const W = 720
  const H = 240
  const PAD_L = 36
  const PAD_R = 12
  const PAD_T = 8
  const PAD_B = 28
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const midY = innerH / 2

  const linePath = useMemo(() => {
    if (winSeries.length === 0) return ''
    return winSeries
      .map((p, i) => {
        const x = p.t * innerW
        const y = ((100 - p.awayPct) / 100) * innerH
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')
  }, [winSeries, innerW, innerH])

  const lineToMidPath = useMemo(() => {
    if (winSeries.length === 0) return ''
    const top = winSeries
      .map((p, i) => {
        const x = p.t * innerW
        const y = ((100 - p.awayPct) / 100) * innerH
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')
    const lastX = winSeries[winSeries.length - 1].t * innerW
    const firstX = winSeries[0].t * innerW
    return `${top} L${lastX.toFixed(2)},${midY} L${firstX.toFixed(2)},${midY} Z`
  }, [winSeries, innerW, innerH, midY])

  if (!isOpen) return null

  const away = getTeam(game.away_team)
  const home = getTeam(game.home_team)
  const awayColor = toChartColor(away.primaryColor)
  const homeColor = toChartColor(home.primaryColor)

  const last = winSeries[winSeries.length - 1]
  const hasWinData = winSeries.length > 0

  // Hovered point (or final) drives the summary % display
  const activeIdx = hoverIdx != null && hoverIdx >= 0 && hoverIdx < winSeries.length
    ? hoverIdx
    : winSeries.length - 1
  const activePoint = winSeries[activeIdx]
  const displayAway = activePoint ? activePoint.awayPct : 50
  const displayHome = 100 - displayAway

  // Resolve the play matching the active point (for the hover card)
  const activePlay: SlimPlay | null = activePoint?.playId ? playsById.get(activePoint.playId) ?? null : null

  // Quarter label for the hovered position. Prefer real period from the play
  // when we have it; fall back to a t-based estimate otherwise.
  const hoveredQuarter = (() => {
    if (hoverIdx == null || !activePoint) return null
    if (activePlay?.period) return periodLabel(activePlay.period)
    const t = activePoint.t
    if (t <= 0.25) return '1st'
    if (t <= 0.5) return '2nd'
    if (t <= 0.75) return '3rd'
    if (t <= 1) return '4th'
    return null
  })()

  let awayScore: string | null = null
  let homeScore: string | null = null
  if (game.final_score) {
    const parts = game.final_score.split(/[-–]/).map(s => s.trim())
    if (parts.length === 2) {
      awayScore = parts[0]
      homeScore = parts[1]
    }
  }

  const aboveClipId = `above-${uid}`
  const belowClipId = `below-${uid}`
  const awayGradId = `away-grad-${uid}`
  const homeGradId = `home-grad-${uid}`

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-8">
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl bg-[#0f172a] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <h2 className="text-[11px] sm:text-xs font-black text-white uppercase tracking-[0.18em]">
            Probabilities & Game Flow
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-2 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white text-lg leading-none flex items-center justify-center transition"
          >
            ×
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Segmented tabs + dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-full bg-white/5 border border-white/10 p-0.5">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition whitespace-nowrap ${
                    tab === t.id
                      ? 'bg-white text-slate-900 shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'cover' && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-300 cursor-not-allowed opacity-70">
                Spread
                <span className="text-slate-500">▾</span>
              </div>
            )}
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <TeamLogo abbr={game.away_team} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{away.city}</p>
                <p className="text-sm font-black text-white truncate">{away.name}</p>
              </div>
              <div className="text-right">
                <p
                  className="text-2xl font-black leading-none tabular-nums"
                  style={{ color: awayColor }}
                >
                  {hasWinData ? `${Math.round(displayAway)}%` : '—'}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">Win</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <TeamLogo abbr={game.home_team} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{home.city}</p>
                <p className="text-sm font-black text-white truncate">{home.name}</p>
              </div>
              <div className="text-right">
                <p
                  className="text-2xl font-black leading-none tabular-nums"
                  style={{ color: homeColor }}
                >
                  {hasWinData ? `${Math.round(displayHome)}%` : '—'}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">Win</p>
              </div>
            </div>
          </div>

          {/* Hover hint / quarter readout */}
          {hasWinData && (
            <p className="text-[10px] text-slate-500 -mt-2 px-1">
              {hoverIdx != null && hoveredQuarter
                ? <span><span className="text-slate-300 font-bold">{hoveredQuarter}</span>{activePlay?.clock ? <> · <span className="tabular-nums">{activePlay.clock}</span></> : null} · scrubbing the chart</span>
                : <span className="hidden sm:inline">Hover the chart to see win probability {playsById.size > 0 ? 'and play-by-play' : 'over time'}</span>}
            </p>
          )}

          {/* Chart card */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 sm:p-4">
            {tab === 'win' && (
              hasWinData ? (
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  className="w-full h-auto block touch-none select-none cursor-crosshair"
                  onMouseLeave={() => setHoverIdx(null)}
                  onMouseMove={e => {
                    const svg = e.currentTarget
                    const rect = svg.getBoundingClientRect()
                    const xVB = ((e.clientX - rect.left) / rect.width) * W
                    const xPlot = xVB - PAD_L
                    if (xPlot < 0 || xPlot > innerW) {
                      setHoverIdx(null)
                      return
                    }
                    const t = xPlot / innerW
                    const idx = Math.round(t * (winSeries.length - 1))
                    setHoverIdx(Math.max(0, Math.min(winSeries.length - 1, idx)))
                  }}
                  onTouchMove={e => {
                    const touch = e.touches[0]
                    if (!touch) return
                    const svg = e.currentTarget
                    const rect = svg.getBoundingClientRect()
                    const xVB = ((touch.clientX - rect.left) / rect.width) * W
                    const xPlot = xVB - PAD_L
                    if (xPlot < 0 || xPlot > innerW) {
                      setHoverIdx(null)
                      return
                    }
                    const t = xPlot / innerW
                    const idx = Math.round(t * (winSeries.length - 1))
                    setHoverIdx(Math.max(0, Math.min(winSeries.length - 1, idx)))
                  }}
                  onTouchEnd={() => setHoverIdx(null)}
                >
                  <defs>
                    {/* Clip rects are in the local coord system of the transformed plot group */}
                    <clipPath id={aboveClipId}>
                      <rect x={0} y={0} width={innerW} height={midY} />
                    </clipPath>
                    <clipPath id={belowClipId}>
                      <rect x={0} y={midY} width={innerW} height={innerH - midY} />
                    </clipPath>
                    <linearGradient id={awayGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={awayColor} stopOpacity="0.6" />
                      <stop offset="100%" stopColor={awayColor} stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id={homeGradId} x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor={homeColor} stopOpacity="0.6" />
                      <stop offset="100%" stopColor={homeColor} stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {/* Y-axis labels */}
                  <g fontFamily="Inter, system-ui, sans-serif" fontSize="9" fill="#64748b" fontWeight="700">
                    <text x={PAD_L - 6} y={PAD_T + 4} textAnchor="end">100</text>
                    <text x={PAD_L - 6} y={PAD_T + midY + 3} textAnchor="end">50</text>
                    <text x={PAD_L - 6} y={PAD_T + innerH} textAnchor="end">100</text>
                  </g>

                  {/* Plot region (translated) */}
                  <g transform={`translate(${PAD_L},${PAD_T})`}>
                    {/* Quarter gridlines */}
                    {[0.25, 0.5, 0.75].map(p => (
                      <line
                        key={p}
                        x1={p * innerW}
                        x2={p * innerW}
                        y1={0}
                        y2={innerH}
                        stroke="#ffffff"
                        strokeOpacity="0.06"
                        strokeDasharray="3 3"
                      />
                    ))}
                  </g>

                  {/* Filled areas in absolute coords so clipPath rects work cleanly */}
                  <g transform={`translate(${PAD_L},${PAD_T})`} clipPath={`url(#${aboveClipId})`}>
                    <path d={lineToMidPath} fill={`url(#${awayGradId})`} />
                  </g>
                  <g transform={`translate(${PAD_L},${PAD_T})`} clipPath={`url(#${belowClipId})`}>
                    <path d={lineToMidPath} fill={`url(#${homeGradId})`} />
                  </g>

                  {/* 50% midline + probability line + end marker + x-axis */}
                  <g transform={`translate(${PAD_L},${PAD_T})`}>
                    <line
                      x1={0}
                      x2={innerW}
                      y1={midY}
                      y2={midY}
                      stroke="#94a3b8"
                      strokeOpacity="0.3"
                      strokeWidth="1"
                    />
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#ffffff"
                      strokeOpacity="0.9"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {/* End-of-game marker (hidden while user is scrubbing) */}
                    {last && hoverIdx == null && (
                      <circle
                        cx={last.t * innerW}
                        cy={((100 - last.awayPct) / 100) * innerH}
                        r="3.5"
                        fill={last.awayPct >= 50 ? awayColor : homeColor}
                        stroke="#fff"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Hover crosshair + marker dot */}
                    {hoverIdx != null && activePoint && (
                      <g pointerEvents="none">
                        <line
                          x1={activePoint.t * innerW}
                          x2={activePoint.t * innerW}
                          y1={0}
                          y2={innerH}
                          stroke="#ffffff"
                          strokeOpacity="0.5"
                          strokeWidth="1"
                          strokeDasharray="2 3"
                        />
                        <circle
                          cx={activePoint.t * innerW}
                          cy={((100 - activePoint.awayPct) / 100) * innerH}
                          r="4.5"
                          fill={activePoint.awayPct >= 50 ? awayColor : homeColor}
                          stroke="#fff"
                          strokeWidth="1.5"
                        />
                      </g>
                    )}

                    <g
                      fontFamily="Inter, system-ui, sans-serif"
                      fontSize="10"
                      fill="#94a3b8"
                      fontWeight="700"
                      transform={`translate(0, ${innerH + 16})`}
                    >
                      <text x={innerW * 0.125} textAnchor="middle">1ST</text>
                      <text x={innerW * 0.375} textAnchor="middle">2ND</text>
                      <text x={innerW * 0.625} textAnchor="middle">3RD</text>
                      <text x={innerW * 0.875} textAnchor="middle">4TH</text>
                    </g>
                  </g>
                </svg>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500">
                  No win probability data available for this game.
                </div>
              )
            )}

            {tab === 'flow' && (
              <div className="h-48 flex flex-col items-center justify-center text-center px-4">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg mb-3">
                  📈
                </div>
                <p className="text-sm font-bold text-slate-300">Game Flow coming soon</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-md">
                  Point-margin time series powered by play-by-play data. Wiring up the scraper next.
                </p>
              </div>
            )}

            {tab === 'cover' && (
              <div className="h-48 flex flex-col items-center justify-center text-center px-4">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg mb-3">
                  🎯
                </div>
                <p className="text-sm font-bold text-slate-300">Cover Probability coming soon</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-md">
                  Live spread cover odds against the closing line. Pulling odds data next.
                </p>
              </div>
            )}
          </div>

          {/* Play card while scrubbing — falls back to End of Game otherwise */}
          {tab === 'win' && hoverIdx != null && activePlay ? (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 sm:px-4 py-3 animate-in fade-in duration-150">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-black text-white">
                    {activePlay.type || 'Play'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5 tabular-nums">
                    {activePlay.clock ?? '--:--'}
                    {activePlay.period ? ` · ${periodLabel(activePlay.period)}` : ''}
                  </p>
                  {activePlay.text && (
                    <p className="text-[11px] sm:text-xs text-slate-300 mt-1.5 leading-snug">
                      {activePlay.text}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 text-right tabular-nums">
                  <div>
                    <p className="text-base sm:text-lg font-black text-white leading-none">
                      {activePlay.awayScore ?? '—'}
                    </p>
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">
                      {game.away_team}
                    </p>
                  </div>
                  <div className="w-px h-7 bg-white/10" />
                  <div>
                    <p className="text-base sm:text-lg font-black text-white leading-none">
                      {activePlay.homeScore ?? '—'}
                    </p>
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">
                      {game.home_team}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : game.final_score && awayScore && homeScore ? (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 sm:px-4 py-3">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">End of Game</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <TeamLogo abbr={game.away_team} size={24} />
                  <span className="text-xs font-bold text-slate-200 truncate">{away.name}</span>
                  <span className="ml-auto text-base font-black text-white">{awayScore}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TeamLogo abbr={game.home_team} size={24} />
                  <span className="text-xs font-bold text-slate-200 truncate">{home.name}</span>
                  <span className="ml-auto text-base font-black text-white">{homeScore}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Attribution */}
          <p className="text-[10px] text-slate-600 text-center">
            According to ESPN Analytics
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
