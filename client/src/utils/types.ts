export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: string;
}

export interface Question {
  id: number;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  all_answers: string[];
  type: string;
  difficulty: string;
  category: string;
}

export interface Lobby {
  id: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  category: string;
  type: string;
  isStarted: boolean;
  gameState: 'lobby' | 'countdown' | 'question' | 'results' | 'finished';
  currentQuestion: number;
  chat: ChatMessage[];
  scores: Array<{
    playerId: string;
    playerName: string;
    score: number;
  }>;
}

export interface LobbySettings {
  maxPlayers: number;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  category: string;
  type: string;
}

export interface QuestionResult {
  playerId: string;
  playerName: string;
  answer: string;
  isCorrect: boolean;
  score: number;
}

export interface Category {
  id: number;
  name: string;
}