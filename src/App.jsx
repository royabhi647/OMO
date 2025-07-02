import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import candleLeftImg from "./assets/candle-left.png";
import candleRightImg from "./assets/candle-right.png";
import yodaLeftImg from "./assets/yoda-left.png";
import yodaRightImg from "./assets/yoda-right.png";

const allImgs = [
  { image1: candleLeftImg, image2: candleRightImg },
  // { image1: yodaLeftImg, image2: yodaRightImg }
];

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

  // Determine current image pair based on round
  const currentImageIndex = (gameState.currentRound - 1) % allImgs.length;
  const currentImages = allImgs[currentImageIndex];

  return (
    <div className="app">
      <main className="game-area">
        <div className="game-image">
          <div className="image-placeholder flex justify-between w-full max-w-md mx-auto">
            <div className="left-side flex-1 flex flex-col items-center">
              <button
                className={`choice-btn left w-full p-4 ${!gameState.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => makeChoice('left')}
                disabled={!gameState.isActive || gameState.gameEnded}
              >
                {/* <div className="choice-label">LEFT</div> */}
                <img
                  src={currentImages.image1}
                  alt="Left choice"
                  className="w-full mb-4 h-auto"
                />
                {/* <div className="choice-count">{choiceCounts.left} players</div> */}
              </button>
            </div>
            <div className="divider-line w-1 h-64 bg-gray-300 mx-4"></div>
            <div className="right-side flex-1 flex flex-col items-center">
              <button
                className={`choice-btn right w-full p-4 ${!gameState.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => makeChoice('right')}
                disabled={!gameState.isActive || gameState.gameEnded}
              >
                {/* <div className="choice-label">RIGHT</div> */}
                <img
                  src={currentImages.image2}
                  alt="Right choice"
                  className="w-full mb-4 h-auto"
                />
                {/* <div className="choice-count">{choiceCounts.right} players</div> */}
              </button>
            </div>
          </div>

          <div className='absolute top-5 left-5 flex items-center justify-center bg-red-500 text-white rounded-[6px] px-4 py-2'>
            <p className=''>Players: {choiceCounts.total}</p>
          </div>


          <div className='game-info absolute top-5 right-5 flex items-center justify-center'>
            <span className={`timer ${gameState.timeLeft <= 3 ? 'urgent' : ''} text-[18px]`}>
              {gameState.timeLeft}
            </span>
          </div>

        </div>

        <div className="choice-section">
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
              <div className={`result-item left ${results.winningSide === 'left' ? 'winner' : ''}`}>
                <h3>LEFT</h3>
                <div className="percentage">{results.leftPercent}%</div>
                <div className="count">{results.leftCount} players</div>
                {results.winningSide === 'left' && <div className="winner-badge">🏆 WINNER!</div>}
              </div>

              <div className={`result-item right ${results.winningSide === 'right' ? 'winner' : ''}`}>
                <h3>RIGHT</h3>
                <div className="percentage">{results.rightPercent}%</div>
                <div className="count">{results.rightCount} players</div>
                {results.winningSide === 'right' && <div className="winner-badge">🏆 WINNER!</div>}
              </div>
            </div>

            {results.winningSide === 'tie' && (
              <div className="tie-message">🤝 It's a tie! Everyone wins!</div>
            )}

            {playerChoice && (
              <div className={`player-result ${(results.winningSide === playerChoice) || results.winningSide === 'tie' ? 'won' : 'lost'}`}>
                {(results.winningSide === playerChoice) || results.winningSide === 'tie'
                  ? '🎉 You won this round!'
                  : '😔 Better luck next time!'}
              </div>
            )}

            <div className="next-round">
              Next round starts in {gameState.timeLeft} seconds...
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;