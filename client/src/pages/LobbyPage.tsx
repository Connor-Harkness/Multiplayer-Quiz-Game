import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { Lobby } from '../utils/types';

const LobbyPage = () => {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [error, setError] = useState('');
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket || !lobbyId) return;

    // Request lobby data when component mounts
    socket.emit('get-lobby', { lobbyId });

    socket.on('lobby-updated', (data) => {
      setLobby(data.lobby);
    });

    socket.on('lobby-data', (data) => {
      setLobby(data.lobby);
    });

    socket.on('chat-message', (data) => {
      setLobby(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          chat: [...prev.chat, data.message]
        };
      });
    });

    socket.on('game-starting', () => {
      navigate(`/game/${lobbyId}`);
    });

    socket.on('error', (data) => {
      setError(data.message);
    });

    return () => {
      socket.off('lobby-updated');
      socket.off('lobby-data');
      socket.off('chat-message');
      socket.off('game-starting');
      socket.off('error');
    };
  }, [socket, lobbyId, navigate]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [lobby?.chat]);

  const sendChatMessage = () => {
    if (!chatMessage.trim() || !socket) return;

    socket.emit('send-chat', { message: chatMessage.trim() });
    setChatMessage('');
  };

  const startGame = () => {
    if (!socket) return;
    socket.emit('start-game');
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendChatMessage();
  };

  const isHost = lobby && socket && lobby.hostId === socket.id;
  const canStart = lobby && lobby.players.length >= 2 && lobby.players.length <= lobby.maxPlayers;

  if (!lobby) {
    return (
      <div className="container">
        <div className="card">
          <h2>Loading lobby...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="lobby-header">
        <h1>🎮 Quiz Lobby</h1>
        <p>Lobby ID: <strong>{lobby.id}</strong></p>
        <p>Share this ID with friends to join!</p>
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="lobby-content">
        {/* Players Section */}
        <div className="players-section">
          <h3>Players ({lobby.players.length}/{lobby.maxPlayers})</h3>
          <div className="players-list">
            {lobby.players.map((player) => (
              <div 
                key={player.id} 
                className={`player-item ${player.isHost ? 'host' : ''}`}
              >
                <div>
                  <div className="player-name">{player.name}</div>
                  {player.isHost && <span className="host-badge">HOST</span>}
                </div>
              </div>
            ))}
          </div>

          {isHost && (
            <button
              className={`btn ${canStart ? 'btn-success' : 'btn-danger'}`}
              style={{ width: '100%' }}
              onClick={startGame}
              disabled={!canStart}
            >
              {canStart ? 'Start Game!' : `Need ${2 - lobby.players.length} more players`}
            </button>
          )}
        </div>

        {/* Chat Section */}
        <div className="chat-section">
          <h3>Chat</h3>
          <div className="chat-messages" ref={chatMessagesRef}>
            {lobby.chat.map((msg) => (
              <div key={msg.id} className="chat-message">
                <div className="sender">{msg.playerName}:</div>
                <div>{msg.message}</div>
              </div>
            ))}
            {lobby.chat.length === 0 && (
              <div style={{ opacity: 0.6, fontStyle: 'italic' }}>
                No messages yet. Start chatting!
              </div>
            )}
          </div>
          
          <form onSubmit={handleChatSubmit} className="chat-input-section">
            <input
              type="text"
              className="chat-input"
              placeholder="Type a message..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              maxLength={200}
            />
            <button type="submit" className="btn btn-primary">
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Lobby Settings */}
      <div className="settings-section">
        <h3>Game Settings</h3>
        <div className="settings-grid">
          <div>
            <strong>Difficulty:</strong>{' '}
            {lobby.difficulty.charAt(0).toUpperCase() + lobby.difficulty.slice(1)}
            {' '}({
              lobby.difficulty === 'easy' ? '30s' :
              lobby.difficulty === 'medium' ? '15s' : '7s'
            } per question)
          </div>
          <div>
            <strong>Questions:</strong> {lobby.questionCount}
          </div>
          <div>
            <strong>Category:</strong> {lobby.category === 'any' ? 'Any' : lobby.category}
          </div>
          <div>
            <strong>Type:</strong> {
              lobby.type === 'any' ? 'Any' :
              lobby.type === 'multiple' ? 'Multiple Choice' : 'True/False'
            }
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button 
          className="btn" 
          onClick={() => navigate('/')}
        >
          Leave Lobby
        </button>
      </div>
    </div>
  );
};

export default LobbyPage;