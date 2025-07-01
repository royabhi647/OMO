import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App = () => {
  const [gameState, setGameState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [playerChoice, setPlayerChoice] = useState(null);
  const [results, setResults] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [choiceCounts, setChoiceCounts] = useState({ left: 0, right: 0, total: 0 });

  const wsRef = useRef(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    const ws = new WebSocket('ws://localhost:5000');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to server');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from server');
      // Auto-reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'GAME_STATE':
        setGameState(data.gameState);
        setPlayerId(data.playerId);
        break;

      case 'NEW_ROUND':
        setGameState(data.gameState);
        setPlayerChoice(null);
        setResults(null);
        break;

      case 'TIMER_UPDATE':
        setGameState(prev => ({ ...prev, timeLeft: data.timeLeft }));
        break;

      case 'CHOICE_UPDATE':
        setChoiceCounts({
          left: data.leftCount,
          right: data.rightCount,
          total: data.totalPlayers
        });
        break;

      case 'CHOICES_LOCKED':
        setGameState(data.gameState);
        break;

      case 'GAME_RESULTS':
        setResults(data.results);
        setGameState(data.gameState);
        break;

      case 'PLAYER_COUNT_UPDATE':
        setChoiceCounts(prev => ({ ...prev, total: data.totalPlayers }));
        break;

      default:
        break;
    }
  };

  const makeChoice = (choice) => {
    if (gameState && gameState.isActive && !gameState.gameEnded && wsRef.current) {
      setPlayerChoice(choice);
      wsRef.current.send(JSON.stringify({
        type: 'MAKE_CHOICE',
        choice: choice
      }));
    }
  };

  const setPlayerUsername = () => {
    if (username && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'SET_USERNAME',
        username: username
      }));
    }
  };

  if (!isConnected) {
    return (
      <div className="app">
        <div className="loading">
          <h2>Connecting to game server...</h2>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="app">
        <div className="loading">
          <h2>Loading game...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="game-header">
        <h1>🎯 Choice Master</h1>
        <div className="game-info">
          <span>Round: {gameState.currentRound}</span>
          <span>Players: {choiceCounts.total}</span>
          <span className={`timer ${gameState.timeLeft <= 3 ? 'urgent' : ''}`}>
            ⏱ {gameState.timeLeft}s
          </span>
        </div>
      </header>

      <div className="username-section">
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && setPlayerUsername()}
        />
        <button onClick={setPlayerUsername}>Set Username</button>
      </div>

      <main className="game-area">
        <div className="game-image">
          <div className="image-placeholder">
            <span>🖼 Game Image #{gameState.currentRound}</span>
            <div className="divider-line"></div>
          </div>
        </div>

        <div className="choice-section">
          <div className="choice-buttons">
            <button
              className={`choice-btn left ${playerChoice === 'left' ? 'selected' : ''} ${!gameState.isActive ? 'disabled' : ''}`}
              onClick={() => makeChoice('left')}
              disabled={!gameState.isActive || gameState.gameEnded}
            >
              <div className="choice-label">LEFT</div>
              <div className="choice-count">{choiceCounts.left} players</div>
            </button>

            <button
              className={`choice-btn right ${playerChoice === 'right' ? 'selected' : ''} ${!gameState.isActive ? 'disabled' : ''}`}
              onClick={() => makeChoice('right')}
              disabled={!gameState.isActive || gameState.gameEnded}
            >
              <div className="choice-label">RIGHT</div>
              <div className="choice-count">{choiceCounts.right} players</div>
            </button>
          </div>

          {playerChoice && (
            <div className="player-choice">
              Your choice: <strong>{playerChoice.toUpperCase()}</strong>
              {gameState.isActive && (
                <small>You can change your choice until time runs out!</small>
              )}
            </div>
          )}
        </div>

        {gameState.timeLeft <= 3 && !gameState.gameEnded && (
          <div className="locked-message">
            🔒 Choices locked! Calculating results...
          </div>
        )}

        {results && (
          <div className="results-section">
            <h2>Round Results</h2>
            <div className="results-grid">
              <div className={`result-item left ${results.winingSide === 'left' ? 'winner' : ''}`}>
                <h3>LEFT</h3>
                <div className="percentage">{results.leftPercent}%</div>
                <div className="count">{results.leftCount} players</div>
                {results.winingSide === 'left' && <div className="winner-badge">🏆 WINNER!</div>}
              </div>

              <div className={`result-item right ${results.winingSide === 'right' ? 'winner' : ''}`}>
                <h3>RIGHT</h3>
                <div className="percentage">{results.rightPercent}%</div>
                <div className="count">{results.rightCount} players</div>
                {results.winingSide === 'right' && <div className="winner-badge">🏆 WINNER!</div>}
              </div>
            </div>

            {results.winingSide === 'tie' && (
              <div className="tie-message">🤝 It's a tie! Everyone wins!</div>
            )}

            {playerChoice && (
              <div className={`player-result ${(results.winingSide === playerChoice) || results.winingSide === 'tie' ? 'won' : 'lost'
                }`}>
                {(results.winingSide === playerChoice) || results.winingSide === 'tie'
                  ? '🎉 You won this round!'
                  : '😔 Better luck next time!'}
              </div>
            )}

            <div className="next-round">
              Next round starts in {gameState.timeLeft} seconds...
            </div>
          </div>
        )}

        <div className="game-rules">
          <h3>🕹 How to Play:</h3>
          <ul>
            <li>Choose LEFT or RIGHT before time runs out</li>
            <li>You can change your choice until 3 seconds remain</li>
            <li>The side with <strong>fewer players</strong> wins!</li>
            <li>New round starts every 10 seconds</li>
            <li>Think strategically - avoid the crowd!</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default App;