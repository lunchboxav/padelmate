# PadelMate — Product Requirements & Technical Spec

**Version 2.0 | Web PWA | M0 Prototype + M1–M4 Roadmap**

_Updated: open questions resolved, M0 prototype milestone added_

---

## Changelog: v1.0 → v2.0

| # | Change | Section affected |
|---|--------|-----------------|
| 1 | Added M0 Prototype milestone (local-only DB, no link sharing) before M1 | Sec 2, 11 |
| 2 | Pool imbalance fallback defined: borrow from other pool when sizes differ | Sec 4 |
| 3 | Draw score ruled out by design: total points per match always equals 21 | Sec 5 |
| 4 | Round limit removed: sessions run until organiser manually ends | Sec 3, 9 |
| 5 | Court labels are organiser-named (not auto-numbered) | Sec 3, 6, 8 |
| 6 | Single organiser confirmed: no concurrent edit conflict handling needed | Sec 3, 9 |
| 7 | Open questions section reduced from 5 items to 0 (all resolved) | Sec 10 |

---

## 1. Overview

PadelMate is a lightweight web PWA for organising casual padel sessions. It handles player pool setup, automated mixed-pair generation, round-based match scheduling across multiple named courts, live score entry by a single organiser, and a per-player leaderboard.

**Target user:** A single session organiser managing 8–12 players across one or more courts in an informal setting.

**Primary value:** Eliminate manual bracket drawing and score tallying. Generate fair, randomised pairings in seconds and produce a real-time leaderboard visible to all players.

> **Scoring rule (by design)**
> Total points per match always equals 21 (e.g. 15–6, 11–10, 21–0).
> A draw is therefore structurally impossible. No draw-handling logic is required.

---

## 2. Goals & Non-Goals

### 2.1 M0 Prototype (local-only, no sharing)

- Session setup with two configurable player pools
- Round-based match generation with repeat-partner avoidance
- Parallel court support with organiser-named courts
- Score entry by single organiser (max 21 pts per team, edit + confirm)
- Per-player leaderboard ranked by W/L then score differential
- Storage: browser localStorage only — data is per-device, not persisted to cloud
- No link sharing of leaderboard

### 2.2 M1 — Cloud + Sharing (builds on M0)

- Migrate storage from localStorage to Supabase
- Shareable leaderboard link (public read, no auth required)
- Session persistence across devices

### 2.3 Out of Scope for M0 + M1

- Cross-session player registry and history (requires auth — M3)
- Leaderboard screenshot export (M2 polish)
- Skill-level balancing

---

## 3. User Flows

### 3.1 Session Setup

1. Organiser opens the app and taps **New Session**.
2. Enters a session label (optional, e.g. "Friday Padel").
3. Names the courts that will be used (e.g. "Court 1", "Court Utama") — at least one required.
4. Defines two pool labels (default: Pool A / Pool B).
5. Adds players by name, assigning each to Pool A or Pool B.
6. App warns if pool sizes are unequal and shows which pool needs more players (does not block — see Section 4.3).
7. Organiser taps **Start Session** — status transitions to Active.

### 3.2 Round Generation

1. On session start (and after each round completes), organiser taps **Generate Round**.
2. Algorithm produces mixed pairs, assigns matches to courts in round-robin order across named courts.
3. All matches for the round are displayed simultaneously as active cards showing court name, Team A, and Team B.
4. Organiser can regenerate the round before any score is entered.

### 3.3 Score Entry

1. Organiser taps a match card to open score entry.
2. Enters points for Team A and Team B. Both values must sum to 21 — app validates and shows an error if they do not.
3. Taps **Submit** — a confirmation modal shows the score summary.
4. Confirms — match marked complete, leaderboard updates immediately.
5. To correct: organiser taps the completed match, taps **Edit Score**, re-enters, re-confirms.

### 3.4 Leaderboard & Session End

1. Leaderboard tab is accessible at any point during the session.
2. Rankings update live as each match score is submitted.
3. Organiser taps **End Session** — status transitions to Finished.
4. **M0:** leaderboard is viewable on the organiser's device only.
5. **M1:** a shareable link is generated; organiser copies and shares with players.

