import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getTeam } from '../lib/teams';
import * as NBAIcons from 'react-nba-logos';

interface PlayerStat {
  name: string;
  pos: string;
  min?: string;
  pts?: string;
  fg?: string;
  "3pt"?: string;
  ft?: string;
  reb?: string;
  ast?: string;
  stl?: string;
  blk?: string;
  to?: string;
  plus_minus?: string;
  active?: boolean;
  starter?: boolean;
}

interface TeamBoxScore {
  team: string;
  players: PlayerStat[];
}

interface BoxScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TeamBoxScore[];
}

export default function BoxScoreModal({ isOpen, onClose, data }: BoxScoreModalProps) {
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);

  // Lock body scroll and handle Esc key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !data || data.length === 0) return null;

  const currentTeamData = data[activeTeamIndex];
  const teamInfo = getTeam(currentTeamData.team);
  const Logo = (NBAIcons as any)[teamInfo.abbreviation];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 md:p-12">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-5xl bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 overflow-hidden ring-1 ring-white/10">
        
        {/* Header */}
        <div className="p-5 sm:p-8 border-b border-white/5 flex items-center justify-between gap-4 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-lg">
              {Logo ? <Logo size={40} /> : <span className="text-2xl font-black">{currentTeamData.team}</span>}
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                {teamInfo.city} {teamInfo.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">Game Statistics</p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all hover:scale-110 active:scale-90"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Team Selector Tabs */}
        <div className="flex bg-white/3 p-2 gap-2 border-b border-white/5">
          {data.map((teamBox, idx) => {
            const team = getTeam(teamBox.team);
            const isActive = activeTeamIndex === idx;
            return (
              <button
                key={teamBox.team}
                onClick={() => setActiveTeamIndex(idx)}
                className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  isActive 
                    ? 'text-white bg-orange-500 shadow-fire ring-1 ring-orange-400/50' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {team.name}
              </button>
            );
          })}
        </div>

        {/* Stats Table Wrapper */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-[#0f172a] z-10">
              <tr className="text-[10px] uppercase font-bold text-slate-500 border-b border-white/10">
                <th className="py-4 px-6 sticky left-0 bg-[#0f172a]">Player</th>
                <th className="py-4 px-3">MIN</th>
                <th className="py-4 px-3">PTS</th>
                <th className="py-4 px-3">FG</th>
                <th className="py-4 px-3">3PT</th>
                <th className="py-4 px-3">FT</th>
                <th className="py-4 px-3">REB</th>
                <th className="py-4 px-3">AST</th>
                <th className="py-4 px-3">STL</th>
                <th className="py-4 px-3">BLK</th>
                <th className="py-4 px-3 text-right pr-8">+/-</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {/* Starters Section */}
              <tr className="bg-white/5">
                <td colSpan={11} className="py-2 px-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400">Starting Lineup</span>
                </td>
              </tr>
              {currentTeamData.players.filter(p => p.starter).map((p, i) => (
                <PlayerRow key={`starter-${i}`} p={p} />
              ))}

              {/* Bench Section */}
              <tr className="bg-white/5 border-t border-white/10">
                <td colSpan={11} className="py-2 px-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Bench</span>
                </td>
              </tr>
              {currentTeamData.players.filter(p => !p.starter).map((p, i) => (
                <PlayerRow key={`bench-${i}`} p={p} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">
            Official Individual Game Statistics • Powered by ESPN
          </p>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
        </div>
      </div>
    </div>,
    document.body
  );
}

function PlayerRow({ p }: { p: PlayerStat }) {
  return (
    <tr className="hover:bg-white/[0.07] transition-colors border-b border-white/[0.03]">
      <td className="py-4 px-6 sticky left-0 bg-[#0f172a]/98 backdrop-blur-md z-10">
        <div className="flex flex-col">
          <span className="text-sm font-black text-white tracking-tight leading-tight">{p.name}</span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mt-0.5">{p.pos}</span>
        </div>
      </td>
      <td className="py-4 px-3 text-xs font-black text-slate-200">{p.min || '--'}</td>
      <td className="py-4 px-3 text-sm font-black text-white scale-110 origin-left">{p.pts || '0'}</td>
      <td className="py-4 px-3 text-xs font-black text-slate-100">{p.fg || '--'}</td>
      <td className="py-4 px-3 text-xs font-black text-slate-100">{p["3pt"] || '--'}</td>
      <td className="py-4 px-3 text-xs font-black text-slate-100">{p.ft || '--'}</td>
      <td className="py-4 px-3 text-xs font-black text-white">{p.reb || '0'}</td>
      <td className="py-4 px-3 text-xs font-black text-white">{p.ast || '0'}</td>
      <td className="py-4 px-3 text-[11px] font-black text-slate-100">{p.stl || '0'}</td>
      <td className="py-4 px-3 text-[11px] font-black text-slate-100">{p.blk || '0'}</td>
      <td className={`py-4 px-3 text-right pr-8 text-xs font-black ${
        parseInt(p.plus_minus || '0') > 0 ? 'text-green-400' : 
        parseInt(p.plus_minus || '0') < 0 ? 'text-red-400' : 'text-slate-100'
      }`}>
        {parseInt(p.plus_minus || '0') > 0 ? '+' : ''}{p.plus_minus || '0'}
      </td>
    </tr>
  );
}

