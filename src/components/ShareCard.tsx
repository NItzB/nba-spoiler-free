import React, { forwardRef } from 'react'
import * as NBAIcons from 'react-nba-logos'
import { format, parseISO } from 'date-fns'
import { Game } from '../types/game'
import { getTeam, getTagInfo } from '../lib/teams'
import { getExcitementTier } from './ExcitementBadge'

interface ShareCardProps {
  game: Game
  variant: 'spoiler-free' | 'spoiler-shown'
}

// Tier colors mirror tailwind.config.js exactly so the share card and the
// in-app card feel like the same product.
const TIER = {
  'must-watch': {
    label: 'Must Watch',
    icon: '🔥',
    accent: '#ff6b35',
    gradFrom: '#f97316',
    gradVia: '#ef4444',
    gradTo: '#f97316',
    tagline: "Don't miss this one.",
  },
  'great': {
    label: 'Great Game',
    icon: '⭐',
    accent: '#4a9eff',
    gradFrom: '#3b82f6',
    gradVia: null as string | null,
    gradTo: '#06b6d4',
    tagline: 'Worth your evening.',
  },
  'decent': {
    label: 'Decent',
    icon: '👍',
    accent: '#a78bfa',
    gradFrom: '#8b5cf6',
    gradVia: null as string | null,
    gradTo: '#a855f7',
    tagline: 'Solid pick.',
  },
  'skip': {
    label: 'Skip It',
    icon: '💤',
    accent: '#64748b',
    gradFrom: '#475569',
    gradVia: null as string | null,
    gradTo: '#64748b',
    tagline: 'Save your time.',
  },
} as const

const SPOILER_TAGS = new Set([
  'High Scoring','Defensive Battle','Clutch Ending','Close Game',
  'Star Performance','Top Performer','OT','Blowout',
])

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags as string[]
  try { return JSON.parse((tags as string) || '[]') } catch { return [] }
}

function filterTags(tags: string[], variant: ShareCardProps['variant']): string[] {
  return variant === 'spoiler-shown' ? tags : tags.filter(t => !SPOILER_TAGS.has(t))
}

const W = 1200
const H = 630
const PAD = 24
const LOGO_SIZE = 124
const CIRCLE_SIZE = 176

const FONT_STACK = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

/* ──────────────────────────────────────────────────────────────────────────
 * ScoreOrb — rendered as inline SVG so the score is geometrically centered
 * via dominant-baseline="central". HTML text inside a circle drifts under
 * html2canvas because Inter's ascender exceeds its cap-height; SVG sidesteps
 * that entirely.
 * ────────────────────────────────────────────────────────────────────────── */
