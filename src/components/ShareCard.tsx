import React, { forwardRef } from 'react'
import * as NBAIcons from 'react-nba-logos'
import { format, parseISO } from 'date-fns'
import { Game } from '../types/game'
import { getTeam } from '../lib/teams'
import { getExcitementTier } from './ExcitementBadge'

interface ShareCardProps {
  game: Game
  variant: 'spoiler-free' | 'spoiler-shown'
}

const TIER_VISUAL = {
  'must-watch': {
    label: 'MUST WATCH',
    accent: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
    glow: 'rgba(249, 115, 22, 0.4)',
    tagline: "Don't miss this one.",
  },
  'great': {
    label: 'GREAT GAME',
    accent: '#60a5fa',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
    glow: 'rgba(96, 165, 250, 0.35)',
    tagline: 'Worth your evening.',
  },
  'decent': {
    label: 'DECENT',
    accent: '#a78bfa',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    glow: 'rgba(167, 139, 250, 0.3)',
    tagline: 'Solid pick.',
  },
  'skip': {
    label: 'SKIP IT',
    accent: '#94a3b8',
    gradient: 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
    glow: 'rgba(148, 163, 184, 0.25)',
    tagline: 'Save your time.',
  },
} as const

function TeamColumn({ abbr, record, size = 180 }: { abbr: string; record?: string; size?: number }) {
  const team = getTeam(abbr)
  const Logo = (NBAIcons as Record<string, React.ComponentType<{ size?: number }>>)[team.abbreviation]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, flex: 1 }}>
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
        <div style={{ fontSize: 28, fontWeight: 600, color: '#cbd5e1', lineHeight: 1.1 }}>
          {team.city}
        </div>
        <div style={{ fontSize: 52, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          {team.name.toUpperCase()}
        </div>
        {record && (
          <div style={{ fontSize: 22, fontWeight: 500, color: '#64748b', marginTop: 8 }}>
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

      {/* Main content */}
      <div
        style={{
          position: 'relative',
          height: '100%',
          padding: '56px 64px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
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
          <span style={{ fontSize: 22, fontWeight: 500, color: '#64748b' }}>
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
            gap: 40,
            marginTop: 24,
          }}
        >
          <TeamColumn abbr={game.away_team} record={game.away_record} />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 200,
            }}
          >
            {showScore && game.final_score ? (
              <div
                style={{
                  fontSize: 84,
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
            {showScore && game.is_overtime && (
              <div
                style={{
                  marginTop: 12,
                  padding: '6px 16px',
                  borderRadius: 999,
                  background: 'rgba(167, 139, 250, 0.15)',
                  border: '1px solid rgba(167, 139, 250, 0.4)',
                  color: '#c4b5fd',
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                }}
              >
                OVERTIME
              </div>
            )}
          </div>

          <TeamColumn abbr={game.home_team} record={game.home_record} />
        </div>

        {/* Tier badge + tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 8 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 16,
              padding: '12px 28px',
              borderRadius: 999,
              background: visual.gradient,
              boxShadow: `0 8px 32px ${visual.glow}`,
            }}
          >
            <span
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '0.18em',
              }}
            >
              {visual.label}
            </span>
            <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.35)' }} />
            <span
              style={{
                fontSize: 24,
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
              fontSize: 24,
              fontWeight: 500,
              color: '#cbd5e1',
              fontStyle: 'italic',
            }}
          >
            {showScore ? '"Now you know."' : `"${visual.tagline}"`}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 24,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 500, color: '#475569' }}>
            {variant === 'spoiler-free' ? 'Score hidden · Watchability rated' : 'Spoiler shared'}
          </span>
          <span style={{ fontSize: 20, fontWeight: 600, color: '#94a3b8' }}>
            spoilerfree-nba ↗
          </span>
        </div>
      </div>
    </div>
  )
})

ShareCard.displayName = 'ShareCard'
export default ShareCard
