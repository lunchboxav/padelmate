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
  const [sortMode, setSortMode] = useState<'standard' | 'points'>('standard');

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

  const handleShare = async () => {
    if (!state.session) return;
    const url = `${window.location.origin}/session/${state.session.id}/leaderboard`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'PadelMate Results',
          text: `Check out the final standings for ${state.session.label}!`,
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  if (state.loading || !state.session) return <div className="view-wrapper">Loading...</div>;

  const displayedStats = [...stats].sort((a, b) => {
    if (sortMode === 'points') {
      return b.PF - a.PF || b.W - a.W || b.Diff - a.Diff || a.name.localeCompare(b.name);
    }
    return b.W - a.W || b.Diff - a.Diff || b.PF - a.PF || a.name.localeCompare(b.name);
  });

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

      <div className={styles.toggleWrapper}>
        <button 
          className={`${styles.toggleBtn} ${sortMode === 'standard' ? styles.active : ''}`}
          onClick={() => setSortMode('standard')}
        >
          Standard (Wins)
        </button>
        <button 
          className={`${styles.toggleBtn} ${sortMode === 'points' ? styles.active : ''}`}
          onClick={() => setSortMode('points')}
        >
          Total Points
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Rk</th>
              <th style={{ textAlign: 'left' }}>Player</th>
              <th>W</th>
              <th>L</th>
              <th>Diff</th>
              {sortMode === 'points' ? (
                <>
                  <th>PF</th>
                  <th>PA</th>
                </>
              ) : (
                <th>TP</th>
              )}
            </tr>
          </thead>
          <tbody>
            {displayedStats.map((stat, idx) => (
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
                {sortMode === 'points' ? (
                  <>
                    <td style={{ fontWeight: 600 }}>{stat.PF}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{stat.PA}</td>
                  </>
                ) : (
                  <td>{stat.PF}</td>
                )}
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
          <button className="btn-secondary" onClick={handleShare}>
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
