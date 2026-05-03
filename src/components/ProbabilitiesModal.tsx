import React, { useId, useMemo, useState } from 'react'
import * as NBAIcons from 'react-nba-logos'
import { Game } from '../types/game'
import { getTeam } from '../lib/teams'
import ModalShell from './ModalShell'

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

// ─── Game Flow helpers ──────────────────────────────────────────────────────
const REG_PERIOD_SEC = 12 * 60   // 12-minute NBA quarter
const OT_PERIOD_SEC = 5 * 60     // 5-minute overtime period
const REG_TOTAL_SEC = 4 * REG_PERIOD_SEC

function parseClock(clock?: string | null): number {
  if (!clock) return 0
  const parts = String(clock).split(':')
  if (parts.length === 2) {
    const m = parseFloat(parts[0])
    const s = parseFloat(parts[1])
    return (isNaN(m) ? 0 : m) * 60 + (isNaN(s) ? 0 : s)
  }
  const v = parseFloat(parts[0])
  return isNaN(v) ? 0 : v
}

// Map a play to an absolute t (0..1+) along the game's timeline.
function playT(period: number | null | undefined, clock: string | null | undefined, totalSec: number): number {
  if (!period || totalSec <= 0) return 0
  const isOT = period >= 5
  const periodLen = isOT ? OT_PERIOD_SEC : REG_PERIOD_SEC
  const remaining = parseClock(clock)
  const elapsedInPeriod = Math.max(0, Math.min(periodLen, periodLen - remaining))
  const elapsedTotal = period <= 4
    ? (period - 1) * REG_PERIOD_SEC + elapsedInPeriod
    : REG_TOTAL_SEC + (period - 5) * OT_PERIOD_SEC + elapsedInPeriod
  return Math.max(0, Math.min(1, elapsedTotal / totalSec))
}

interface FlowPoint {
  t: number
  home: number
  away: number
  play: SlimPlay
}

function buildGameFlowSeries(plays: SlimPlay[], totalSec: number): FlowPoint[] {
  if (plays.length === 0) return []
  const out: FlowPoint[] = []
  for (const p of plays) {
    const t = playT(p.period, p.clock, totalSec)
    const home = typeof p.homeScore === 'number' ? p.homeScore : (out.length ? out[out.length - 1].home : 0)
    const away = typeof p.awayScore === 'number' ? p.awayScore : (out.length ? out[out.length - 1].away : 0)
    out.push({ t, home, away, play: p })
  }
  return out
}

// Standard NBA "lead changes": count flips between non-tied lead states.
function computeLeadChanges(flow: FlowPoint[]): number {
  let prevSign = 0
  let count = 0
  for (const pt of flow) {
    const diff = pt.home - pt.away
    const sign = diff > 0 ? 1 : diff < 0 ? -1 : 0
    if (sign !== 0 && prevSign !== 0 && sign !== prevSign) count++
    if (sign !== 0) prevSign = sign
  }
  return count
}

// Find the index of the closest point to a given t. Series is sorted by t,
// so we can early-exit once distance starts increasing.
function closestIdxByT(series: { t: number }[], t: number): number {
  if (series.length === 0) return -1
  let bestIdx = 0
  let bestDist = Math.abs(series[0].t - t)
  for (let i = 1; i < series.length; i++) {
    const d = Math.abs(series[i].t - t)
    if (d < bestDist) { bestDist = d; bestIdx = i }
    else if (d > bestDist) break
  }
  return bestIdx
}

