import { TeamInfo, TagInfo } from '../types/game';

export const TEAMS: Record<string, TeamInfo> = {
  ATL: { abbreviation: 'ATL', city: 'Atlanta', name: 'Hawks', primaryColor: '#C1312F', secondaryColor: '#9D2235' },
  BOS: { abbreviation: 'BOS', city: 'Boston', name: 'Celtics', primaryColor: '#007A33', secondaryColor: '#BA9653' },
  BKN: { abbreviation: 'BKN', city: 'Brooklyn', name: 'Nets', primaryColor: '#FFFFFF', secondaryColor: '#000000' },
  CHA: { abbreviation: 'CHA', city: 'Charlotte', name: 'Hornets', primaryColor: '#1D1160', secondaryColor: '#00788C' },
  CHI: { abbreviation: 'CHI', city: 'Chicago', name: 'Bulls', primaryColor: '#CE1141', secondaryColor: '#000000' },
  CLE: { abbreviation: 'CLE', city: 'Cleveland', name: 'Cavaliers', primaryColor: '#860038', secondaryColor: '#041E42' },
  DAL: { abbreviation: 'DAL', city: 'Dallas', name: 'Mavericks', primaryColor: '#00538C', secondaryColor: '#002B5E' },
  DEN: { abbreviation: 'DEN', city: 'Denver', name: 'Nuggets', primaryColor: '#0E2240', secondaryColor: '#FEC524' },
  DET: { abbreviation: 'DET', city: 'Detroit', name: 'Pistons', primaryColor: '#C8102E', secondaryColor: '#1D42BA' },
  GSW: { abbreviation: 'GSW', city: 'Golden State', name: 'Warriors', primaryColor: '#1D428A', secondaryColor: '#FFC72C' },
  HOU: { abbreviation: 'HOU', city: 'Houston', name: 'Rockets', primaryColor: '#CE1141', secondaryColor: '#000000' },
  IND: { abbreviation: 'IND', city: 'Indiana', name: 'Pacers', primaryColor: '#002D62', secondaryColor: '#FDBB30' },
  LAC: { abbreviation: 'LAC', city: 'LA', name: 'Clippers', primaryColor: '#C8102E', secondaryColor: '#1D428A' },
  LAL: { abbreviation: 'LAL', city: 'LA', name: 'Lakers', primaryColor: '#552583', secondaryColor: '#FDB927' },
  MEM: { abbreviation: 'MEM', city: 'Memphis', name: 'Grizzlies', primaryColor: '#5D76A9', secondaryColor: '#12173F' },
  MIA: { abbreviation: 'MIA', city: 'Miami', name: 'Heat', primaryColor: '#98002E', secondaryColor: '#F9A01B' },
  MIL: { abbreviation: 'MIL', city: 'Milwaukee', name: 'Bucks', primaryColor: '#00471B', secondaryColor: '#EEE1C6' },
  MIN: { abbreviation: 'MIN', city: 'Minnesota', name: 'Timberwolves', primaryColor: '#0C2340', secondaryColor: '#236192' },
  NOP: { abbreviation: 'NOP', city: 'New Orleans', name: 'Pelicans', primaryColor: '#0C2340', secondaryColor: '#C8102E' },
  NYK: { abbreviation: 'NYK', city: 'New York', name: 'Knicks', primaryColor: '#006BB6', secondaryColor: '#F58426' },
  OKC: { abbreviation: 'OKC', city: 'Oklahoma City', name: 'Thunder', primaryColor: '#007AC1', secondaryColor: '#EF3B24' },
  ORL: { abbreviation: 'ORL', city: 'Orlando', name: 'Magic', primaryColor: '#0077C0', secondaryColor: '#000000' },
  PHI: { abbreviation: 'PHI', city: 'Philadelphia', name: '76ers', primaryColor: '#006BB6', secondaryColor: '#ED174C' },
  PHX: { abbreviation: 'PHX', city: 'Phoenix', name: 'Suns', primaryColor: '#1D1160', secondaryColor: '#E56020' },
  POR: { abbreviation: 'POR', city: 'Portland', name: 'Trail Blazers', primaryColor: '#E03A3E', secondaryColor: '#000000' },
  SAC: { abbreviation: 'SAC', city: 'Sacramento', name: 'Kings', primaryColor: '#5A2D81', secondaryColor: '#63727A' },
  SAS: { abbreviation: 'SAS', city: 'San Antonio', name: 'Spurs', primaryColor: '#C4CED4', secondaryColor: '#000000' },
  TOR: { abbreviation: 'TOR', city: 'Toronto', name: 'Raptors', primaryColor: '#CE1141', secondaryColor: '#000000' },
  UTA: { abbreviation: 'UTA', city: 'Utah', name: 'Jazz', primaryColor: '#002B5C', secondaryColor: '#F9A01B' },
  WAS: { abbreviation: 'WAS', city: 'Washington', name: 'Wizards', primaryColor: '#002B5C', secondaryColor: '#E31837' },
};

export const TAGS: Record<string, TagInfo> = {
  'High Scoring': { label: 'High Scoring', icon: '🏀', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.15)' },
  'Defensive Battle': { label: 'Defensive Battle', icon: '🛡️', color: '#94a3b8', bgColor: 'rgba(148,163,184,0.15)' },
  'Clutch Ending': { label: 'Clutch Ending', icon: '⚡', color: '#ff6b35', bgColor: 'rgba(255,107,53,0.15)' },
  'OT': { label: 'OT', icon: '⏱️', color: '#a78bfa', bgColor: 'rgba(167,139,250,0.15)' },
  'Blowout': { label: 'Blowout', icon: '💨', color: '#64748b', bgColor: 'rgba(100,116,139,0.15)' },
  'Rivalry': { label: 'Rivalry', icon: '🔥', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)' },
  'Star Performance': { label: 'Star Player', icon: '⭐', color: '#facc15', bgColor: 'rgba(250,204,21,0.15)' },
  'Live': { label: 'Live Action', icon: '🔴', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)' },
  'Upcoming': { label: 'Scheduled', icon: '🗓️', color: '#fcd34d', bgColor: 'rgba(252,211,77,0.15)' }
};

export const getTeam = (abbr: string): TeamInfo => {
  const normalizedAbbr = abbr === 'NY' ? 'NYK' : abbr === 'SA' ? 'SAS' : abbr === 'NO' ? 'NOP' : abbr;
  return TEAMS[normalizedAbbr] || { abbreviation: normalizedAbbr, city: '', name: normalizedAbbr, primaryColor: '#4a4a8a', secondaryColor: '#2d2d5e' };
};

export const getTagInfo = (tag: string): TagInfo => {
  return TAGS[tag] || { label: tag, icon: '📌', color: '#94a3b8', bgColor: 'rgba(148,163,184,0.15)' };
};
