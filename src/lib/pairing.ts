import type { Player, Court, Match } from '../types';
import { v4 as uuidv4 } from 'uuid';

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateRound(
  poolAId: string,
  poolBId: string,
  players: Player[],
  courts: Court[],
  pastMatches: Match[],
  roundNo: number
): Match[] {
  const poolA = players.filter(p => p.poolId === poolAId);
  const poolB = players.filter(p => p.poolId === poolBId);

  // Attempt up to 10 times to avoid repeating partnerships
  for (let attempt = 0; attempt < 10; attempt++) {
    const arrangement = tryGeneratePairs(poolA, poolB, poolAId, poolBId, pastMatches);
    if (arrangement.valid) {
      return assignMatchesToCourts(arrangement.pairs, courts, roundNo);
    }
  }

  // Fallback: Just accept repeating partnerships
  const fallbackArrangement = tryGeneratePairs(poolA, poolB, poolAId, poolBId, []);
  return assignMatchesToCourts(fallbackArrangement.pairs, courts, roundNo);
}

function tryGeneratePairs(
  poolA: Player[],
  poolB: Player[],
  poolAId: string,
  poolBId: string,
  pastMatches: Match[]
): { valid: boolean; pairs: { a: Player; b: Player; borrowedFrom?: string }[] } {
  let aList = shuffle(poolA);
  let bList = shuffle(poolB);
  const pairs: { a: Player; b: Player; borrowedFrom?: string }[] = [];

  // Imbalance Fallback
  if (aList.length > bList.length) {
    const diff = aList.length - bList.length;
    const borrowers = shuffle(aList).slice(0, diff);
    bList = [...bList, ...borrowers];
  } else if (bList.length > aList.length) {
    const diff = bList.length - aList.length;
    const borrowers = shuffle(bList).slice(0, diff);
    aList = [...aList, ...borrowers];
  }

  // Zip pairs
  for (let i = 0; i < aList.length; i++) {
    const pA = aList[i];
    const pB = bList[i];
    
    // Safety check against same player
    if (pA.id === pB.id) return { valid: false, pairs: [] };

    let borrowedFrom: string | undefined = undefined;
    if (pA.poolId !== poolAId) borrowedFrom = pA.id;
    if (pB.poolId !== poolBId) borrowedFrom = pB.id;

    pairs.push({ a: pA, b: pB, borrowedFrom });
  }

  // Check repeats
  for (const pair of pairs) {
    if (hasRepeatedPartner(pair.a.id, pair.b.id, pastMatches)) {
      return { valid: false, pairs: [] };
    }
  }

  return { valid: true, pairs };
}

function hasRepeatedPartner(pAId: string, pBId: string, pastMatches: Match[]): boolean {
  for (const match of pastMatches) {
    const pA = match.players.find(p => p.playerId === pAId);
    const pB = match.players.find(p => p.playerId === pBId);
    if (pA && pB && pA.team === pB.team) {
      return true;
    }
  }
  return false;
}

function assignMatchesToCourts(
  pairs: { a: Player; b: Player; borrowedFrom?: string }[],
  courts: Court[],
  roundNo: number
): Match[] {
  const matches: Match[] = [];
  const matchCount = Math.floor(pairs.length / 2);
  
  for (let i = 0; i < matchCount; i++) {
    const pair1 = pairs[i * 2];
    const pair2 = pairs[i * 2 + 1];
    const court = courts[i % courts.length];

    const borrowedPlayers = [pair1.borrowedFrom, pair2.borrowedFrom].filter(Boolean) as string[];

    matches.push({
      id: uuidv4(),
      roundNo,
      courtId: court.id,
      status: 'pending',
      players: [
        { playerId: pair1.a.id, team: 'A', borrowed: pair1.borrowedFrom === pair1.a.id },
        { playerId: pair1.b.id, team: 'A', borrowed: pair1.borrowedFrom === pair1.b.id },
        { playerId: pair2.a.id, team: 'B', borrowed: pair2.borrowedFrom === pair2.a.id },
        { playerId: pair2.b.id, team: 'B', borrowed: pair2.borrowedFrom === pair2.b.id },
      ],
      borrowedPlayerId: borrowedPlayers.length > 0 ? borrowedPlayers[0] : null
    });
  }

  return matches;
}
