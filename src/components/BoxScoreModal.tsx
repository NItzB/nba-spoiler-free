import React, { useState } from 'react';
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

  if (!isOpen || !data || data.length === 0) return null;

  const currentTeamData = data[activeTeamIndex];
  const teamInfo = getTeam(currentTeamData.team);
  const Logo = (NBAIcons as any)[teamInfo.abbreviation];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-bg-card border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/5 rounded-xl border border-white/10">
              {Logo ? <Logo size={32} /> : <span className="text-xl font-black">{currentTeamData.team}</span>}
            </div>
            <div>
              <h2 className="text-xl font-black text-white leading-tight">{teamInfo.city} {teamInfo.name}</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Player Statistics</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Team Selector Tabs */}
        <div className="flex bg-white/3 border-b border-white/5">
          {data.map((teamBox, idx) => {
            const team = getTeam(teamBox.team);
            const isActive = activeTeamIndex === idx;
            return (
              <button
                key={teamBox.team}
                onClick={() => setActiveTeamIndex(idx)}
                className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-widest transition-all ${
                  isActive 
                    ? 'text-white border-b-2 border-orange-500 bg-white/5' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/2'
                }`}
              >
                {team.name}
              </button>
            );
          })}
        </div>

        {/* Stats Table Wrapper */}
        <div className="flex-1 overflow-auto custom-scrollbar p-1">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="sticky top-0 bg-bg-card z-10 shadow-sm">
              <tr className="text-[10px] uppercase font-bold text-slate-500 border-b border-white/5">
                <th className="py-3 px-4 sticky left-0 bg-bg-card">Player</th>
                <th className="py-3 px-2">MIN</th>
                <th className="py-3 px-2">PTS</th>
                <th className="py-3 px-2">FG</th>
                <th className="py-3 px-2">3PT</th>
                <th className="py-3 px-2">REB</th>
                <th className="py-3 px-2">AST</th>
                <th className="py-3 px-2">STL</th>
                <th className="py-3 px-2">BLK</th>
                <th className="py-3 px-2">TO</th>
                <th className="py-3 px-2">+/-</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentTeamData.players.map((p, i) => (
                <tr key={i} className={`hover:bg-white/2 transition-colors border-b border-white/5 ${!p.active ? 'opacity-40' : ''}`}>
                  <td className="py-3 px-4 sticky left-0 bg-bg-card/95 backdrop-blur-sm">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white truncate">{p.name}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{p.pos}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-xs font-medium text-slate-300">{p.min || '--'}</td>
                  <td className="py-3 px-2 text-sm font-black text-white">{p.pts || '0'}</td>
                  <td className="py-3 px-2 text-xs font-medium text-slate-400">{p.fg || '--'}</td>
                  <td className="py-3 px-2 text-xs font-medium text-slate-400">{p["3pt"] || '--'}</td>
                  <td className="py-3 px-2 text-xs font-bold text-slate-300">{p.reb || '0'}</td>
                  <td className="py-3 px-2 text-xs font-bold text-slate-300">{p.ast || '0'}</td>
                  <td className="py-3 px-2 text-xs font-medium text-slate-400">{p.stl || '0'}</td>
                  <td className="py-3 px-2 text-xs font-medium text-slate-400">{p.blk || '0'}</td>
                  <td className="py-3 px-2 text-xs font-medium text-slate-400">{p.to || '0'}</td>
                  <td className={`py-3 px-2 text-xs font-black ${
                    parseInt(p.plus_minus || '0') > 0 ? 'text-green-400' : 
                    parseInt(p.plus_minus || '0') < 0 ? 'text-red-400' : 'text-slate-500'
                  }`}>
                    {parseInt(p.plus_minus || '0') > 0 ? '+' : ''}{p.plus_minus || '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-white/2 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            Individual Player Statistics • Data powered by ESPN
          </p>
        </div>
      </div>
    </div>
  );
}
