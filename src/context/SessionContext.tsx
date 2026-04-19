import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { Session, Player, Court, Pool, Match } from '../types';
import { 
  getSession, 
  pushSessionCreate, 
  pushSessionUpdateStatus, 
  pushMatchesInsert, 
  pushMatchScoreUpdate 
} from '../lib/storage';
import { v4 as uuidv4 } from 'uuid';
import { generateRound } from '../lib/pairing';

interface SessionState {
  session: Session | null;
  loading: boolean;
}

type Action =
  | { type: 'LOAD_SESSION'; payload: Session }
  | { type: 'CLEAR_SESSION' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CREATE_SESSION'; payload: Session }
  | { type: 'START_SESSION' }
  | { type: 'ADD_MATCHES'; payload: Match[] }
  | { type: 'UPDATE_SCORE'; payload: { matchId: string; scoreA: number; scoreB: number; playedAt: number } }
  | { type: 'END_SESSION' };

const initialState: SessionState = {
  session: null,
  loading: true,
};

function sessionReducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'LOAD_SESSION':
      return { ...state, session: action.payload, loading: false };
    case 'CLEAR_SESSION':
      return { ...state, session: null, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'CREATE_SESSION':
      return { ...state, session: action.payload, loading: false };
    case 'START_SESSION':
      return !state.session ? state : { ...state, session: { ...state.session, status: 'active' } };
    case 'ADD_MATCHES':
      return !state.session ? state : { 
        ...state, 
        session: { ...state.session, matches: [...state.session.matches, ...action.payload] } 
      };
    case 'UPDATE_SCORE':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          matches: state.session.matches.map(m => m.id === action.payload.matchId ? {
            ...m,
            teamAScore: action.payload.scoreA,
            teamBScore: action.payload.scoreB,
            status: 'complete',
            playedAt: action.payload.playedAt
          } : m)
        }
      };
    case 'END_SESSION':
      return !state.session ? state : { ...state, session: { ...state.session, status: 'finished' } };
    default:
      return state;
  }
}

const SessionContext = createContext<{
  state: SessionState;
  dispatch: React.Dispatch<Action>;
  loadSession: (id: string) => Promise<void>;
  createSession: (payload: { id: string; label: string; pools: Pool[]; courts: Court[]; players: Omit<Player, 'id'>[] }) => Promise<void>;
  startSession: () => Promise<void>;
  generateNextRound: () => Promise<void>;
  updateScore: (matchId: string, scoreA: number, scoreB: number) => Promise<void>;
  endSession: () => Promise<void>;
  clearSession: () => void;
} | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  const loadSession = async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const s = await getSession(id);
    if (s) {
      dispatch({ type: 'LOAD_SESSION', payload: s });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearSession = () => dispatch({ type: 'CLEAR_SESSION' });

  const createSession = async (payload: { id: string; label: string; pools: Pool[]; courts: Court[]; players: Omit<Player, 'id'>[] }) => {
    const newSession: Session = {
      id: payload.id,
      label: payload.label,
      status: 'setup',
      createdAt: Date.now(),
      pools: payload.pools,
      courts: payload.courts,
      players: payload.players.map(p => ({ ...p, id: uuidv4() })),
      matches: [],
    };
    dispatch({ type: 'CREATE_SESSION', payload: newSession });
    await pushSessionCreate(newSession);
  };

  const startSession = async () => {
    if (!state.session) return;
    dispatch({ type: 'START_SESSION' });
    await pushSessionUpdateStatus(state.session.id, 'active');
  };

  const generateNextRound = async () => {
    if (!state.session) return;
    const currentRound = state.session.matches.reduce((max, m) => Math.max(max, m.roundNo), 0);
    const newRound = currentRound + 1;
    
    const newMatches = generateRound(
      state.session.pools[0].id,
      state.session.pools[1].id,
      state.session.players,
      state.session.courts,
      state.session.matches,
      newRound
    );
    
    dispatch({ type: 'ADD_MATCHES', payload: newMatches });
    await pushMatchesInsert(state.session.id, newMatches);
  };

  const updateScore = async (matchId: string, scoreA: number, scoreB: number) => {
    if (!state.session) return;
    const playedAt = Date.now();
    dispatch({ type: 'UPDATE_SCORE', payload: { matchId, scoreA, scoreB, playedAt } });
    await pushMatchScoreUpdate(matchId, scoreA, scoreB, playedAt);
  };

  const endSession = async () => {
    if (!state.session) return;
    dispatch({ type: 'END_SESSION' });
    await pushSessionUpdateStatus(state.session.id, 'finished');
  };

  return (
    <SessionContext.Provider value={{
      state, dispatch, loadSession, clearSession, createSession, startSession, generateNextRound, updateScore, endSession
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
