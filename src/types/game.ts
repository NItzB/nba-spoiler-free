export interface Game {
  id: string;
  date: string;
  home_team: string;
  away_team: string;
  excitement_score: number;
  tags: string[];
  final_score: string | null;
  is_overtime: boolean;
  highlights_url: string | null;
  full_game_url: string | null;
  recap_video_id?: string | null;
  game_time_utc: string | null;
  status?: string;
  series_summary?: string | null;
  home_record?: string;
  away_record?: string;
  venue_name?: string;
  live_period?: number;
  live_clock?: string;
  game_recap?: string;
  home_leaders?: any;
  away_leaders?: any;
  home_line?: any[];
  away_line?: any[];
  winprobability_data?: any[];
  boxscore_data?: any;
  created_at?: string;
  updated_at?: string;
}

export type ExcitementTier = 'must-watch' | 'great' | 'decent' | 'skip';

export interface TeamInfo {
  name: string;
  city: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface TagInfo {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  explanation: string;
}
