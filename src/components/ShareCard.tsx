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

// Match TIER_CONFIG / accent colors from tailwind.config.js
const TIER_VISUAL = {
  'must-watch': {
    label: '🔥 Must Watch',
    accent: '#ff6b35',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #f97316 100%)',
    tagline: "Don't miss this one.",
  },
  'great': {
    label: '⭐ Great Game',
    accent: '#4a9eff',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
    tagline: 'Worth your evening.',
  },
  'decent': {
    label: '👍 Decent',
    accent: '#a78bfa',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    tagline: 'Solid pick.',
  },
  'skip': {
    label: '💤 Skip it',
    accent: '#475569',
    gradient: 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
    tagline: 'Save your time.',
  },
} as const

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

const LOGO_SIZE = 150

function TeamColumn({ abbr, record }: { abbr: string; record?: string }) {
  const team = getTeam(abbr)
  const Logo = (NBAIcons as Record<string, React.ComponentType<{ size?: number }>>)[team.abbreviation]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 280 }}>
      <div
        style={{
          width: LOGO_SIZE,
          height: LOGO_SIZE,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {Logo ? (
          <div style={{ position: 'relative', zIndex: 1, lineHeight: 0 }}>
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
              fontSize: 48,
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            {team.abbreviation}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: '#94a3b8', lineHeight: 1.1 }}>
          {team.city}
        </div>
        <div style={{ fontSize: 38, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.1, marginTop: 4 }}>
          {team.name}
        </div>
        {record && (
          <div style={{ fontSize: 18, fontWeight: 700, color: '#64748b', marginTop: 8 }}>
            {record}
          </div>
        )}
      </div>
    </div>
  )
}

function ExcitementCircle({ score, tier }: { score: number; tier: keyof typeof TIER_VISUAL }) {
  const visual = TIER_VISUAL[tier]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 130,
          height: 130,
          borderRadius: '50%',
          background: visual.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 0 3px ${visual.accent}55, 0 8px 32px ${visual.accent}40`,
          lineHeight: 0,
        }}
      >
        <span
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: '#ffffff',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
            display: 'block',
            textAlign: 'center',
          }}
        >
          {score.toFixed(1)}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '5px 18px',
          borderRadius: 999,
          background: `${visual.accent}26`,
          border: `1px solid ${visual.accent}55`,
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          textIndent: '0.14em',
        }}
      >
        {visual.label}
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
        background: '#0a0a1a',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: 28,
      }}
    >
      {/* Inner card — solid bg-card #16163a, matches app */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: '#16163a',
          borderRadius: 24,
          boxShadow: `0 0 0 1.5px ${visual.accent}66, 0 4px 24px rgba(0,0,0,0.4)`,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Top accent bar — matches app's top gradient strip */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: visual.gradient,
            zIndex: 2,
          }}
        />

        {/* OT badge top-right (spoiler-shown only) */}
        {showScore && game.is_overtime && (
          <div
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px 14px',
              borderRadius: 999,
              background: 'rgba(167, 139, 250, 0.18)',
              border: '1px solid rgba(167, 139, 250, 0.5)',
              color: '#c4b5fd',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.18em',
              textIndent: '0.18em',
              zIndex: 3,
            }}
          >
            OT
          </div>
        )}

        {/* Content */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            padding: '32px 56px 28px',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            zIndex: 1,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 26 }}>🏀</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>
                NBA Spoiler-Free
              </span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 500, color: '#64748b' }}>
              {dateLabel}
            </span>
          </div>

          {/* Teams row + center excitement */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: 24,
              marginTop: 16,
            }}
          >
            <TeamColumn abbr={game.away_team} record={game.away_record} />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: 10,
                width: 200,
              }}
            >
              <ExcitementCircle score={game.excitement_score} tier={tier} />
            </div>

            <TeamColumn abbr={game.home_team} record={game.home_record} />
          </div>

          {/* Final score row (spoiler-shown only) */}
          {showScore && game.final_score && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                marginTop: 14,
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                {game.final_score.replace(/\s+/g, ' ').replace(/-/g, '–')}
              </div>
              {game.series_summary && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px 12px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.1)',
                    color: '#cbd5e1',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    textIndent: '0.16em',
                  }}
                >
                  {game.series_summary}
                </div>
              )}
            </div>
          )}

          {/* Tags row */}
          {visibleTags.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: showScore ? 14 : 18,
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
                      fontWeight: 500,
                      color: info.color,
                      background: info.bgColor,
                      border: `1px solid ${info.color}30`,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{info.icon}</span>
                    {info.label}
                  </span>
                )
              })}
            </div>
          )}

          {/* Tagline */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: '#94a3b8',
              fontStyle: 'italic',
              textAlign: 'center',
              marginTop: 16,
            }}
          >
            {showScore ? '"Now you know."' : `"${visual.tagline}"`}
          </div>

          {/* Footer: venue + URL — pinned to bottom */}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              paddingTop: 14,
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: '#64748b',
                letterSpacing: '0.18em',
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
                fontSize: 15,
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
    </div>
  )
})

ShareCard.displayName = 'ShareCard'
export default ShareCard
