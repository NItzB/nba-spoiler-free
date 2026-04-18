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
  game_time_utc: string | null;
  created_at?: string;
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
}
