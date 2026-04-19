import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import type { Match } from '../types';
import { ArrowLeft, RefreshCw, CheckCircle2, ChevronRight, BarChart2, Info } from 'lucide-react';
import ScoreEntryModal from '../components/ScoreEntryModal';
import styles from './SessionActive.module.css';

export default function SessionActive() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, loadSession, generateNextRound, endSession, updateScore } = useSession();
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (id && (!state.session || state.session.id !== id)) {
      loadSession(id);
    }
  }, [id]);

  if (state.loading || !state.session) return <div className="view-wrapper">Loading...</div>;

  const session = state.session;
  const currentRoundNo = session.matches.reduce((max, m) => Math.max(max, m.roundNo), 0);
  
  const handleGenerate = () => {
    generateNextRound();
  };

  const handleEnd = () => {
    if (window.confirm('Are you sure you want to end this session?')) {
      endSession().then(() => {
        navigate(`/session/${session.id}/finished`);
      });
    }
  };

  const handleScoreSubmit = (scoreA: number, scoreB: number) => {
    if (!activeMatch) return;
    updateScore(activeMatch.id, scoreA, scoreB);
    setActiveMatch(null);
  };

  const getCourtName = (courtId: string) => session.courts.find(c => c.id === courtId)?.name || 'Court';
  const getPlayerNames = (match: Match, team: 'A' | 'B') => 
    match.players.filter(p => p.team === team)
      .map(p => {
        const pl = session.players.find(x => x.id === p.playerId);
        return pl ? pl.name + (p.borrowed ? '*' : '') : 'Unknown';
      }).join(' & ');

  const groupedMatches = session.matches.reduce((acc, m) => {
    const r = m.roundNo;
    if (!acc[r]) acc[r] = [];
    acc[r].push(m);
    return acc;
  }, {} as Record<number, Match[]>);

  const rounds = Object.keys(groupedMatches).map(Number).sort((a,b) => b - a);
  const showBorrowedNote = rounds.some(r => groupedMatches[r].some(m => m.borrowedPlayerId));

  return (
    <div className="view-wrapper" style={{ paddingBottom: 40 }}>
      <header className={styles.header}>
        <button className={styles.iconBtn} onClick={() => navigate('/')}>
          <ArrowLeft size={24} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 className="h2" style={{ margin: 0 }}>{session.label}</h1>
          <span className="subtext" style={{ fontSize: 12 }}>
            Round {currentRoundNo} • {session.courts.length} Courts
          </span>
        </div>
        <button className={styles.iconBtn} onClick={() => navigate(`/session/${session.id}/leaderboard`)}>
          <BarChart2 size={24} />
        </button>
      </header>

      <div className={styles.mainActions}>
        <button className="btn-primary" onClick={handleGenerate}>
          <RefreshCw size={20} /> Generate Round {currentRoundNo + 1}
        </button>
        <button className="btn-secondary" onClick={handleEnd}>
          End Session
        </button>
      </div>

      {showBorrowedNote && (
        <div className={styles.borrowNote}>
          <Info size={14} />
          <span>* Indicates a player borrowed from the other pool to fix imbalance</span>
        </div>
      )}

      <div className={styles.roundsContainer}>
        {rounds.map(roundNo => {
          const matches = groupedMatches[roundNo];
          return (
            <div key={roundNo} className={styles.roundSection}>
              <div className={styles.roundHeader}>
                <h3 className={styles.roundTitle}>Round {roundNo}</h3>
                <div className={styles.roundMeta}>{matches.filter(m => m.status === 'complete').length} / {matches.length} Done</div>
              </div>
              <div className={styles.matchesGrid}>
                {matches.map(match => (
                  <button 
                    key={match.id} 
                    className={`${styles.matchCard} ${match.status === 'complete' ? styles.matchComplete : ''}`}
                    onClick={() => setActiveMatch(match)}
                  >
                    <div className={styles.courtBadge}>{getCourtName(match.courtId)}</div>
                    
                    <div className={styles.teamsArea}>
                      <div className={`${styles.teamRow} ${match.status === 'complete' && match.teamAScore! > match.teamBScore! ? styles.winner : ''}`}>
                        <span className={styles.teamName}>{getPlayerNames(match, 'A')}</span>
                        {match.status === 'complete' && <strong className={styles.score}>{match.teamAScore}</strong>}
                      </div>
                      <div className={styles.teamDivider}>VS</div>
                      <div className={`${styles.teamRow} ${match.status === 'complete' && match.teamBScore! > match.teamAScore! ? styles.winner : ''}`}>
                        <span className={styles.teamName}>{getPlayerNames(match, 'B')}</span>
                        {match.status === 'complete' && <strong className={styles.score}>{match.teamBScore}</strong>}
                      </div>
                    </div>
                    
                    {match.status === 'complete' ? (
                      <div className={styles.statusBadge}>
                        <CheckCircle2 size={14} /> Completed
                      </div>
                    ) : (
                      <div className={styles.enterScoreAction}>
                        <span>Enter Score</span>
                        <ChevronRight size={16} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {rounds.length === 0 && (
          <div className={styles.emptyState}>
            <p className="subtext">No rounds generated yet. Hit the button above to create the first matches!</p>
          </div>
        )}
      </div>

      {activeMatch && (
        <ScoreEntryModal
          match={activeMatch}
          players={session.players}
          onClose={() => setActiveMatch(null)}
          onSubmit={handleScoreSubmit}
        />
      )}
    </div>
  );
}
