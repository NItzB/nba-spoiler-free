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
  recap_sources?: RecapSource[] | null;
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
  plays_data?: any[];
  boxscore_data?: any;
  nwi_breakdown?: NwiBreakdown | null;
  created_at?: string;
  updated_at?: string;
}

export type ExcitementTier = 'must-watch' | 'banger' | 'great' | 'solid' | 'decent' | 'skip';

// Ordered list of YouTube recap candidates, written by score_agent.py.
// VideoModal walks them in region-aware priority order and falls back when
// YouTube blocks an embed (geo-restriction, takedown, etc.).
export interface RecapSource {
  source: 'motion-station' | 'nba-official' | string;  // future-proof for more channels
  video_id: string;
}

// Nitz Watchability Index — sub-scores all 0–100. Any sub-score may be null
// when the underlying data wasn't available for that game.
// Final nwi = nwi_base (weighted gameplay blend) + bonuses, clamped to [0, 100].
export interface NwiBreakdown {
  nwi: number;
  nwi_base?: number;
  gei: number | null;  // Game Excitement Index — win-prob volatility
  hsp: number | null;  // High-Stakes Pressure — Q4 close-game time
  cm:  number | null;  // Comeback / Drama — winner's deficit overcome OR lead erosion
  ofi: number | null;  // Offensive Fireworks — combined points vs. league
  bonuses?: {
    ot: number;        // +5 if overtime
    upset: number;     // 0–10, underdog wins by record differential
    star: number;      // 0–10, max single-game points (30/35/40/45 thresholds)
    stakes: number;    // 0/2/4/7 playoff context (regular playoff / G6 / G7-clincher-forcedG7)
    clutch: number;    // 0/1/3 final margin (≤5 / ≤3)
  };
}

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
