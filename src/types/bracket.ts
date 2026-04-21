export interface PlayoffSeries {
  id: string
  season: number
  conference: 'East' | 'West' | 'Finals'
  round: number
  series_id: string | null
  team1: string | null
  team2: string | null
  seed1: number | null
  seed2: number | null
  wins1: number
  wins2: number
  status: 'pre' | 'in' | 'post'
  winner: string | null
  last_game_date: string | null
  updated_at: string
}

export interface BracketRound {
  round: number
  label: string
  series: PlayoffSeries[]
}
