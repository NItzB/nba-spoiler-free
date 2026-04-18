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
}

export function useGames(date: string): UseGamesResult {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUsingMockData, setIsUsingMockData] = useState(false)

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
          setGames(filteredMock.sort((a, b) => b.excitement_score - a.excitement_score))
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
          .order('excitement_score', { ascending: false })

        if (!cancelled) {
          if (supabaseError) throw supabaseError
          setGames(data || [])
          setIsUsingMockData(false)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Supabase fetch error:', err)
          setError('Failed to load games. Showing demo data.')
          // Fall back to mock data
          const today = format(new Date(), 'yyyy-MM-dd')
          const filteredMock = date === today ? MOCK_GAMES : []
          setGames(filteredMock.sort((a, b) => b.excitement_score - a.excitement_score))
          setIsUsingMockData(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchGames()
    return () => { cancelled = true }
  }, [date])

  return { games, loading, error, isUsingMockData }
}
