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

function TeamColumn({ abbr, record, size = 170 }: { abbr: string; record?: string; size?: number }) {
  const team = getTeam(abbr)
  const Logo = (NBAIcons as Record<string, React.ComponentType<{ size?: number }>>)[team.abbreviation]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, flex: 1 }}>
      {Logo ? (
        <Logo size={size} />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: team.primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 900,
            fontSize: 48,
          }}
        >
          {abbr}
        </div>
      )}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: '#cbd5e1', lineHeight: 1.1 }}>
          {team.city}
        </div>
        <div style={{ fontSize: 46, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          {team.name.toUpperCase()}
        </div>
        {record && (
          <div style={{ fontSize: 20, fontWeight: 500, color: '#64748b', marginTop: 6 }}>
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
  const visibleTags = filterTagsForVariant(allTags, variant).slice(0, 4)

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

      {/* Inner card with tier-color ring */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          right: 24,
          bottom: 24,
          borderRadius: 24,
          border: `1.5px solid ${visual.accentBorder}`,
          boxShadow: `inset 0 0 80px ${visual.accentSoft}, 0 0 0 1px rgba(255,255,255,0.04)`,
          background: 'linear-gradient(180deg, rgba(15,23,42,0.4) 0%, rgba(2,6,23,0.6) 100%)',
        }}
      />

      {/* OT badge top-right (spoiler-shown only) */}
      {showScore && game.is_overtime && (
        <div
          style={{
            position: 'absolute',
            top: 48,
            right: 48,
            padding: '6px 16px',
            borderRadius: 999,
            background: 'rgba(167, 139, 250, 0.18)',
            border: '1px solid rgba(167, 139, 250, 0.5)',
            color: '#ddd6fe',
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: '0.18em',
            zIndex: 2,
          }}
        >
          OVERTIME
        </div>
      )}

      {/* Main content */}
      <div
        style={{
          position: 'relative',
          height: '100%',
          padding: '52px 64px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>🏀</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>
              NBA Spoiler-Free
            </span>
          </div>
          <span style={{ fontSize: 20, fontWeight: 500, color: '#64748b' }}>
            {dateLabel}
          </span>
        </div>

        {/* Teams + score */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 32,
            marginTop: 8,
          }}
        >
          <TeamColumn abbr={game.away_team} record={game.away_record} />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 220,
              gap: 10,
            }}
          >
            {showScore && game.final_score ? (
              <div
                style={{
                  fontSize: 76,
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
                  fontSize: 72,
                  fontWeight: 800,
                  color: '#475569',
                  letterSpacing: '0.05em',
                }}
              >
                @
              </div>
            )}
            {showScore && game.series_summary && (
              <div
                style={{
                  padding: '5px 14px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.08)',
                  color: '#e2e8f0',
                  fontSize: 14,
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

        {/* Tags row */}
        {visibleTags.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
              marginBottom: 12,
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
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontSize: 16,
                    fontWeight: 600,
                    color: info.color,
                    background: info.bgColor,
                    border: `1px solid ${info.color}40`,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{info.icon}</span>
                  {info.label}
                </span>
              )
            })}
          </div>
        )}

        {/* Tier badge + tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 16,
              padding: '11px 26px',
              borderRadius: 999,
              background: visual.gradient,
              boxShadow: `0 8px 32px ${visual.glow}`,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '0.18em',
              }}
            >
              {visual.label}
            </span>
            <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.35)' }} />
            <span
              style={{
                fontSize: 22,
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
              fontSize: 22,
              fontWeight: 500,
              color: '#cbd5e1',
              fontStyle: 'italic',
            }}
          >
            {showScore ? '"Now you know."' : `"${visual.tagline}"`}
          </div>
        </div>

        {/* Venue */}
        {game.venue_name && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 14,
              fontSize: 14,
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ fontSize: 14 }}>📍</span>
            <span>{game.venue_name}</span>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500, color: '#475569' }}>
            {variant === 'spoiler-free' ? 'Score hidden · Watchability rated' : 'Spoiler shared'}
          </span>
          <span
            style={{
              fontSize: 18,
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
