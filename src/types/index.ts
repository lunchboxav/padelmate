export type SessionStatus = 'setup' | 'active' | 'finished';

export interface Player {
  id: string;
  name: string;
  poolId: string;
}

export interface Pool {
  id: string;
  label: string;
}

export interface Court {
  id: string;
  name: string;
}

export type MatchStatus = 'pending' | 'complete';

export interface MatchPlayer {
  playerId: string;
  team: 'A' | 'B';
  borrowed: boolean;
}

export interface Match {
  id: string;
  roundNo: number;
  courtId: string;
  status: MatchStatus;
  teamAScore?: number;
  teamBScore?: number;
  players: MatchPlayer[];
  borrowedPlayerId?: string | null;
  playedAt?: number;
}

export interface Session {
  id: string;
  label: string;
  status: SessionStatus;
  createdAt: number;
  pools: Pool[];
  courts: Court[];
  players: Player[];
  matches: Match[];
}

export interface SessionIndexEntry {
  id: string;
  label: string;
  createdAt: number;
  status: SessionStatus;
}
