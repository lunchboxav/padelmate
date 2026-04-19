/* wait, using react-router-dom! */
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SessionProvider } from './context/SessionContext';
import Home from './pages/Home';
import SessionSetup from './pages/SessionSetup';
import SessionActive from './pages/SessionActive';
import Leaderboard from './pages/Leaderboard';

function App() {
  return (
    <SessionProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/session/new" element={<SessionSetup />} />
          <Route path="/session/:id" element={<SessionActive />} />
          <Route path="/session/:id/leaderboard" element={<Leaderboard />} />
          <Route path="/session/:id/finished" element={<Leaderboard finished />} />
        </Routes>
      </Router>
    </SessionProvider>
  );
}

export default App;
