import type { Player, Match, Pool } from '../types';

export interface PlayerStats {
  playerId: string;
  name: string;
  poolLabel: string;
  MP: number;
  PF: number;
  PA: number;
  Diff: number;
  W: number;
  L: number;
  WinPct: number;
}

export function generateLeaderboard(players: Player[], pools: Pool[], matches: Match[]): PlayerStats[] {
  const completedMatches = matches.filter(m => m.status === 'complete');
  
  const statsMap = new Map<string, PlayerStats>();
  
  players.forEach(p => {
    const pool = pools.find(pl => pl.id === p.poolId);
    statsMap.set(p.id, {
      playerId: p.id,
      name: p.name,
      poolLabel: pool ? pool.label : 'Unknown',
      MP: 0,
      PF: 0,
      PA: 0,
      Diff: 0,
      W: 0,
      L: 0,
      WinPct: 0
    });
  });

  completedMatches.forEach(match => {
    const scoreA = match.teamAScore || 0;
    const scoreB = match.teamBScore || 0;
    
    match.players.forEach(mp => {
      const stats = statsMap.get(mp.playerId);
      if (!stats) return;

      stats.MP += 1;
      
      const isTeamA = mp.team === 'A';
      const myScore = isTeamA ? scoreA : scoreB;
      const oppScore = isTeamA ? scoreB : scoreA;
      
      stats.PF += myScore;
      stats.PA += oppScore;
      stats.Diff = stats.PF - stats.PA;
      
      if (myScore > oppScore) stats.W += 1;
      else if (myScore < oppScore) stats.L += 1;
      
      stats.WinPct = (stats.W / stats.MP) * 100;
    });
  });

  // WinPct -> handled during map creation but it can be NaN if MP is 0.
  // Clean it up
  const result = Array.from(statsMap.values()).map(s => {
      s.WinPct = s.MP > 0 ? (s.W / s.MP) * 100 : 0;
      return s;
  });

  return result.sort((a, b) => {
    if (a.W !== b.W) return b.W - a.W;
    if (a.Diff !== b.Diff) return b.Diff - a.Diff;
    if (a.PF !== b.PF) return b.PF - a.PF;
    return a.name.localeCompare(b.name);
  });
}
