require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

// Configure CORS origins based on environment
const getAllowedOrigins = () => {
  const origins = [];
  
  // Always allow localhost for development
  origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  
  // Allow production domain
  origins.push('https://quiz_game.void-industries.co.uk', 'http://quiz_game.void-industries.co.uk');
  
  // Allow local network access (for mobile testing)
  // This regex allows any local IP on port 3000
  origins.push(/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:3000$/);
  origins.push(/^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:3000$/);
  origins.push(/^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:3000$/);
  
  // If custom origins are specified in environment
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(','));
  }
  
  return origins;
};

const io = socketIo(server, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true
}));
app.use(express.json());

// Game state
const lobbies = new Map();
const players = new Map();

// Lobby model
class Lobby {
  constructor(hostId, settings) {
    this.id = uuidv4();
    this.hostId = hostId;
    this.players = new Map();
    this.maxPlayers = settings.maxPlayers || 4;
    this.difficulty = settings.difficulty || 'medium';
    this.questionCount = settings.questionCount || 10;
    this.category = settings.category || 'any';
    this.type = settings.type || 'any';
    this.isStarted = false;
    this.currentQuestion = 0;
    this.questions = [];
    this.gameState = 'lobby'; // lobby, countdown, question, results, finished
    this.questionTimer = null;
    this.scores = new Map();
    this.currentAnswers = new Map();
    this.chat = [];
  }

  addPlayer(playerId, playerName) {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }
    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      isHost: playerId === this.hostId,
      score: 0
    });
    this.scores.set(playerId, 0);
    return true;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    this.scores.delete(playerId);
    this.currentAnswers.delete(playerId);
  }

  addChatMessage(playerId, message) {
    const player = this.players.get(playerId);
    if (player) {
      this.chat.push({
        id: uuidv4(),
        playerId,
        playerName: player.name,
        message,
        timestamp: new Date().toISOString()
      });
    }
  }

  getTimePerQuestion() {
    switch (this.difficulty) {
      case 'easy': return 30000;
      case 'medium': return 15000;
      case 'hard': return 7000;
      default: return 15000;
    }
  }
}

// Mock data for when API is not available
const mockCategories = {
  trivia_categories: [
    { id: 9, name: "General Knowledge" },
    { id: 10, name: "Entertainment: Books" },
    { id: 11, name: "Entertainment: Film" },
    { id: 12, name: "Entertainment: Music" },
    { id: 17, name: "Science &amp; Nature" },
    { id: 18, name: "Science: Computers" },
    { id: 19, name: "Science: Mathematics" },
    { id: 21, name: "Sports" },
    { id: 22, name: "Geography" },
    { id: 23, name: "History" },
    { id: 24, name: "Politics" },
    { id: 25, name: "Art" },
    { id: 26, name: "Celebrities" },
    { id: 27, name: "Animals" }
  ]
};

const mockQuestions = [
  {
    question: "What is the capital of France?",
    correct_answer: "Paris",
    incorrect_answers: ["London", "Berlin", "Madrid"],
    type: "multiple",
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "Is the Earth round?",
    correct_answer: "True",
    incorrect_answers: ["False"],
    type: "boolean",
    difficulty: "easy",
    category: "Science &amp; Nature"
  },
  {
    question: "What year was JavaScript created?",
    correct_answer: "1995",
    incorrect_answers: ["1994", "1996", "1993"],
    type: "multiple",
    difficulty: "medium",
    category: "Science: Computers"
  },
  {
    question: "Which planet is closest to the sun?",
    correct_answer: "Mercury",
    incorrect_answers: ["Venus", "Earth", "Mars"],
    type: "multiple",
    difficulty: "easy",
    category: "Science &amp; Nature"
  },
  {
    question: "Is HTML a programming language?",
    correct_answer: "False",
    incorrect_answers: ["True"],
    type: "boolean",
    difficulty: "medium",
    category: "Science: Computers"
  }
];

