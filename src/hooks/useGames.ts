import { useState, useEffect } from 'react'
import { Game } from '../types/game'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

// ─── Mock data for development / when Supabase isn't configured ───────────────
const MOCK_GAMES: Game[] = [
  {
    id: '1',
    date: format(new Date(), 'yyyy-MM-dd'),
    home_team: 'BOS',
    away_team: 'LAL',
    excitement_score: 9.4,
    tags: ['Clutch Ending', 'Rivalry', 'Historic Performance'],
    final_score: '118-115',
    is_overtime: false,
    highlights_url: 'https://www.youtube.com/results?search_query=NBA+highlights',
    full_game_url: 'https://www.nba.com/watch',
    game_time_utc: new Date(new Date().setHours(0, 30, 0, 0)).toISOString(),
  },
  {
    id: '2',
    date: format(new Date(), 'yyyy-MM-dd'),
    home_team: 'GSW',
    away_team: 'OKC',
    excitement_score: 8.1,
    tags: ['High Scoring', 'Close Game'],
    final_score: '142-138',
    is_overtime: true,
    highlights_url: 'https://www.youtube.com/results?search_query=NBA+highlights',
    full_game_url: 'https://www.nba.com/watch',
    game_time_utc: new Date(new Date().setHours(3, 0, 0, 0)).toISOString(),
  },
  {
    id: '3',
    date: format(new Date(), 'yyyy-MM-dd'),
    home_team: 'MIA',
    away_team: 'NYK',
    excitement_score: 7.5,
    tags: ['Defensive Battle', 'Comeback', 'Playoff Implications'],
    final_score: '98-94',
    is_overtime: false,
    highlights_url: 'https://www.youtube.com/results?search_query=NBA+highlights',
    full_game_url: 'https://www.nba.com/watch',
    game_time_utc: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
  },
  {
    id: '4',
    date: format(new Date(), 'yyyy-MM-dd'),
    home_team: 'DEN',
    away_team: 'PHX',
    excitement_score: 6.2,
    tags: ['High Scoring'],
    final_score: '125-119',
    is_overtime: false,
    highlights_url: 'https://www.youtube.com/results?search_query=NBA+highlights',
    full_game_url: 'https://www.nba.com/watch',
    game_time_utc: new Date(new Date().setHours(2, 0, 0, 0)).toISOString(),
  },
  {
    id: '5',
    date: format(new Date(), 'yyyy-MM-dd'),
    home_team: 'CHI',
    away_team: 'DET',
    excitement_score: 3.8,
    tags: ['Blowout'],
    final_score: '134-98',
    is_overtime: false,
    highlights_url: null,
    full_game_url: 'https://www.nba.com/watch',
    game_time_utc: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
  },
  {
    id: '6',
    date: format(new Date(), 'yyyy-MM-dd'),
    home_team: 'MIN',
    away_team: 'DAL',
    excitement_score: 7.8,
    tags: ['OT', 'Clutch Ending', 'Playoff Implications'],
    final_score: '109-107',
    is_overtime: true,
    highlights_url: 'https://www.youtube.com/results?search_query=NBA+highlights',
    full_game_url: 'https://www.nba.com/watch',
    game_time_utc: new Date(new Date().setHours(2, 30, 0, 0)).toISOString(),
  },
]

// ─── Hook ─────────────────────────────────────────────────────────────────────
interface UseGamesResult {
  games: Game[]
  loading: boolean
  error: string | null
  isUsingMockData: boolean
  lastSyncTime: string | null
}

export function useGames(date: string): UseGamesResult {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUsingMockData, setIsUsingMockData] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchGames() {
      setLoading(true)
      setError(null)

      const hasCredentials =
        import.meta.env.VITE_SUPABASE_URL &&
        import.meta.env.VITE_SUPABASE_ANON_KEY

      if (!hasCredentials) {
        // Use mock data, filtered by date
        await new Promise(resolve => setTimeout(resolve, 800)) // simulate network
        if (!cancelled) {
          const today = format(new Date(), 'yyyy-MM-dd')
          const filteredMock = date === today ? MOCK_GAMES : []
          setGames(filteredMock)
          setIsUsingMockData(true)
          setLoading(false)
        }
        return
      }

      try {
        const { data, error: supabaseError } = await supabase
          .from('nba_daily_ranks')
          .select('*')
          .eq('date', date)

        if (!cancelled) {
          if (supabaseError) throw supabaseError
          
          const sorted = (data || []).sort((a, b) => {
            // 1. Scheduled / Live games go to the top
            const aActive = a.status === 'scheduled' || a.status === 'in_progress'
            const bActive = b.status === 'scheduled' || b.status === 'in_progress'
            
            if (aActive && !bActive) return -1
            if (!aActive && bActive) return 1
            
            // 2. If both are active, sort chronologically (earliest first)
            if (aActive && bActive) {
              return (a.game_time_utc || '').localeCompare(b.game_time_utc || '')
            }
            
            // 3. If both completed, sort by excitement score (highest first)
            return b.excitement_score - a.excitement_score
          })
          
          setGames(sorted)
          setIsUsingMockData(false)
          
          if (data && data.length > 0) {
            const hasUpdatedAt = data.some(g => g.updated_at)
            if (hasUpdatedAt) {
              const latestUpdatedAt = Math.max(...data.map(g => new Date(g.updated_at || g.created_at || 0).getTime()))
              if (latestUpdatedAt > 0) {
                setLastSyncTime(new Date(latestUpdatedAt).toISOString())
              }
            } else {
              setLastSyncTime(null)
            }
          } else {
            setLastSyncTime(null)
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Supabase fetch error:', err)
          setError("Couldn't reach server. Pull to refresh.")
          // Keep whatever games were already loaded — never replace real data
          // with mock data on a transient error.
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchGames()
    return () => { cancelled = true }
  }, [date])

  return { games, loading, error, isUsingMockData, lastSyncTime }
}
