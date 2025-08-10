import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { Question, QuestionResult } from '../utils/types';

const GamePage = () => {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();
  
  const [gameState, setGameState] = useState<'countdown' | 'question' | 'results' | 'finished'>('countdown');
  const [countdown, setCountdown] = useState(5);
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [finalScores, setFinalScores] = useState<Array<{
    playerId: string;
    playerName: string;
    score: number;
  }>>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('countdown', (data) => {
      setCountdown(data.countdown);
    });

    socket.on('new-question', (data) => {
      setGameState('question');
      setQuestion(data.question);
      setQuestionNumber(data.questionNumber);
      setTotalQuestions(data.totalQuestions);
      setTimeLeft(data.timeLimit);
      setSelectedAnswer(null);
      setHasAnswered(false);
      
      // Start countdown timer
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1000) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    });

    socket.on('question-results', (data) => {
      setGameState('results');
      setResults(data.results);
      setCorrectAnswer(data.correctAnswer);
    });

    socket.on('game-finished', (data) => {
      setGameState('finished');
      setFinalScores(data.finalScores);
    });

    return () => {
      socket.off('countdown');
      socket.off('new-question');
      socket.off('question-results');
      socket.off('game-finished');
    };
  }, [socket]);

  const submitAnswer = (answer: string) => {
    if (hasAnswered || !socket) return;

    setSelectedAnswer(answer);
    setHasAnswered(true);
    
    socket.emit('submit-answer', { answer });
  };

  const backToLobby = () => {
    navigate(`/lobby/${lobbyId}`);
  };

  const backToHome = () => {
    navigate('/');
  };

  // Decode HTML entities
  const decodeHtml = (html: string) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  if (gameState === 'countdown') {
    return (
      <div className="countdown-overlay">
        <div>
          <div className="countdown-number">{countdown}</div>
          <div style={{ textAlign: 'center', fontSize: '1.5rem', marginTop: '20px' }}>
            Game starting...
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'question' && question) {
    const timeLeftSeconds = Math.ceil(timeLeft / 1000);
    
    return (
      <div className="container">
        <div className="question-container">
          <div className="question-header">
            <div>
              Question {questionNumber} of {totalQuestions}
            </div>
            <div className="timer">
              {timeLeftSeconds}s
            </div>
          </div>

          <div className="card">
            <div className="question-text">
              {decodeHtml(question.question)}
            </div>

            <div className="answers-grid">
              {question.all_answers.map((answer, index) => (
                <button
                  key={index}
                  className={`answer-btn btn ${
                    selectedAnswer === answer ? 'btn-primary' : ''
                  }`}
                  onClick={() => submitAnswer(answer)}
                  disabled={hasAnswered || timeLeft <= 0}
                >
                  {decodeHtml(answer)}
                </button>
              ))}
            </div>

            {hasAnswered && (
              <div className="success-message">
                Answer submitted! Waiting for other players...
              </div>
            )}

            {timeLeft <= 0 && !hasAnswered && (
              <div className="error-message">
                Time's up!
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'results') {
    return (
      <div className="container">
        <div className="results-container">
          <div className="card">
            <h2>Question Results</h2>
            
            <div style={{ marginBottom: '30px' }}>
              <strong>Correct Answer:</strong>{' '}
              <span style={{ color: '#84fab0' }}>{decodeHtml(correctAnswer)}</span>
            </div>

            <div className="results-list">
              {results.map((result) => (
                <div
                  key={result.playerId}
                  className={`result-item ${result.isCorrect ? 'correct' : 'incorrect'}`}
                >
                  <div>
                    <strong>{result.playerName}</strong>
                    <div style={{ opacity: 0.8 }}>
                      {decodeHtml(result.answer)}
                    </div>
                  </div>
                  <div>
                    {result.isCorrect ? '✅' : '❌'} Score: {result.score}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', opacity: 0.8 }}>
              Next question in a few seconds...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="container">
        <div className="results-container">
          <div className="card">
            <h1>🎉 Game Finished!</h1>
            
            <h3 style={{ marginBottom: '30px' }}>Final Scores</h3>

            <div className="results-list">
              {finalScores.map((score, index) => (
                <div
                  key={score.playerId}
                  className="result-item"
                  style={{
                    background: index === 0 ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)' :
                               index === 1 ? 'linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%)' :
                               index === 2 ? 'linear-gradient(135deg, #cd7f32 0%, #e5a853 100%)' :
                               'rgba(255, 255, 255, 0.1)',
                    color: index < 3 ? '#333' : 'white'
                  }}
                >
                  <div>
                    <strong>
                      {index === 0 && '🥇 '}
                      {index === 1 && '🥈 '}
                      {index === 2 && '🥉 '}
                      {score.playerName}
                    </strong>
                  </div>
                  <div>
                    <strong>{score.score} points</strong>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
              <button className="btn btn-primary" onClick={backToLobby}>
                Back to Lobby
              </button>
              <button className="btn" onClick={backToHome}>
                New Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Loading game...</h2>
      </div>
    </div>
  );
};

export default GamePage;