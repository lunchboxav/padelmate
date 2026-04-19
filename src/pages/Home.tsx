import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, ChevronRight, Activity } from 'lucide-react';
import { getSessionIndex } from '../lib/storage';
import type { SessionIndexEntry } from '../types';
import styles from './Home.module.css';
import { useSession } from '../context/SessionContext';

export default function Home() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionIndexEntry[]>([]);
  const { clearSession } = useSession();

  useEffect(() => {
    getSessionIndex().then(setSessions);
    clearSession();
  }, []);

  return (
    <div className="view-wrapper">
      <header className={styles.header}>
        <div className={styles.logoBadge}>
          <Activity size={32} color="#fff" />
        </div>
        <h1 className="h1">PadelMate</h1>
        <p className="subtext">Matchmaking & Scoring Engine</p>
      </header>

      <button className="btn-primary" onClick={() => navigate('/session/new')}>
        <Plus size={20} /> New Session
      </button>

      <div className={styles.sessionList}>
        <h2 className={styles.sectionTitle}>Recent Sessions</h2>
        {sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <Trophy size={48} className={styles.emptyIcon} />
            <p className="subtext">No sessions yet.<br/>Host your first game!</p>
          </div>
        ) : (
          <div className={styles.list}>
            {sessions.map(s => (
              <button key={s.id} className={styles.sessionCard} onClick={() => {
                if (s.status === 'finished') navigate(`/session/${s.id}/finished`);
                else navigate(`/session/${s.id}`);
              }}>
                <div className={styles.cardContent}>
                  <h3>{s.label}</h3>
                  <span className={styles.date}>{new Date(s.createdAt).toLocaleDateString()}</span>
                  <div className={styles.badge} data-status={s.status}>
                    {s.status.toUpperCase()}
                  </div>
                </div>
                <ChevronRight size={20} color="var(--text-muted)" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
