import React, { useState, useEffect, useRef } from 'react';
import './App.css';

import ArrowBack from "./assets/icons/arrow-back.png";
import bitcoin from './assets/icons/bitcoin.png';
import coin from './assets/icons/coin.png';
import groups from "./assets/icons/groups.png";

import candleLeftImg from "./assets/candle-left.png";
import candleRightImg from "./assets/candle-right.png";
import adamImg from "./assets/adam.png";
import evolutionImg from "./assets/evolution.png";
import fastFoodPressImg from "./assets/fast-food-press.png";
import fruitPressImg from "./assets/fruit-press.png";
import charizardLeft from "./assets/charizard-left.png";
import charizardRight from "./assets/charizard-right.png";
import chariPresGif from "./assets/chari-pres.gif";
import bluePressGif from "./assets/blue-press.gif";

const allImgs = [
  { image1: candleLeftImg, image2: candleRightImg, image3: chariPresGif, image4: bluePressGif },
  { image1: adamImg, image2: evolutionImg, image3: chariPresGif, image4: bluePressGif },
  { image1: fastFoodPressImg, image2: fruitPressImg, image3: chariPresGif, image4: bluePressGif },
  { image1: charizardLeft, image2: charizardRight, image3: chariPresGif, image4: bluePressGif },
];

const App = () => {
  const [gameState, setGameState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [playerChoice, setPlayerChoice] = useState(null);
  const [results, setResults] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [choiceCounts, setChoiceCounts] = useState({ left: 0, right: 0, total: 0 });
  const [postResultTimer, setPostResultTimer] = useState(0);

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
        setPostResultTimer(0);
        break;

      case 'TIMER_UPDATE':
        setGameState(prev => ({ ...prev, timeLeft: data.timeLeft }));
        break;

      case 'POST_RESULT_TIMER':
        setPostResultTimer(data.timeLeftAfterResult);
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
        setPostResultTimer(data.gameState.timeLeftAfterResult || 3);
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

  const currentImageIndex = (gameState.currentRound - 1) % allImgs.length;
  const currentImages = allImgs[currentImageIndex];

  return (
    <div className="app">
      <main className="game-area">

        <div className="flex w-[500px] justify-between items-center !my-2">
          {/* Back Arrow Button */}
          <div className="bg-white w-6 h-6 rounded-full flex justify-center items-center">
            <img src={ArrowBack} alt="Back" className="w-4 h-4" />
          </div>

          {/* Bitcoin Count */}
          <div className="bg-white !px-3 !py-1 rounded-md">
            <div className="flex items-center justify-center">
              <p className="mr-1 text-gray-600 font-medium text-lg">3</p>
              <img src={bitcoin} alt="Bitcoin Icon" className="w-5 h-5" />
            </div>
          </div>

          {/* Coin Amount */}
          <div className="bg-white !px-3 !py-1 rounded-md">
            <div className="flex items-center justify-center">
              <p className="!mr-1 text-gray-600 font-medium text-lg">0.25</p>
              <img src={coin} alt="Coin Icon" className="w-5 h-5" />
            </div>
          </div>
        </div>


        <div className="game-image relative z-0">
          <div className="image-placeholder">
            <div className="flex-1 flex flex-col items-center justify-center relative w-[50vw] h-[80vh] bg-[#4b5563]">
              <button
                className={`choice-btn left w-full p-4 ${!gameState.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => makeChoice('left')}
                disabled={!gameState.isActive || gameState.gameEnded}
              >
                {/* <div className="choice-label">LEFT</div> */}
                <img
                  src={currentImages.image1}
                  alt="Left choice"
                  className="w-full"
                />
                {/* <div className="choice-count">{choiceCounts.left} players</div> */}
              </button>
              {results?.winningSide === 'left' && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-green-600 font-bold bg-white px-4 py-2 rounded shadow">
                  🏆 WINNER!
                </div>
              )}
            </div>
            <div className="divider-line w-1 h-64 bg-gray-300 mx-4"></div>
            <div className="flex-1 flex flex-col items-center justify-center relative w-[50vw] h-[80vh] bg-[#4b5563]">
              <button
                className={`choice-btn right w-full p-4 ${!gameState.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => makeChoice('right')}
                disabled={!gameState.isActive || gameState.gameEnded}
              >
                {/* <div className="choice-label">RIGHT</div> */}
                <img
                  src={currentImages.image2}
                  alt="Right choice"
                  className="w-full"
                />
                {/* <div className="choice-count">{choiceCounts.right} players</div> */}
              </button>
              {results?.winningSide === 'right' && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-green-600 font-bold bg-white px-4 py-2 rounded shadow">
                  🏆 WINNER!
                </div>
              )}
            </div>
          </div>

          <div className='absolute top-5 left-5 flex items-center justify-center bg-red-500 text-white rounded-[6px] !px-3 !py-1'>
            <p className='font-semibold text-white text-[14px]'>{choiceCounts.total}
              <span className='text-[13px] !ml-1'>LIVE</span>
            </p>
          </div>


          <div className='game-info absolute top-5 right-5 flex items-center justify-center'>
            <span className={`timer ${gameState.timeLeft <= 3 ? 'urgent' : ''} text-[18px]`}>
              {gameState.timeLeft}
            </span>
          </div>

          {gameState.timeLeft <= 3 && !gameState.gameEnded && (
            <div className="locked-message absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/ z-20">
              🔒 Choices locked! Calculating results...
            </div>

          )}

          {results?.winningSide === 'tie' && (
            <div className="tie-message absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/ z-20">🤝 It's a tie! Everyone wins!</div>
          )}

          {
            gameState.gameEnded &&
            <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/ z-20'>
              <p className='text-[80px] text-white font-semibold'>{postResultTimer}</p>
            </div>
          }

        </div>

        {/* {results && (
          <div className="results-section">
            {playerChoice && (
              <div className={`player-result ${(results.winningSide === playerChoice) || results.winningSide === 'tie' ? 'won' : 'lost'}`}>
                {(results.winningSide === playerChoice) || results.winningSide === 'tie'
                  ? '🎉 You won this round!'
                  : '😔 Better luck next time!'}
              </div>
            )}

            <div className="next-round">
              Next round starts in {postResultTimer} seconds...
            </div>
          </div>
        )} */}

        <div className='fixed z-50 bottom-0 flex flex-row w-full py-1  bg-[#252525]'>
          <div className='!w-full !max-w-[500px] !mx-auto !flex !justify-between !items-center !py-1'>
            <div>
              <p className='text-[9px] mt-[2px] md:text-[12px] text-gray-500 font-semibold'>My Account</p>
            </div>

            <div>
              <p className='text-[9px] mt-[2px] md:text-[12px] text-gray-500 font-semibold'>Deposit</p>
            </div>

            <div>
              <p className='text-[9px] mt-[2px] md:text-[12px] text-gray-500 font-semibold'>Go Live</p>
            </div>

            <div>
              <p className='text-[9px] mt-[2px] md:text-[12px] text-gray-500 font-semibold'>Rewards</p>
            </div>

            <div>
              <p className='text-[9px] mt-[2px] md:text-[12px] text-gray-500 font-semibold'>Withdraw</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;