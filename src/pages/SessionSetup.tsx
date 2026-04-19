import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import type { Pool, Court, Player } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Plus, Trash2, AlertTriangle, Play } from 'lucide-react';
import styles from './SessionSetup.module.css';

export default function SessionSetup() {
  const navigate = useNavigate();
  const { createSession, startSession } = useSession();

  const [label, setLabel] = useState('');
  
  const [pools, setPools] = useState<Pool[]>([
    { id: uuidv4(), label: 'Pool A' },
    { id: uuidv4(), label: 'Pool B' }
  ]);

  const [courts, setCourts] = useState<Court[]>([
    { id: uuidv4(), name: 'Court 1' }
  ]);

  const [players, setPlayers] = useState<Omit<Player, 'id'>[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedPool, setSelectedPool] = useState<string>(pools[0].id);

  const addCourt = () => {
    setCourts([...courts, { id: uuidv4(), name: `Court ${courts.length + 1}` }]);
  };

  const removeCourt = (id: string) => {
    if (courts.length > 1) {
      setCourts(courts.filter(c => c.id !== id));
    }
  };

  const updateCourt = (id: string, name: string) => {
    setCourts(courts.map(c => c.id === id ? { ...c, name } : c));
  };

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setPlayers([...players, { name: newPlayerName.trim(), poolId: selectedPool }]);
    setNewPlayerName('');
  };

  const removePlayer = (idx: number) => {
    setPlayers(players.filter((_, index) => index !== idx));
  };

  const poolCount = (poolId: string) => players.filter(p => p.poolId === poolId).length;
  const countA = poolCount(pools[0].id);
  const countB = poolCount(pools[1].id);
  const imbalance = Math.abs(countA - countB);

  const handleStart = () => {
    if (courts.length === 0) return alert('At least 1 court required.');
    if (players.length < 4) return alert('At least 4 players required to generate pairs.');
    
    const sessionId = uuidv4();
    createSession({
      id: sessionId,
      label: label.trim() || new Date().toLocaleDateString() + ' Session',
      pools,
      courts,
      players
    }).then(() => {
      // Auto start M0/M1
      startSession();
      navigate(`/session/${sessionId}`);
    });
  };

  return (
    <div className="view-wrapper">
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="h2">New Session</h1>
        <div style={{ width: 24 }} />
      </header>

      <div className={styles.formGroup}>
        <label>Session Name</label>
        <input 
          className="input-field" 
          placeholder="e.g. Friday Night Padel" 
          value={label}
          onChange={e => setLabel(e.target.value)}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.labelWithAction}>
          <span>Courts ({courts.length})</span>
          <button className={styles.textBtn} onClick={addCourt}><Plus size={16}/> Add Court</button>
        </label>
        <div className={styles.list}>
          {courts.map(court => (
            <div key={court.id} className={styles.listItem}>
              <input 
                className="input-field"
                value={court.name}
                onChange={e => updateCourt(court.id, e.target.value)}
              />
              {courts.length > 1 && (
                <button className={styles.iconBtn} onClick={() => removeCourt(court.id)}>
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.poolsSection}>
        <div className={styles.poolHeader}>
          {pools.map((p) => (
            <input 
              key={p.id}
              className={`${styles.poolNameInput} ${selectedPool === p.id ? styles.poolActive : ''}`}
              value={p.label}
              onChange={e => setPools(pools.map(pool => pool.id === p.id ? { ...pool, label: e.target.value } : pool))}
              onFocus={() => setSelectedPool(p.id)}
            />
          ))}
        </div>
        
        {imbalance > 0 && (
          <div className={styles.warningBox}>
            <AlertTriangle size={16} />
            <span>Pools are imbalanced ({countA} vs {countB}). Algorithm will auto-borrow players.</span>
          </div>
        )}

        <form onSubmit={addPlayer} className={styles.addPlayerForm}>
          <input 
            className="input-field"
            placeholder={`Add player to ${pools.find(p => p.id === selectedPool)?.label}`}
            value={newPlayerName}
            onChange={e => setNewPlayerName(e.target.value)}
          />
          <button type="submit" className="btn-secondary" style={{ width: 'auto' }}>
            <Plus size={20} />
          </button>
        </form>

        <div className={styles.playersGrid}>
          {pools.map(pool => (
            <div key={pool.id} className={styles.playerColumn}>
              <div className={styles.columnHeader}>{pool.label} ({poolCount(pool.id)})</div>
              {players.map((player, idx) => {
                if (player.poolId !== pool.id) return null;
                return (
                  <div key={idx} className={styles.playerTag}>
                    {player.name}
                    <button onClick={() => removePlayer(idx)}><Trash2 size={14}/></button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.spacer} />

      <button className="btn-primary" onClick={handleStart}>
        <Play size={20} /> Start Session
      </button>
    </div>
  );
}
