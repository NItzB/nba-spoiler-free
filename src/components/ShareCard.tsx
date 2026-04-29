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

const TIER_VISUAL = {
  'must-watch': {
    label: 'MUST WATCH',
    accent: '#f97316',
    accentSoft: 'rgba(249, 115, 22, 0.4)',
    accentBorder: 'rgba(249, 115, 22, 0.5)',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
    glow: 'rgba(249, 115, 22, 0.4)',
    tagline: "Don't miss this one.",
  },
  'great': {
    label: 'GREAT GAME',
    accent: '#60a5fa',
    accentSoft: 'rgba(96, 165, 250, 0.35)',
    accentBorder: 'rgba(96, 165, 250, 0.5)',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
    glow: 'rgba(96, 165, 250, 0.35)',
    tagline: 'Worth your evening.',
  },
  'decent': {
    label: 'DECENT',
    accent: '#a78bfa',
    accentSoft: 'rgba(167, 139, 250, 0.3)',
    accentBorder: 'rgba(167, 139, 250, 0.45)',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    glow: 'rgba(167, 139, 250, 0.3)',
    tagline: 'Solid pick.',
  },
  'skip': {
    label: 'SKIP IT',
    accent: '#94a3b8',
    accentSoft: 'rgba(148, 163, 184, 0.25)',
    accentBorder: 'rgba(148, 163, 184, 0.4)',
    gradient: 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
    glow: 'rgba(148, 163, 184, 0.25)',
    tagline: 'Save your time.',
  },
} as const

// Tags that reveal the result/score and must NOT be shown on the spoiler-free card.
const SPOILER_TAGS = new Set([
  'High Scoring',
  'Defensive Battle',
  'Clutch Ending',
  'Close Game',
  'Star Performance',
  'Top Performer',
  'OT',
  'Blowout',
])

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags as string[]
  try { return JSON.parse((tags as string) || '[]') } catch { return [] }
}

function filterTagsForVariant(tags: string[], variant: 'spoiler-free' | 'spoiler-shown'): string[] {
  if (variant === 'spoiler-shown') return tags
  return tags.filter(t => !SPOILER_TAGS.has(t))
}

const LOGO_SIZE = 140

