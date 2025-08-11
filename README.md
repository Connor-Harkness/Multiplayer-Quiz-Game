# Multiplayer Quiz Game

A real-time multiplayer quiz game built with Node.js, Express, Socket.io, and React.

## Features

### Lobby System
- Create and join lobbies with unique IDs
- Player management (2-64 players per lobby)
- Real-time chat functionality
- Configurable game settings:
  - Difficulty levels (Easy: 30s, Medium: 15s, Hard: 7s per question)
  - Number of questions (1-50)
  - Quiz categories (from OpenTDB API)
  - Question types (Multiple Choice, True/False, or Any)
- Scrollable player list with host designation

### Game Features
- Real-time synchronized gameplay using Socket.io
- Questions sourced from the Open Trivia Database (OpenTDB) API
- Timer-based questions with automatic progression
- Real-time answer collection and scoring
- Question results display showing correct/incorrect answers
- Final leaderboard with rankings

### Technical Features
- Responsive design that works on desktop and mobile
- TypeScript support for better development experience
- Real-time communication via WebSockets
- Clean, modern UI with glassmorphism design
- Error handling and connection status indicators

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Connor-Harkness/Multiplayer-Quiz-Game.git
cd Multiplayer-Quiz-Game
```

2. Install dependencies for all components:
```bash
npm run install-all
```

Or install individually:
```bash
# Root dependencies
npm install

# Server dependencies
cd server && npm install

# Client dependencies
cd client && npm install
```

## Running the Application

### Development Mode
Run both server and client simultaneously:
```bash
npm run dev
```

### Accessing from Mobile Devices (Development)
To test on mobile browsers using your local IP address:

1. Find your local IP address:
   ```bash
   # On Windows
   ipconfig
   
   # On macOS/Linux  
   ifconfig | grep inet
   ```

2. The client will automatically connect to the server using the same hostname/IP you're accessing it from. No additional configuration needed!

3. Access the game from your mobile browser using your local IP:
   ```
   http://192.168.1.100:3000  # Replace with your actual IP
   ```

### Custom Server URL (Optional)
If you need to specify a custom server URL, create a `.env.local` file in the `client` directory:
```bash
REACT_APP_SERVER_URL=http://192.168.1.100:5000
```

### Production Mode
1. Build the client:
```bash
cd client && npm run build
```

2. Start the server:
```bash
npm start
```

### Individual Components

Start the server only:
```bash
npm run server
```

Start the client only:
```bash
npm run client
```

## How to Play

1. **Create a Lobby**: Enter your name and click "Create Lobby" to set up a new game
2. **Configure Settings**: Choose difficulty, number of questions, category, and question type
3. **Share Lobby ID**: Give the lobby ID to friends so they can join
4. **Start Game**: Once you have enough players (minimum 2), the host can start the game
5. **Answer Questions**: Everyone sees the same questions simultaneously with time limits
6. **View Results**: After each question, see who got it right and current scores
7. **Final Scores**: At the end, view the final leaderboard with rankings

## Game Settings

- **Difficulty**:
  - Easy: 30 seconds per question
  - Medium: 15 seconds per question  
  - Hard: 7 seconds per question

- **Players**: 2-64 players per lobby
- **Questions**: 1-50 questions per game
- **Categories**: All categories from OpenTDB API
- **Types**: Multiple Choice, True/False, or Any

## Technology Stack

### Backend
- Node.js
- Express.js
- Socket.io
- Axios (for OpenTDB API calls)
- UUID (for unique identifiers)
- dotenv (for environment configuration)

### Frontend
- React 18
- TypeScript
- React Router
- Socket.io Client
- Axios

### Cross-Origin Resource Sharing (CORS)
The application is configured to work across different environments:
- **Development**: Supports localhost and local IP addresses for mobile testing
- **Production**: Configured for `https://quiz_game.void-industries.co.uk`
- **Mobile Browser Support**: Automatically detects and connects to the appropriate server URL
- **Custom Deployment**: Environment variables allow for flexible configuration

## Deployment

### Production Deployment
1. Set environment variables in the server:
   ```bash
   PORT=5000
   ALLOWED_ORIGINS=https://quiz_game.void-industries.co.uk
   ```

2. Build the client for production:
   ```bash
   cd client && npm run build
   ```

3. Serve the built client files and start the server on the target domain.

The application will automatically handle CORS for the configured production domain.

## API Reference

The game uses the [Open Trivia Database (OpenTDB)](https://opentdb.com/) API for questions. See `openTDB_docs.md` for detailed API documentation.

## License

MIT License
