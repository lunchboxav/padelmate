import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { generateLeaderboard } from '../lib/stats';
import type { PlayerStats } from '../lib/stats';
import { ArrowLeft, Trophy, Crown, Share2 } from 'lucide-react';
import styles from './Leaderboard.module.css';

export default function Leaderboard({ finished = false }: { finished?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, loadSession } = useSession();
  const [stats, setStats] = useState<PlayerStats[]>([]);

  useEffect(() => {
    if (id && (!state.session || state.session.id !== id)) {
      loadSession(id);
    }
  }, [id]);

  useEffect(() => {
    if (state.session) {
      setStats(generateLeaderboard(state.session.players, state.session.pools, state.session.matches));
    }
  }, [state.session]);

  if (state.loading || !state.session) return <div className="view-wrapper">Loading...</div>;

  return (
    <div className="view-wrapper" style={{ paddingBottom: 40 }}>
      <header className={styles.header}>
        <button className={styles.iconBtn} onClick={() => navigate(finished ? '/' : `/session/${state.session!.id}`)}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="h2" style={{ margin: 0 }}>Leaderboard</h1>
        <div style={{ width: 40 }} />
      </header>

      {finished && (
        <div className={styles.finishedBanner}>
          <Trophy size={32} color="#fde047" />
          <h2>Session Finished!</h2>
          <p>Here are the final standings.</p>
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Rk</th>
              <th style={{ textAlign: 'left' }}>Player</th>
              <th>W</th>
              <th>L</th>
              <th>Diff</th>
              <th>PF</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat, idx) => (
              <tr key={stat.playerId} className={idx < 3 ? styles[`top${idx+1}`] : ''}>
                <td className={styles.rankCell}>
                  {idx === 0 ? <Crown size={16} color="#fde047" /> : idx + 1}
                </td>
                <td style={{ textAlign: 'left' }}>
                  <div className={styles.playerInfo}>
                    <strong>{stat.name}</strong>
                    <span>{stat.poolLabel} | MP: {stat.MP}</span>
                  </div>
                </td>
                <td className={styles.winCell}>{stat.W}</td>
                <td>{stat.L}</td>
                <td className={stat.Diff > 0 ? styles.posDiff : stat.Diff < 0 ? styles.negDiff : ''}>
                  {stat.Diff > 0 ? '+' : ''}{stat.Diff}
                </td>
                <td>{stat.PF}</td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }} className="subtext">
                  No matches completed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {finished && (
        <div className={styles.actions}>
          <button className="btn-secondary" onClick={() => alert('M1 Feature: Shareable Link')}>
            <Share2 size={20} /> Share Result
          </button>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      )}
    </div>
  );
}