function ScoreOrb({
  score,
  tierKey,
}: {
  score: number
  tierKey: keyof typeof TIER
}) {
  const t = TIER[tierKey]
  const id = `orb-${tierKey}`
  const cx = CIRCLE_SIZE / 2
  const cy = CIRCLE_SIZE / 2
  return (
    <svg
      width={CIRCLE_SIZE}
      height={CIRCLE_SIZE}
      viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={t.gradFrom} />
          {t.gradVia && <stop offset="50%" stopColor={t.gradVia} />}
          <stop offset="100%" stopColor={t.gradTo} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={t.accent} stopOpacity="0.45" />
          <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer soft glow */}
      <circle cx={cx} cy={cy} r={cx} fill={`url(#${id}-glow)`} />
      {/* Outer ring (slightly inset so it reads cleanly) */}
      <circle cx={cx} cy={cy} r={cx - 8} fill="none" stroke={`${t.accent}77`} strokeWidth="2" />
      {/* Solid filled disc */}
      <circle cx={cx} cy={cy} r={cx - 14} fill={`url(#${id}-fill)`} />
      {/* Score — dominant-baseline central is the only reliable vertical centering */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontSize="64"
        fontWeight="900"
        fontFamily={FONT_STACK}
        style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
      >
        {score.toFixed(1)}
      </text>
    </svg>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Pill — inline SVG-based pill for guaranteed centering across html2canvas.
 * Width is computed from text length using a per-character estimate that
 * works well for Inter at the weights/sizes we use (uppercase, semi-tracked).
 * ────────────────────────────────────────────────────────────────────────── */
function svgPillWidth(text: string, fontSize: number, letterSpacingEm: number, paddingX: number, iconCount = 0, iconGapPx = 7) {
  // Empirical: Inter uppercase 700 weight averages ~0.6em per char.
  const charPx = fontSize * 0.6
  const lsPx = fontSize * letterSpacingEm
  const textPx = text.length * charPx + (text.length - 1) * lsPx
  const iconsPx = iconCount * (fontSize + iconGapPx)
  return Math.ceil(textPx + iconsPx + paddingX * 2)
}

function SVGPill({
  text,
  emoji,
  fontSize = 14,
  height = 32,
  paddingX = 16,
  letterSpacingEm = 0.16,
  fill,
  stroke,
  textColor = '#ffffff',
  borderRadius,
}: {
  text: string
  emoji?: string
  fontSize?: number
  height?: number
  paddingX?: number
  letterSpacingEm?: number
  fill: string
  stroke?: string
  textColor?: string
  borderRadius?: number
}) {
  const width = svgPillWidth(text, fontSize, letterSpacingEm, paddingX, emoji ? 1 : 0)
  const r = borderRadius ?? height / 2
  const cy = height / 2
  // Place emoji + text starting from left padding; both centered vertically
  // via dominant-baseline. SVG ignores font-metric drift entirely.
  const emojiX = emoji ? paddingX : 0
  const emojiW = emoji ? fontSize + 7 : 0
  const textX = paddingX + emojiW
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      <rect x="0.5" y="0.5" width={width - 1} height={height - 1} rx={r} ry={r} fill={fill} stroke={stroke ?? 'none'} strokeWidth={stroke ? 1 : 0} />
      {emoji && (
        <text
          x={emojiX}
          y={cy}
          dominantBaseline="central"
          fontSize={fontSize}
          fontFamily={FONT_STACK}
        >
          {emoji}
        </text>
      )}
      <text
        x={textX}
        y={cy}
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily={FONT_STACK}
        fill={textColor}
        style={{
          letterSpacing: `${letterSpacingEm}em`,
          textTransform: 'uppercase',
        }}
      >
        {text.toUpperCase()}
      </text>
    </svg>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Team column — large logo, city kicker, team name, record line.
 * ────────────────────────────────────────────────────────────────────────── */
function TeamColumn({ abbr, record }: { abbr: string; record?: string }) {
  const team = getTeam(abbr)
  const Logo = (NBAIcons as Record<string, React.ComponentType<{ size?: number }>>)[team.abbreviation]
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 280,
      }}
    >
      <div
        style={{
          width: LOGO_SIZE,
          height: LOGO_SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {Logo ? (
          <div style={{ lineHeight: 0 }}>
            <Logo size={LOGO_SIZE} />
          </div>
        ) : (
          <div
            style={{
              width: LOGO_SIZE,
              height: LOGO_SIZE,
              borderRadius: '50%',
              background: `${team.primaryColor}33`,
              border: `2px solid ${team.primaryColor}80`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 42,
              fontWeight: 900,
              color: '#ffffff',
            }}
          >
            {team.abbreviation}
          </div>
        )}
      </div>

      <div style={{ marginTop: 22, textAlign: 'center' }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#94a3b8',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            lineHeight: 1,
            paddingLeft: '0.18em',
          }}
        >
          {team.city}
        </div>
        <div
          style={{
            fontSize: 38,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            marginTop: 8,
          }}
        >
          {team.name}
        </div>
        {record && (
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#475569',
              fontVariantNumeric: 'tabular-nums',
              marginTop: 10,
              letterSpacing: '0.04em',
            }}
          >
            {record}
          </div>
        )}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Section divider with centered text — elegant alternative to a bare pill.
 * ────────────────────────────────────────────────────────────────────────── */
function CenteredDivider({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        width: '100%',
      }}
    >
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      <SVGPill
        text={text}
        fontSize={13}
        height={28}
        paddingX={14}
        letterSpacingEm={0.18}
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.12)"
        textColor="#cbd5e1"
        borderRadius={6}
      />
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * ShareCard — main composition.
 * ────────────────────────────────────────────────────────────────────────── */
