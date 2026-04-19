-- PadelMate Supabase M1 Schema
-- To be executed in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  label TEXT,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS courts (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pools (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES pools(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  round_no INTEGER NOT NULL,
  court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  team_a_score INTEGER,
  team_b_score INTEGER,
  borrowed_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  played_at BIGINT
);

CREATE TABLE IF NOT EXISTS match_players (
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team TEXT NOT NULL,
  borrowed BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (match_id, player_id)
);

-- RLS (Row Level Security) minimal policies for M1
-- M1 doesn't employ auth. We will allow fully public read and write.
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Public full access courts" ON courts FOR ALL USING (true);
CREATE POLICY "Public full access pools" ON pools FOR ALL USING (true);
CREATE POLICY "Public full access players" ON players FOR ALL USING (true);
CREATE POLICY "Public full access matches" ON matches FOR ALL USING (true);
CREATE POLICY "Public full access match_players" ON match_players FOR ALL USING (true);