// API Routes
app.get('/api/categories', async (req, res) => {
  try {
    const response = await axios.get('https://opentdb.com/api_category.php');
    res.json(response.data);
  } catch (error) {
    console.log('Using mock categories due to API unavailability');
    res.json(mockCategories);
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-lobby', (data) => {
    const { playerName, settings } = data;
    const lobby = new Lobby(socket.id, settings);
    lobby.addPlayer(socket.id, playerName);
    
    lobbies.set(lobby.id, lobby);
    players.set(socket.id, { lobbyId: lobby.id, playerName });
    
    socket.join(lobby.id);
    socket.emit('lobby-created', { lobbyId: lobby.id, lobby: getLobbyData(lobby) });
    socket.emit('lobby-data', { lobby: getLobbyData(lobby) });
  });

  socket.on('get-lobby', (data) => {
    const { lobbyId } = data;
    const lobby = lobbies.get(lobbyId);
    
    if (!lobby) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    socket.emit('lobby-data', { lobby: getLobbyData(lobby) });
  });

  socket.on('join-lobby', (data) => {
    const { lobbyId, playerName } = data;
    const lobby = lobbies.get(lobbyId);
    
    if (!lobby) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    if (lobby.isStarted) {
      socket.emit('error', { message: 'Game already started' });
      return;
    }

    if (!lobby.addPlayer(socket.id, playerName)) {
      socket.emit('error', { message: 'Lobby is full' });
      return;
    }

    players.set(socket.id, { lobbyId, playerName });
    socket.join(lobbyId);
    
    socket.emit('lobby-joined', { lobby: getLobbyData(lobby) });
    io.to(lobbyId).emit('lobby-updated', { lobby: getLobbyData(lobby) });
  });

  socket.on('send-chat', (data) => {
    const player = players.get(socket.id);
    if (!player) return;

    const lobby = lobbies.get(player.lobbyId);
    if (!lobby) return;

    lobby.addChatMessage(socket.id, data.message);
    io.to(lobby.id).emit('chat-message', {
      message: lobby.chat[lobby.chat.length - 1]
    });
  });

  socket.on('start-game', async () => {
    const player = players.get(socket.id);
    if (!player) return;

    const lobby = lobbies.get(player.lobbyId);
    if (!lobby || lobby.hostId !== socket.id) return;

    try {
      await startGame(lobby);
    } catch (error) {
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  socket.on('submit-answer', (data) => {
    const player = players.get(socket.id);
    if (!player) return;

    const lobby = lobbies.get(player.lobbyId);
    if (!lobby || lobby.gameState !== 'question') return;

    lobby.currentAnswers.set(socket.id, {
      answer: data.answer,
      timestamp: Date.now()
    });

    // Check if all players have answered
    if (lobby.currentAnswers.size === lobby.players.size) {
      processAnswers(lobby);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const player = players.get(socket.id);
    
    if (player) {
      const lobby = lobbies.get(player.lobbyId);
      if (lobby) {
        lobby.removePlayer(socket.id);
        
        if (lobby.players.size === 0) {
          // Clean up empty lobby
          if (lobby.questionTimer) {
            clearTimeout(lobby.questionTimer);
          }
          lobbies.delete(lobby.id);
        } else {
          // If host left, assign new host
          if (lobby.hostId === socket.id) {
            const newHost = lobby.players.keys().next().value;
            lobby.hostId = newHost;
            lobby.players.get(newHost).isHost = true;
          }
          io.to(lobby.id).emit('lobby-updated', { lobby: getLobbyData(lobby) });
        }
      }
      players.delete(socket.id);
    }
  });
});

// Helper functions
function getLobbyData(lobby) {
  return {
    id: lobby.id,
    hostId: lobby.hostId,
    players: Array.from(lobby.players.values()),
    maxPlayers: lobby.maxPlayers,
    difficulty: lobby.difficulty,
    questionCount: lobby.questionCount,
    category: lobby.category,
    type: lobby.type,
    isStarted: lobby.isStarted,
    gameState: lobby.gameState,
    currentQuestion: lobby.currentQuestion,
    chat: lobby.chat,
    scores: Array.from(lobby.scores.entries()).map(([id, score]) => ({
      playerId: id,
      playerName: lobby.players.get(id)?.name,
      score
    }))
  };
}

async function startGame(lobby) {
  lobby.isStarted = true;
  lobby.gameState = 'countdown';
  
  // Fetch questions from OpenTDB
  const questions = await fetchQuestions(lobby);
  lobby.questions = questions;
  
  io.to(lobby.id).emit('game-starting', { countdown: 5 });
  
  // Countdown
  let countdown = 5;
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      io.to(lobby.id).emit('countdown', { countdown });
    } else {
      clearInterval(countdownInterval);
      showNextQuestion(lobby);
    }
  }, 1000);
}