export default function ProbabilitiesModal({ isOpen, onClose, game }: ProbabilitiesModalProps) {
  const [tab, setTab] = useState<Tab>('win')
  // Normalized hover position 0..1 along the chart's x-axis. Each tab maps it
  // to its own series independently, so switching tabs while hovering still
  // gives a consistent point in game-time.
  const [hoverT, setHoverT] = useState<number | null>(null)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')

  const winSeries = useMemo(() => buildWinProbabilitySeries(game.winprobability_data), [game.winprobability_data])

  // Slim plays in a stable, ordered array (used by Game Flow + the playsById lookup)
  const slimPlays: SlimPlay[] = useMemo(() => {
    if (!Array.isArray(game.plays_data)) return []
    return game.plays_data
      .filter(p => p?.id != null)
      .map(p => ({ ...p, id: String(p.id) }))
  }, [game.plays_data])

  const playsById = useMemo(() => {
    const m = new Map<string, SlimPlay>()
    for (const p of slimPlays) m.set(p.id, p)
    return m
  }, [slimPlays])

  // How many OT periods does this game have? Drives chart x-scale.
  const numOTs = useMemo(() => {
    let max = 4
    for (const p of slimPlays) {
      if (typeof p.period === 'number' && p.period > max) max = p.period
    }
    return Math.max(0, max - 4)
  }, [slimPlays])
  const totalGameSec = REG_TOTAL_SEC + numOTs * OT_PERIOD_SEC

  const flowSeries: FlowPoint[] = useMemo(
    () => buildGameFlowSeries(slimPlays, totalGameSec),
    [slimPlays, totalGameSec]
  )

  const leadChanges = useMemo(() => computeLeadChanges(flowSeries), [flowSeries])

  // y-axis scale for Game Flow: round up to the next 25 above the max score
  const maxScore = useMemo(() => {
    let m = 0
    for (const pt of flowSeries) {
      if (pt.home > m) m = pt.home
      if (pt.away > m) m = pt.away
    }
    return m
  }, [flowSeries])
  const yMaxScore = Math.max(50, Math.ceil((maxScore + 5) / 25) * 25)

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

  // Step-after path: hold previous y until x advances, then drop to new y.
  // NBA scores are monotonically non-decreasing, so this reads as a staircase.
  const buildFlowStepPath = (key: 'home' | 'away'): string => {
    if (flowSeries.length === 0) return ''
    let out = ''
    let prevY = 0
    for (let i = 0; i < flowSeries.length; i++) {
      const p = flowSeries[i]
      const x = p.t * innerW
      const y = (1 - p[key] / yMaxScore) * innerH
      if (i === 0) {
        out = `M${x.toFixed(2)},${y.toFixed(2)}`
      } else {
        out += ` L${x.toFixed(2)},${prevY.toFixed(2)} L${x.toFixed(2)},${y.toFixed(2)}`
      }
      prevY = y
    }
    return out
  }
  const flowAwayPath = useMemo(() => buildFlowStepPath('away'), [flowSeries, innerW, innerH, yMaxScore])
  const flowHomePath = useMemo(() => buildFlowStepPath('home'), [flowSeries, innerW, innerH, yMaxScore])

  // Period boundaries on the x-axis, time-weighted (handles OT correctly).
  const periodMarkers = useMemo(() => {
    const markers: { label: string; centerT: number; endT: number }[] = []
    const periods = 4 + numOTs
    let acc = 0
    for (let i = 1; i <= periods; i++) {
      const isOT = i >= 5
      const len = (isOT ? OT_PERIOD_SEC : REG_PERIOD_SEC) / totalGameSec
      markers.push({ label: periodLabel(i).toUpperCase(), centerT: acc + len / 2, endT: acc + len })
      acc += len
    }
    return markers
  }, [numOTs, totalGameSec])

  // Y-axis tick values for Game Flow (every 25 points).
  const yTicks = useMemo(() => {
    const ticks: number[] = []
    for (let v = 0; v <= yMaxScore; v += 25) ticks.push(v)
    return ticks
  }, [yMaxScore])

  // Don't bother computing chart values if the modal is closed.
  if (!isOpen) return <ModalShell isOpen={false} onClose={onClose} />

  const away = getTeam(game.away_team)
  const home = getTeam(game.home_team)
  const awayColor = toChartColor(away.primaryColor)
  const homeColor = toChartColor(home.primaryColor)

  const last = winSeries[winSeries.length - 1]
  const hasWinData = winSeries.length > 0
  const hasFlowData = flowSeries.length > 0
  const lastFlow = flowSeries[flowSeries.length - 1]

  // Resolve the active point in each series from the normalized hover position.
  const winIdx = hasWinData
    ? (hoverT == null
        ? winSeries.length - 1
        : Math.max(0, Math.min(winSeries.length - 1, Math.round(hoverT * (winSeries.length - 1)))))
    : -1
  const winPoint = winIdx >= 0 ? winSeries[winIdx] : null

  const flowIdx = hasFlowData
    ? (hoverT == null ? flowSeries.length - 1 : closestIdxByT(flowSeries, hoverT))
    : -1
  const flowPoint = flowIdx >= 0 ? flowSeries[flowIdx] : null

  // Win-tab summary % display (driven by hover, falls back to final).
  const displayAway = winPoint ? winPoint.awayPct : 50
  const displayHome = 100 - displayAway

  // Resolve the play matching whichever tab the user is on.
  const activePlay: SlimPlay | null = (() => {
    if (tab === 'flow') return flowPoint?.play ?? null
    if (winPoint?.playId) return playsById.get(winPoint.playId) ?? null
    return null
  })()

  // Quarter label for the hovered position (used in the hint line).
  const hoveredQuarter = (() => {
    if (hoverT == null) return null
    if (activePlay?.period) return periodLabel(activePlay.period)
    if (winPoint) {
      const t = winPoint.t
      if (t <= 0.25) return '1st'
      if (t <= 0.5) return '2nd'
      if (t <= 0.75) return '3rd'
      if (t <= 1) return '4th'
    }
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

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} panelClassName="max-w-3xl" cinematic>
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
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1.5">
                  {away.city}
                  {tab === 'flow' && (
                    <svg width="18" height="3" viewBox="0 0 18 3" aria-hidden="true">
                      <line x1="0" y1="1.5" x2="18" y2="1.5" stroke={awayColor} strokeWidth="2" strokeDasharray="3 2" strokeLinecap="round" />
                    </svg>
                  )}
                </p>
                <p className="text-sm font-black text-white truncate">{away.name}</p>
              </div>
              <div className="text-right">
                <p
                  className="text-2xl font-black leading-none tabular-nums"
                  style={{ color: awayColor }}
                >
                  {tab === 'flow'
                    ? (hasFlowData && flowPoint ? flowPoint.away : '—')
                    : (hasWinData ? `${Math.round(displayAway)}%` : '—')}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">
                  {tab === 'flow' ? 'Score' : 'Win'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <TeamLogo abbr={game.home_team} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1.5">
                  {home.city}
                  {tab === 'flow' && (
                    <svg width="18" height="3" viewBox="0 0 18 3" aria-hidden="true">
                      <line x1="0" y1="1.5" x2="18" y2="1.5" stroke={homeColor} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </p>
                <p className="text-sm font-black text-white truncate">{home.name}</p>
              </div>
              <div className="text-right">
                <p
                  className="text-2xl font-black leading-none tabular-nums"
                  style={{ color: homeColor }}
                >
                  {tab === 'flow'
                    ? (hasFlowData && flowPoint ? flowPoint.home : '—')
                    : (hasWinData ? `${Math.round(displayHome)}%` : '—')}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">
                  {tab === 'flow' ? 'Score' : 'Win'}
                </p>
              </div>
            </div>
          </div>

          {tab === 'flow' && hasFlowData && (
            <div className="flex justify-center -mt-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1">
                <span className="text-base font-black text-white tabular-nums">{leadChanges}</span>
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Lead Changes</span>
              </div>
            </div>
          )}

          {/* Hover hint / quarter readout */}
          {(tab === 'win' ? hasWinData : tab === 'flow' ? hasFlowData : false) && (
            <p className="text-[10px] text-slate-500 -mt-2 px-1">
              {hoverT != null && hoveredQuarter
                ? <span><span className="text-slate-300 font-bold">{hoveredQuarter}</span>{activePlay?.clock ? <> · <span className="tabular-nums">{activePlay.clock}</span></> : null} · scrubbing the chart</span>
                : <span className="hidden sm:inline">Hover the chart to see {tab === 'flow' ? 'cumulative scores' : 'win probability'} {playsById.size > 0 ? 'and play-by-play' : 'over time'}</span>}
            </p>
          )}

          {/* Chart card */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 sm:p-4">
            {tab === 'win' && (
              hasWinData ? (
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  className="w-full h-auto block touch-none select-none cursor-crosshair"
                  onMouseLeave={() => setHoverT(null)}
                  onMouseMove={e => {
                    const svg = e.currentTarget
                    const rect = svg.getBoundingClientRect()
                    const xVB = ((e.clientX - rect.left) / rect.width) * W
                    const xPlot = xVB - PAD_L
                    if (xPlot < 0 || xPlot > innerW) { setHoverT(null); return }
                    setHoverT(Math.max(0, Math.min(1, xPlot / innerW)))
                  }}
                  onTouchMove={e => {
                    const touch = e.touches[0]
                    if (!touch) return
                    const svg = e.currentTarget
                    const rect = svg.getBoundingClientRect()
                    const xVB = ((touch.clientX - rect.left) / rect.width) * W
                    const xPlot = xVB - PAD_L
                    if (xPlot < 0 || xPlot > innerW) { setHoverT(null); return }
                    setHoverT(Math.max(0, Math.min(1, xPlot / innerW)))
                  }}
                  onTouchEnd={() => setHoverT(null)}
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
                    {last && hoverT == null && (
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
                    {hoverT != null && winPoint && (
                      <g pointerEvents="none">
                        <line
                          x1={winPoint.t * innerW}
                          x2={winPoint.t * innerW}
                          y1={0}
                          y2={innerH}
                          stroke="#ffffff"
                          strokeOpacity="0.5"
                          strokeWidth="1"
                          strokeDasharray="2 3"
                        />
                        <circle
                          cx={winPoint.t * innerW}
                          cy={((100 - winPoint.awayPct) / 100) * innerH}
                          r="4.5"
                          fill={winPoint.awayPct >= 50 ? awayColor : homeColor}
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
              hasFlowData ? (
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  className="w-full h-auto block touch-none select-none cursor-crosshair"
                  onMouseLeave={() => setHoverT(null)}
                  onMouseMove={e => {
                    const svg = e.currentTarget
                    const rect = svg.getBoundingClientRect()
                    const xVB = ((e.clientX - rect.left) / rect.width) * W
                    const xPlot = xVB - PAD_L
                    if (xPlot < 0 || xPlot > innerW) { setHoverT(null); return }
                    setHoverT(Math.max(0, Math.min(1, xPlot / innerW)))
                  }}
                  onTouchMove={e => {
                    const touch = e.touches[0]
                    if (!touch) return
                    const svg = e.currentTarget
                    const rect = svg.getBoundingClientRect()
                    const xVB = ((touch.clientX - rect.left) / rect.width) * W
                    const xPlot = xVB - PAD_L
                    if (xPlot < 0 || xPlot > innerW) { setHoverT(null); return }
                    setHoverT(Math.max(0, Math.min(1, xPlot / innerW)))
                  }}
                  onTouchEnd={() => setHoverT(null)}
                >
                  {/* Y-axis labels */}
                  <g fontFamily="Inter, system-ui, sans-serif" fontSize="9" fill="#64748b" fontWeight="700">
                    {yTicks.map(v => {
                      const y = PAD_T + (1 - v / yMaxScore) * innerH
                      return (
                        <text key={v} x={PAD_L - 6} y={y + 3} textAnchor="end">{v}</text>
                      )
                    })}
                  </g>

                  <g transform={`translate(${PAD_L},${PAD_T})`}>
                    {/* Horizontal gridlines at each y-tick */}
                    {yTicks.map(v => {
                      const y = (1 - v / yMaxScore) * innerH
                      return (
                        <line
                          key={v}
                          x1={0}
                          x2={innerW}
                          y1={y}
                          y2={y}
                          stroke="#ffffff"
                          strokeOpacity={v === 0 ? 0.18 : 0.06}
                          strokeDasharray={v === 0 ? undefined : '3 3'}
                        />
                      )
                    })}

                    {/* Period dividers */}
                    {periodMarkers.slice(0, -1).map((m, i) => (
                      <line
                        key={i}
                        x1={m.endT * innerW}
                        x2={m.endT * innerW}
                        y1={0}
                        y2={innerH}
                        stroke="#ffffff"
                        strokeOpacity="0.08"
                        strokeDasharray="3 3"
                      />
                    ))}

                    {/* Away (dashed) */}
                    <path
                      d={flowAwayPath}
                      fill="none"
                      stroke={awayColor}
                      strokeWidth="2"
                      strokeDasharray="5 3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {/* Home (solid) */}
                    <path
                      d={flowHomePath}
                      fill="none"
                      stroke={homeColor}
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />

                    {/* End-of-game marker dots (hidden while scrubbing) */}
                    {lastFlow && hoverT == null && (
                      <g pointerEvents="none">
                        <circle
                          cx={lastFlow.t * innerW}
                          cy={(1 - lastFlow.away / yMaxScore) * innerH}
                          r="3.5"
                          fill={awayColor}
                          stroke="#0f172a"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={lastFlow.t * innerW}
                          cy={(1 - lastFlow.home / yMaxScore) * innerH}
                          r="3.5"
                          fill={homeColor}
                          stroke="#0f172a"
                          strokeWidth="1.5"
                        />
                      </g>
                    )}

                    {/* Hover crosshair + dot markers on both lines */}
                    {hoverT != null && flowPoint && (
                      <g pointerEvents="none">
                        <line
                          x1={flowPoint.t * innerW}
                          x2={flowPoint.t * innerW}
                          y1={0}
                          y2={innerH}
                          stroke="#ffffff"
                          strokeOpacity="0.5"
                          strokeWidth="1"
                          strokeDasharray="2 3"
                        />
                        <circle
                          cx={flowPoint.t * innerW}
                          cy={(1 - flowPoint.away / yMaxScore) * innerH}
                          r="4.5"
                          fill={awayColor}
                          stroke="#fff"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={flowPoint.t * innerW}
                          cy={(1 - flowPoint.home / yMaxScore) * innerH}
                          r="4.5"
                          fill={homeColor}
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
                      {periodMarkers.map((m, i) => (
                        <text key={i} x={m.centerT * innerW} textAnchor="middle">{m.label}</text>
                      ))}
                    </g>
                  </g>
                </svg>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500">
                  No play-by-play data available for this game.
                </div>
              )
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
          {(tab === 'win' || tab === 'flow') && hoverT != null && activePlay ? (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 sm:px-4 py-3">
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
    </ModalShell>
  )
}
