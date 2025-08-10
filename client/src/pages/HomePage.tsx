import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { LobbySettings, Category } from '../utils/types';
import axios from 'axios';

const HomePage = () => {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [playerName, setPlayerName] = useState('');
  const [lobbyId, setLobbyId] = useState('');
  const [showCreateLobby, setShowCreateLobby] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  
  const [lobbySettings, setLobbySettings] = useState<LobbySettings>({
    maxPlayers: 4,
    difficulty: 'medium',
    questionCount: 10,
    category: 'any',
    type: 'any'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('lobby-created', (data) => {
      navigate(`/lobby/${data.lobbyId}`);
    });

    socket.on('lobby-joined', (data) => {
      navigate(`/lobby/${data.lobby.id}`);
    });

    socket.on('error', (data) => {
      setError(data.message);
    });

    return () => {
      socket.off('lobby-created');
      socket.off('lobby-joined');
      socket.off('error');
    };
  }, [socket, navigate]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      setCategories(response.data.trivia_categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const createLobby = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!socket) {
      setError('Not connected to server');
      return;
    }

    socket.emit('create-lobby', {
      playerName: playerName.trim(),
      settings: lobbySettings
    });
  };

  const joinLobby = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!lobbyId.trim()) {
      setError('Please enter lobby ID');
      return;
    }

    if (!socket) {
      setError('Not connected to server');
      return;
    }

    socket.emit('join-lobby', {
      lobbyId: lobbyId.trim(),
      playerName: playerName.trim()
    });
  };

  return (
    <div className="container">
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2.5em' }}>
          🧠 Multiplayer Quiz Game
        </h1>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-group">
          <label>Your Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
          />
        </div>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1 }}
            onClick={() => setShowCreateLobby(!showCreateLobby)}
            disabled={!connected}
          >
            {showCreateLobby ? 'Cancel' : 'Create Lobby'}
          </button>
          
          <div style={{ flex: 1 }}>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Enter Lobby ID"
                value={lobbyId}
                onChange={(e) => setLobbyId(e.target.value)}
              />
            </div>
            <button 
              className="btn btn-success" 
              style={{ width: '100%' }}
              onClick={joinLobby}
              disabled={!connected}
            >
              Join Lobby
            </button>
          </div>
        </div>

        {showCreateLobby && (
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Lobby Settings</h3>
            
            <div className="settings-grid">
              <div className="form-group">
                <label>Max Players (2-64)</label>
                <input
                  type="number"
                  min="2"
                  max="64"
                  value={lobbySettings.maxPlayers}
                  onChange={(e) => setLobbySettings({
                    ...lobbySettings,
                    maxPlayers: parseInt(e.target.value) || 2
                  })}
                />
              </div>

              <div className="form-group">
                <label>Difficulty</label>
                <select
                  value={lobbySettings.difficulty}
                  onChange={(e) => setLobbySettings({
                    ...lobbySettings,
                    difficulty: e.target.value as 'easy' | 'medium' | 'hard'
                  })}
                >
                  <option value="easy">Easy (30s per question)</option>
                  <option value="medium">Medium (15s per question)</option>
                  <option value="hard">Hard (7s per question)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Number of Questions</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={lobbySettings.questionCount}
                  onChange={(e) => setLobbySettings({
                    ...lobbySettings,
                    questionCount: parseInt(e.target.value) || 10
                  })}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={lobbySettings.category}
                  onChange={(e) => setLobbySettings({
                    ...lobbySettings,
                    category: e.target.value
                  })}
                >
                  <option value="any">Any Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Question Type</label>
                <select
                  value={lobbySettings.type}
                  onChange={(e) => setLobbySettings({
                    ...lobbySettings,
                    type: e.target.value
                  })}
                >
                  <option value="any">Any Type</option>
                  <option value="multiple">Multiple Choice</option>
                  <option value="boolean">True/False</option>
                </select>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '20px' }}
              onClick={createLobby}
              disabled={!connected}
            >
              Create Lobby
            </button>
          </div>
        )}

        {!connected && (
          <div className="error-message">
            Connecting to server...
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;