---

## 4. Pairing Algorithm

### 4.1 Constraints

- Each pair must contain exactly one player from Pool A and one from Pool B.
- Within a single round, no player appears in more than one match.
- The algorithm actively avoids repeating a partnership from a previous round in the same session (soft constraint: up to 10 shuffle retries before accepting a repeat if no clean solution exists).

### 4.2 Round Generation Steps

1. Shuffle Pool A list randomly.
2. Shuffle Pool B list randomly.
3. If pool sizes differ, apply imbalance correction (see 4.3) before proceeding.
4. Zip the two lists to produce N mixed pairs (N = size of the smaller pool after correction).
5. Check all pairs against the session's partnership history. If any repeat found and retry count < 10, go to step 1.
6. Group pairs sequentially into matches: (Pair 1 vs Pair 2), (Pair 3 vs Pair 4), etc.
7. Assign each match to a court in round-robin order across the organiser's named courts.
8. Persist all match records with status Pending.

### 4.3 Pool Imbalance Fallback

If Pool A and Pool B have different sizes, the algorithm borrows the required number of players from the larger pool to temporarily fill the smaller pool for that round only. Borrowed players are selected randomly from the larger pool's unpaired players. They play in both pools for that round, and this is noted in the match record for display purposes. Pool membership is not permanently changed.

> **Example**
> Pool A: 5 players, Pool B: 4 players.
> One Pool A player is randomly selected to also represent Pool B.
> Result: 4 pairs generated for the round. The borrowed player appears in one match as their natural role and in another as the borrowed role.
> This is an edge case — organiser is warned at setup and encouraged to balance pools.

### 4.4 Match Count Per Round

With N pairs generated, the round produces N/2 matches (integer division). If N is odd (pool imbalance produced an odd pair count), one pair sits out the round — selected randomly, noted in the UI.

---

## 5. Scoring & Leaderboard

### 5.1 Score Model

Each match records two integers: Team A points and Team B points. The app enforces:

- Both values required to mark a match complete.
- Both values must be non-negative integers.
- Team A points + Team B points must equal exactly 21.
- A draw (10.5 each) is structurally impossible under this rule.

### 5.2 Per-Player Stat Derivation

Stats are derived at query time from match records (no materialised stats table in M0/M1):

| Stat | Derivation |
|------|-----------|
| Matches played (MP) | Count of completed matches where player appears in `match_player` |
| Points for (PF) | Sum of player's team score across all completed matches |
| Points against (PA) | Sum of opponent team's score across all completed matches |
| Score differential (Diff) | PF minus PA |
| Wins (W) | Count of matches where player's team score > opponent score |
| Losses (L) | Count of matches where player's team score < opponent score |
| Win rate (Win%) | W / MP, displayed as percentage |

### 5.3 Leaderboard Ranking

- **Primary:** Wins descending (most wins first)
- **Secondary:** Score differential descending
- **Tertiary:** Total points for (PF) descending
- **Final tiebreaker:** Alphabetical by player name

Columns displayed: Rank, Player, Pool, MP, W, L, PF, PA, Diff, Win%.

> **Why no draws?**
> With the 21-point rule, one team always scores more than the other.
> This eliminates the need for a draw state in the data model, ranking formula, or UI.
> No points-for-draw configuration or tiebreaker for draw count is required.

---

## 6. Data Model

### 6.1 Entities

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `session` | id, label, status (setup\|active\|finished), created_at | One record per session. In M0, stored as JSON in localStorage. |
| `court` | id, session_id, name | Organiser-defined name (e.g. "Court Utama"). One or more per session. |
| `pool` | id, session_id, label | Two pools per session. Labels set by organiser. |
| `player` | id, session_id, pool_id, name | Fresh per session. No global player registry in M0/M1. |
| `match` | id, session_id, round_no, court_id, status (pending\|complete), team_a_score, team_b_score, borrowed_player_id (nullable), played_at | `borrowed_player_id` records imbalance fallback cases. |
| `match_player` | match_id, player_id, team (A\|B) | 4 rows per match. Unique on (match_id, player_id). |