async function fetchQuestions(lobby) {
  try {
    let url = `https://opentdb.com/api.php?amount=${lobby.questionCount}`;
    
    if (lobby.category !== 'any') {
      url += `&category=${lobby.category}`;
    }
    
    if (lobby.type !== 'any') {
      url += `&type=${lobby.type}`;
    }
    
    url += `&difficulty=${lobby.difficulty}`;
    
    const response = await axios.get(url);
    return response.data.results.map((q, index) => ({
      id: index,
      question: q.question,
      correct_answer: q.correct_answer,
      incorrect_answers: q.incorrect_answers,
      all_answers: [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5),
      type: q.type,
      difficulty: q.difficulty,
      category: q.category
    }));
  } catch (error) {
    console.log('Using mock questions due to API unavailability');
    // Use mock questions as fallback
    const shuffledQuestions = [...mockQuestions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffledQuestions.slice(0, Math.min(lobby.questionCount, mockQuestions.length));
    
    return selectedQuestions.map((q, index) => ({
      id: index,
      question: q.question,
      correct_answer: q.correct_answer,
      incorrect_answers: q.incorrect_answers,
      all_answers: [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5),
      type: q.type,
      difficulty: q.difficulty,
      category: q.category
    }));
  }
}

function showNextQuestion(lobby) {
  if (lobby.currentQuestion >= lobby.questions.length) {
    endGame(lobby);
    return;
  }

  lobby.gameState = 'question';
  lobby.currentAnswers.clear();
  
  const question = lobby.questions[lobby.currentQuestion];
  const timePerQuestion = lobby.getTimePerQuestion();
  
  io.to(lobby.id).emit('new-question', {
    question,
    questionNumber: lobby.currentQuestion + 1,
    totalQuestions: lobby.questions.length,
    timeLimit: timePerQuestion
  });
  
  // Set timer for question
  lobby.questionTimer = setTimeout(() => {
    processAnswers(lobby);
  }, timePerQuestion);
}

function processAnswers(lobby) {
  if (lobby.questionTimer) {
    clearTimeout(lobby.questionTimer);
  }
  
  lobby.gameState = 'results';
  const question = lobby.questions[lobby.currentQuestion];
  const results = [];
  
  // Process each player's answer
  lobby.players.forEach((player, playerId) => {
    const answer = lobby.currentAnswers.get(playerId);
    const isCorrect = answer && answer.answer === question.correct_answer;
    
    if (isCorrect) {
      lobby.scores.set(playerId, lobby.scores.get(playerId) + 1);
    }
    
    results.push({
      playerId,
      playerName: player.name,
      answer: answer?.answer || 'No answer',
      isCorrect,
      score: lobby.scores.get(playerId)
    });
  });
  
  io.to(lobby.id).emit('question-results', {
    correctAnswer: question.correct_answer,
    results,
    scores: Array.from(lobby.scores.entries()).map(([id, score]) => ({
      playerId: id,
      playerName: lobby.players.get(id)?.name,
      score
    }))
  });
  
  // Move to next question after showing results
  setTimeout(() => {
    lobby.currentQuestion++;
    showNextQuestion(lobby);
  }, 5000);
}

function endGame(lobby) {
  lobby.gameState = 'finished';
  
  const finalScores = Array.from(lobby.scores.entries())
    .map(([id, score]) => ({
      playerId: id,
      playerName: lobby.players.get(id)?.name,
      score
    }))
    .sort((a, b) => b.score - a.score);
  
  io.to(lobby.id).emit('game-finished', {
    finalScores,
    totalQuestions: lobby.questions.length
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});