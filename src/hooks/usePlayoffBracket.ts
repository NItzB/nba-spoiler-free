import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { PlayoffSeries, BracketRound } from '../types/bracket'

const ROUND_LABELS: Record<number, string> = {
  1: 'First Round',
  2: 'Semifinals',
  3: 'Conf. Finals',
  4: 'NBA Finals',
}

interface UsePlayoffBracketResult {
  eastRounds: BracketRound[]
  westRounds: BracketRound[]
  finals: PlayoffSeries | null
  loading: boolean
  error: string | null
  season: number
  lastUpdated: string | null
}

export function usePlayoffBracket(): UsePlayoffBracketResult {
  const [allSeries, setAllSeries] = useState<PlayoffSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const season = new Date().getFullYear()

  useEffect(() => {
    let cancelled = false
    async function fetchBracket() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('playoff_series')
          .select('*')
          .eq('season', season)
          .order('round', { ascending: true })

        if (!cancelled) {
          if (err) throw err
          setAllSeries(data || [])
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error('Bracket fetch error:', e)
          setError('Failed to load bracket data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchBracket()
    return () => { cancelled = true }
  }, [season])

  const buildRounds = (conf: 'East' | 'West'): BracketRound[] => {
    const confSeries = allSeries.filter(s => s.conference === conf)
    // Always include all 3 rounds — empty rounds show TBD placeholders
    return [1, 2, 3].map(r => ({
      round: r,
      label: ROUND_LABELS[r],
      series: confSeries.filter(s => s.round === r),
    }))
  }

  const lastUpdated = allSeries.length > 0
    ? allSeries.reduce((latest, s) => s.updated_at > latest ? s.updated_at : latest, '')
    : null

  return {
    eastRounds: buildRounds('East'),
    westRounds: buildRounds('West'),
    finals: allSeries.find(s => s.conference === 'Finals') ?? null,
    loading,
    error,
    season,
    lastUpdated,
  }
}

// Returns the "viewing date" — same logic as the main app's date picker default.
// A series whose last_game_date >= this date is considered a potential spoiler.
export function getViewingDate(): string {
  const now = new Date()
  if (now.getHours() < 12) {
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    return format(yesterday, 'yyyy-MM-dd')
  }
  return format(now, 'yyyy-MM-dd')
}

export function isSeriesSpoiler(series: PlayoffSeries): boolean {
  if (!series.last_game_date) return false
  return series.last_game_date >= getViewingDate()
}