### 6.2 Key Constraints

- `team_a_score + team_b_score = 21` enforced at application layer before write.
- `match_player` unique on `(match_id, player_id)` — no player on both teams.
- `court.name` is unique within a session.
- `round_no` is a positive integer; no maximum enforced.
- `borrowed_player_id` is nullable; set only when pool imbalance fallback is triggered.

### 6.3 M0 Storage (localStorage)

In M0, the full session object (session + courts + pools + players + matches + match_players) is serialised as a single JSON blob and stored under the key `padelmate:session:<id>`. A session index is kept under `padelmate:sessions` listing all session IDs and labels for the home screen.

> **M0 → M1 migration path**
> The localStorage JSON structure mirrors the Supabase table schema exactly.
> M1 replaces read/write calls with Supabase client calls — no data model changes required.
> Existing M0 sessions are not migrated to cloud (they remain local).

---

## 7. Tech Stack

| Layer | M0 (Prototype) | M1+ (Production) |
|-------|---------------|-----------------|
| Frontend | React 18 + Vite + CSS Modules | Same |
| PWA | vite-plugin-pwa + service worker | Same |
| Storage | localStorage (JSON) | Supabase (PostgreSQL) |
| Auth | None | None (session identified by UUID in URL) |
| Realtime | N/A | Supabase realtime subscriptions for live leaderboard |
| Sharing | N/A | Public read Supabase policy; shareable URL: `/session/:id/leaderboard` |
| Hosting | Vercel / Netlify | Same |
| State | React context + useReducer | Same |

---

## 8. Screen Inventory

| Screen | Route | M0 | M1+ |
|--------|-------|----|-----|
| Home | `/` | List local sessions | List local + cloud sessions |
| Session Setup | `/session/new` | Pool config, player entry, court naming, Start CTA | Same |
| Session Active | `/session/:id` | Round generation, active match cards by court | Same + realtime sync |
| Score Entry | `/session/:id/match/:matchId` | Score inputs (sum-to-21 validation), confirm modal | Same |
| Leaderboard | `/session/:id/leaderboard` | Ranked table, local only | Ranked table + Share Link button |
| Session Finished | `/session/:id/finished` | Final leaderboard, local only | Final leaderboard + Share Link |

---

## 9. Non-Functional Requirements

### 9.1 Performance

- Leaderboard query renders in < 500ms for sessions up to 12 players and unlimited rounds.
- Round generation completes in < 1s client-side.

### 9.2 Data Integrity

- Sum-to-21 validation is enforced client-side before any write (localStorage or Supabase).
- Score edits require a confirmation step — no accidental overwrites.
- Single organiser model eliminates concurrent edit conflicts by design.

### 9.3 Offline (M1+)

- Service worker caches the app shell for offline use.
- Score entry queued locally when offline; synced to Supabase on reconnection.

### 9.4 Compatibility

- Target: Chrome and Safari on iOS and Android, latest two major versions.
- Minimum screen width: 375px (iPhone SE).

---

## 10. Open Questions

> **All previously open questions resolved in v2.0**
> No outstanding decisions block implementation of M0.
> This section retained for traceability — see Changelog for resolutions.

---

## 11. Milestone Plan

| Milestone | Label | Scope | Exit Criteria |
|-----------|-------|-------|--------------|
| M0 | Prototype | Full session loop with localStorage. No cloud, no sharing. | Organiser runs a complete session end-to-end on one device. Leaderboard renders correctly. |
| M1 | Cloud + Sharing | Supabase integration, shareable leaderboard link, session persistence. | Leaderboard URL opens correctly on a second device with no login. |
| M2 | PWA Polish | Offline score entry, leaderboard screenshot export, install prompt. | App passes Lighthouse PWA audit > 90. |
| M3 | History & Auth | Cross-session player registry, simple login, session history, cross-session win rates. | Organiser views aggregated stats across 3+ past sessions. |

---

_PadelMate Product Spec v2.0 — all decisions resolved, ready for M0 implementation_
