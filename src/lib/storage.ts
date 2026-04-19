import { supabase } from './supabase';
import type { Session, SessionIndexEntry, Match } from '../types';

export async function getSessionIndex(): Promise<SessionIndexEntry[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, label, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch session index', error);
    return [];
  }

  return (data || []).map(d => ({
    id: d.id,
    label: d.label,
    status: d.status as any,
    createdAt: d.created_at
  }));
}

export async function getSession(id: string): Promise<Session | null> {
  const { data: sessionData, error: sErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (sErr || !sessionData) return null;

  // We fetch dependent data explicitly to match JSON hierarchy constraints. 
  // RLS natively permits this for anonymous unauthed reads.
  const [courtsRes, poolsRes, playersRes, matchesRes] = await Promise.all([
    supabase.from('courts').select('*').eq('session_id', id),
    supabase.from('pools').select('*').eq('session_id', id),
    supabase.from('players').select('*').eq('session_id', id),
    supabase.from('matches').select('*').eq('session_id', id)
  ]);

  // Optimize grabbing match_players by just matching the session_id constraint via foreign bridge
  // But standard supabase client doesn't let us easily `.eq('matches.session_id')` without an inner join map.
  // Instead we can just select all match_players where match_id IN (matchesRes.ids)
  const matchIds = (matchesRes.data || []).map(m => m.id);
  const matchPlayersRes = matchIds.length > 0 
    ? await supabase.from('match_players').select('*').in('match_id', matchIds)
    : { data: [] };

  const matches: Match[] = (matchesRes.data || []).map(m => {
    const mps = (matchPlayersRes.data || []).filter(mp => mp.match_id === m.id).map(mp => ({
      playerId: mp.player_id,
      team: mp.team as 'A' | 'B',
      borrowed: mp.borrowed
    }));
    return {
      id: m.id,
      roundNo: m.round_no,
      courtId: m.court_id,
      status: m.status as any,
      teamAScore: m.team_a_score ?? undefined,
      teamBScore: m.team_b_score ?? undefined,
      borrowedPlayerId: m.borrowed_player_id,
      playedAt: m.played_at,
      players: mps
    };
  });

  return {
    id: sessionData.id,
    label: sessionData.label,
    status: sessionData.status as any,
    createdAt: sessionData.created_at,
    pools: (poolsRes.data || []).map(p => ({ id: p.id, label: p.label })),
    courts: (courtsRes.data || []).map(c => ({ id: c.id, name: c.name })),
    players: (playersRes.data || []).map(p => ({ id: p.id, name: p.name, poolId: p.pool_id })),
    matches,
  };
}

export async function pushSessionCreate(session: Session): Promise<void> {
  const { error } = await supabase.from('sessions').insert({
    id: session.id,
    label: session.label,
    status: session.status,
    created_at: session.createdAt
  });
  if (error) console.error(error);

  if (session.pools.length) {
    await supabase.from('pools').insert(session.pools.map(p => ({ id: p.id, session_id: session.id, label: p.label })));
  }
  if (session.courts.length) {
    await supabase.from('courts').insert(session.courts.map(c => ({ id: c.id, session_id: session.id, name: c.name })));
  }
  if (session.players.length) {
    await supabase.from('players').insert(session.players.map(p => ({ id: p.id, session_id: session.id, pool_id: p.poolId, name: p.name })));
  }
}

export async function pushSessionUpdateStatus(id: string, status: string): Promise<void> {
  await supabase.from('sessions').update({ status }).eq('id', id);
}

export async function pushMatchesInsert(sessionId: string, matches: Match[]): Promise<void> {
  if (!matches.length) return;
  await supabase.from('matches').insert(matches.map(m => ({
    id: m.id,
    session_id: sessionId,
    round_no: m.roundNo,
    court_id: m.courtId,
    status: m.status,
    borrowed_player_id: m.borrowedPlayerId || null,
    played_at: m.playedAt || null
  })));

  const matchPlayers = matches.flatMap(m => m.players.map(p => ({
    match_id: m.id,
    player_id: p.playerId,
    team: p.team,
    borrowed: p.borrowed
  })));

  if (matchPlayers.length > 0) {
    await supabase.from('match_players').insert(matchPlayers);
  }
}

export async function pushMatchScoreUpdate(matchId: string, scoreA: number, scoreB: number, playedAt: number): Promise<void> {
  await supabase.from('matches').update({
    status: 'complete',
    team_a_score: scoreA,
    team_b_score: scoreB,
    played_at: playedAt
  }).eq('id', matchId);
}

export async function deleteSession(id: string): Promise<void> {
  await supabase.from('sessions').delete().eq('id', id);
}


