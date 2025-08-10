import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './hooks/useSocket';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import './App.css';

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/lobby/:lobbyId" element={<LobbyPage />} />
            <Route path="/game/:lobbyId" element={<GamePage />} />
          </Routes>
        </div>
      </Router>
    </SocketProvider>
  );
}

export default App;