const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({ game, variant }, ref) => {
  const tierKey = getExcitementTier(game.excitement_score)
  const t = TIER[tierKey]
  const showScore = variant === 'spoiler-shown' && !!game.final_score
  const tags = filterTags(parseTags(game.tags), variant).slice(0, 3)

  const dateLabel = (() => {
    if (!game.date) return ''
    try { return format(parseISO(game.date), 'MMM d, yyyy').toUpperCase() } catch { return game.date }
  })()

  const awayTeam = getTeam(game.away_team)
  const homeTeam = getTeam(game.home_team)

  const tierLabel = `${t.icon} ${t.label}`

  return (
    <div
      ref={ref}
      style={{
        width: W,
        height: H,
        position: 'relative',
        background: '#0a0a1a',
        fontFamily: FONT_STACK,
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: PAD,
      }}
    >
      {/* Inner card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: '#16163a',
          borderRadius: 22,
          boxShadow: `inset 0 0 0 1px ${t.accent}55, 0 12px 40px rgba(0,0,0,0.5)`,
          overflow: 'hidden',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top accent strip */}
        <div
          style={{
            height: 4,
            width: '100%',
            background: t.gradVia
              ? `linear-gradient(90deg, ${t.gradFrom} 0%, ${t.gradVia} 50%, ${t.gradTo} 100%)`
              : `linear-gradient(90deg, ${t.gradFrom} 0%, ${t.gradTo} 100%)`,
          }}
        />

        {/* Far-edge team-color washes — very subtle, just to give each side
            of the card a hint of identity without dominating. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 4,
            bottom: 0,
            width: 220,
            background: `radial-gradient(ellipse at left center, ${awayTeam.primaryColor}22 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 4,
            bottom: 0,
            width: 220,
            background: `radial-gradient(ellipse at right center, ${homeTeam.primaryColor}22 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '26px 44px 22px',
            boxSizing: 'border-box',
            zIndex: 1,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24, lineHeight: 1 }}>🏀</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#e2e8f0',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  paddingLeft: '0.22em',
                }}
              >
                NBA Spoiler-Free
              </span>
            </div>
            {dateLabel && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#64748b',
                  letterSpacing: '0.18em',
                  paddingLeft: '0.18em',
                }}
              >
                {dateLabel}
              </span>
            )}
          </div>

          {/* Header divider */}
          <div style={{ height: 1, marginTop: 14, background: 'rgba(255,255,255,0.06)' }} />

          {/* Hero — three columns, vertically aligned at logo top */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginTop: 28,
            }}
          >
            <TeamColumn abbr={game.away_team} record={game.away_record} />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 18,
                paddingTop: 0,
              }}
            >
              <ScoreOrb score={game.excitement_score} tierKey={tierKey} />
              <SVGPill
                text={tierLabel.replace(/^[^ ]+ /, '')}
                emoji={tierLabel.split(' ')[0]}
                fontSize={14}
                height={32}
                paddingX={16}
                letterSpacingEm={0.14}
                fill={`${t.accent}26`}
                stroke={`${t.accent}66`}
                textColor="#ffffff"
              />
            </div>

            <TeamColumn abbr={game.home_team} record={game.home_record} />
          </div>

          {/* Final score (revealed) */}
          {showScore && game.final_score && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                marginTop: 22,
              }}
            >
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                {game.final_score.replace(/\s+/g, ' ').replace(/-/g, '–')}
              </div>
              {game.is_overtime && (
                <SVGPill
                  text="OT"
                  fontSize={12}
                  height={26}
                  paddingX={12}
                  letterSpacingEm={0.2}
                  fill="rgba(167,139,250,0.18)"
                  stroke="rgba(167,139,250,0.55)"
                  textColor="#c4b5fd"
                />
              )}
            </div>
          )}

          {/* Series summary divider */}
          {game.series_summary && (
            <div style={{ marginTop: showScore ? 18 : 26 }}>
              <CenteredDivider text={game.series_summary} />
            </div>
          )}

          {/* Tags row */}
          {tags.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                marginTop: 16,
              }}
            >
              {tags.map(tag => {
                const info = getTagInfo(tag)
                return (
                  <SVGPill
                    key={tag}
                    text={info.label}
                    emoji={info.icon}
                    fontSize={11}
                    height={24}
                    paddingX={10}
                    letterSpacingEm={0.08}
                    fill={info.bgColor}
                    stroke={`${info.color}40`}
                    textColor={info.color}
                  />
                )
              })}
            </div>
          )}

          {/* Tagline + subtitle (pinned-ish near footer) */}
          <div style={{ marginTop: 'auto', textAlign: 'center', paddingTop: 18 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: '#e2e8f0',
                fontStyle: 'italic',
                lineHeight: 1.2,
              }}
            >
              {showScore ? '"Now you know."' : `"${t.tagline}"`}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#64748b',
                marginTop: 6,
                letterSpacing: '0.02em',
              }}
            >
              Spoiler-free NBA watchability ratings — pick your game without seeing the score.
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                fontWeight: 700,
                color: '#475569',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              {game.venue_name ? (
                <>
                  <span style={{ fontSize: 13 }}>📍</span>
                  <span style={{ paddingLeft: '0.22em' }}>{game.venue_name}</span>
                </>
              ) : (
                <span style={{ paddingLeft: '0.22em' }}>
                  {variant === 'spoiler-free' ? 'Score hidden' : 'Final shared'}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: t.accent,
                letterSpacing: '-0.01em',
              }}
            >
              nitzb.github.io/nba-spoiler-free →
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

ShareCard.displayName = 'ShareCard'
export default ShareCard