function TeamColumn({ abbr, record }: { abbr: string; record?: string }) {
  const team = getTeam(abbr)
  const Logo = (NBAIcons as Record<string, React.ComponentType<{ size?: number }>>)[team.abbreviation]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 280 }}>
      {/* Logo with colored fallback ring behind in case SVG fails to capture */}
      <div
        style={{
          width: LOGO_SIZE,
          height: LOGO_SIZE,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${team.primaryColor}33 0%, ${team.primaryColor}11 100%)`,
          border: `2px solid ${team.primaryColor}66`,
        }}
      >
        {/* Fallback abbr always rendered behind logo — visible only if logo fails */}
        <span
          style={{
            position: 'absolute',
            fontSize: 44,
            fontWeight: 900,
            color: team.primaryColor,
            opacity: 0.85,
            letterSpacing: '-0.02em',
          }}
        >
          {team.abbreviation}
        </span>
        {Logo && (
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Logo size={LOGO_SIZE - 12} />
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center', height: 90 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#cbd5e1', lineHeight: 1.1 }}>
          {team.city}
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 2 }}>
          {team.name.toUpperCase()}
        </div>
        {record && (
          <div style={{ fontSize: 18, fontWeight: 500, color: '#64748b', marginTop: 4 }}>
            {record}
          </div>
        )}
      </div>
    </div>
  )
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({ game, variant }, ref) => {
  const tier = getExcitementTier(game.excitement_score)
  const visual = TIER_VISUAL[tier]
  const showScore = variant === 'spoiler-shown' && !!game.final_score
  const allTags = parseTags(game.tags)
  const visibleTags = filterTagsForVariant(allTags, variant).slice(0, 3)

  const dateLabel = game.date
    ? (() => {
        try { return format(parseISO(game.date), 'MMM d, yyyy') } catch { return game.date }
      })()
    : ''

  return (
    <div
      ref={ref}
      style={{
        width: 1200,
        height: 630,
        position: 'relative',
        background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 60%, #020617 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: visual.gradient,
          zIndex: 3,
        }}
      />

      {/* Tier glow */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 800,
          height: 400,
          background: visual.glow,
          filter: 'blur(120px)',
          opacity: 0.6,
        }}
      />

      {/* Inner card with tier-color ring (decorative) */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          right: 20,
          bottom: 20,
          borderRadius: 22,
          border: `1.5px solid ${visual.accentBorder}`,
          boxShadow: `inset 0 0 60px ${visual.accentSoft}`,
          background: 'linear-gradient(180deg, rgba(15,23,42,0.4) 0%, rgba(2,6,23,0.6) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* OT badge top-right (spoiler-shown only) */}
      {showScore && game.is_overtime && (
        <div
          style={{
            position: 'absolute',
            top: 44,
            right: 44,
            padding: '5px 14px',
            borderRadius: 999,
            background: 'rgba(167, 139, 250, 0.18)',
            border: '1px solid rgba(167, 139, 250, 0.5)',
            color: '#ddd6fe',
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '0.18em',
            zIndex: 2,
          }}
        >
          OVERTIME
        </div>
      )}

      {/* Main content — explicit sections, no flex-grow */}
      <div
        style={{
          position: 'relative',
          width: 1200,
          height: 630,
          padding: '40px 64px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          boxSizing: 'border-box',
          zIndex: 1,
        }}
      >
        {/* Header — ~32px */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🏀</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>
              NBA Spoiler-Free
            </span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 500, color: '#64748b' }}>
            {dateLabel}
          </span>
        </div>

        {/* Teams + center column — fixed height ~280px */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 28,
            marginTop: 18,
            height: 270,
          }}
        >
          <TeamColumn abbr={game.away_team} record={game.away_record} />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              minWidth: 220,
              paddingTop: LOGO_SIZE / 2 - 30,
              gap: 8,
            }}
          >
            {showScore && game.final_score ? (
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  color: '#ffffff',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {game.final_score.replace(/\s+/g, ' ').replace(/-/g, '–')}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 60,
                  fontWeight: 800,
                  color: '#475569',
                  letterSpacing: '0.05em',
                  lineHeight: 1,
                }}
              >
                @
              </div>
            )}
            {showScore && game.series_summary && (
              <div
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.08)',
                  color: '#e2e8f0',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                {game.series_summary}
              </div>
            )}
          </div>

          <TeamColumn abbr={game.home_team} record={game.home_record} />
        </div>

        {/* Tags row — ~32px */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 14,
            minHeight: 30,
          }}
        >
          {visibleTags.map(tag => {
            const info = getTagInfo(tag)
            return (
              <span
                key={tag}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                  color: info.color,
                  background: info.bgColor,
                  border: `1px solid ${info.color}40`,
                }}
              >
                <span style={{ fontSize: 14 }}>{info.icon}</span>
                {info.label}
              </span>
            )
          })}
        </div>

        {/* Tier badge + tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              padding: '9px 22px',
              borderRadius: 999,
              background: visual.gradient,
              boxShadow: `0 8px 32px ${visual.glow}`,
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '0.18em',
              }}
            >
              {visual.label}
            </span>
            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.35)' }} />
            <span
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#ffffff',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {game.excitement_score.toFixed(1)}/10
            </span>
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: '#cbd5e1',
              fontStyle: 'italic',
            }}
          >
            {showScore ? '"Now you know."' : `"${visual.tagline}"`}
          </div>
        </div>

        {/* Footer row pinned to bottom: venue + URL */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingTop: 14,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            {game.venue_name ? (
              <>
                <span>📍</span>
                <span>{game.venue_name}</span>
              </>
            ) : (
              <span>{variant === 'spoiler-free' ? 'Score hidden' : 'Final shared'}</span>
            )}
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: visual.accent,
              letterSpacing: '-0.01em',
            }}
          >
            nitzb.github.io/nba-spoiler-free ↗
          </span>
        </div>
      </div>
    </div>
  )
})

ShareCard.displayName = 'ShareCard'
export default ShareCard
