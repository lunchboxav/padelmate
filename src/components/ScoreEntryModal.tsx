import { useState } from 'react';
import type { Match, Player } from '../types';
import styles from './ScoreEntryModal.module.css';

interface Props {
  match: Match;
  players: Player[];
  onClose: () => void;
  onSubmit: (scoreA: number, scoreB: number) => void;
}

export default function ScoreEntryModal({ match, players, onClose, onSubmit }: Props) {
  const [scoreA, setScoreA] = useState(match.teamAScore?.toString() || '');
  const [scoreB, setScoreB] = useState(match.teamBScore?.toString() || '');
  const [error, setError] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);

  const teamA = match.players.filter(p => p.team === 'A').map(p => players.find(pl => pl.id === p.playerId)?.name).join(' & ');
  const teamB = match.players.filter(p => p.team === 'B').map(p => players.find(pl => pl.id === p.playerId)?.name).join(' & ');

  const handleSubmit = () => {
    const sA = parseInt(scoreA, 10);
    const sB = parseInt(scoreB, 10);
    
    if (isNaN(sA) || isNaN(sB)) return setError('Scores must be numbers');
    if (sA < 0 || sB < 0) return setError('Scores cannot be negative');
    if (sA + sB !== 21) return setError('Total points must equal exactly 21');
    
    setError('');
    setConfirmStep(true);
  };

  const confirmSubmit = () => {
    onSubmit(parseInt(scoreA, 10), parseInt(scoreB, 10));
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2>Record Score</h2>
        <p className="subtext" style={{ marginBottom: 24 }}>Total points must be exactly 21</p>
        
        {!confirmStep ? (
          <>
            <div className={styles.scoreInputRow}>
              <div className={styles.teamInfo}>
                <div className={styles.teamLabel}>Team A</div>
                <div className={styles.teamNames}>{teamA}</div>
              </div>
              <input 
                type="number" 
                className={`input-field ${styles.scoreInput}`} 
                value={scoreA}
                onChange={e => setScoreA(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>

            <div className={styles.scoreInputRow}>
              <div className={styles.teamInfo}>
                <div className={styles.teamLabel}>Team B</div>
                <div className={styles.teamNames}>{teamB}</div>
              </div>
              <input 
                type="number" 
                className={`input-field ${styles.scoreInput}`} 
                value={scoreB}
                onChange={e => setScoreB(e.target.value)}
                placeholder="0"
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.actions}>
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit}>Next</button>
            </div>
          </>
        ) : (
          <div className={styles.confirmBox}>
            <h3>Confirm Score?</h3>
            <div className={styles.scorePreview}>
              <div className={styles.previewTeam}>
                <span>{teamA}</span>
                <strong>{scoreA}</strong>
              </div>
              <div className={styles.previewDivider}>-</div>
              <div className={styles.previewTeam}>
                <span>{teamB}</span>
                <strong>{scoreB}</strong>
              </div>
            </div>
            <div className={styles.actions}>
              <button className="btn-secondary" onClick={() => setConfirmStep(false)}>Edit</button>
              <button className="btn-primary" onClick={confirmSubmit} style={{ background: 'var(--success)' }}>Confirm & Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
