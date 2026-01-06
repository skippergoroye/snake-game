"use client";

import React, { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { configureStore, createSlice } from "@reduxjs/toolkit";

// Game constants
const GRID_SIZE = 20;
const CELL_SIZE = 25;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 1, y: 0 };
const GAME_SPEED = 300;
const BONUS_SPAWN_CHANCE = 0.15; // 15% chance to spawn bonus food when eating regular food
const BONUS_DURATION = 5000; // Bonus food lasts 5 seconds
const BONUS_POINTS = 50; // Bonus food gives 50 points

// Redux Slice
const gameSlice = createSlice({
  name: "game",
  initialState: {
    snake: INITIAL_SNAKE,
    direction: INITIAL_DIRECTION,
    nextDirection: INITIAL_DIRECTION,
    food: { x: 15, y: 15 },
    bonusFood: null as { x: number; y: number; spawnTime: number } | null,
    score: 0,
    gameOver: false,
    isPaused: false,
    highScore: 0,
  },
  reducers: {
    setDirection: (state, action) => {
      const { x, y } = action.payload;
      // Prevent reversing direction
      if (state.direction.x + x !== 0 || state.direction.y + y !== 0) {
        state.nextDirection = { x, y };
      }
    },
    moveSnake: (state) => {
      if (state.gameOver || state.isPaused) return;

      state.direction = state.nextDirection;
      const head = state.snake[0];
      const newHead = {
        x: (head.x + state.direction.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + state.direction.y + GRID_SIZE) % GRID_SIZE,
      };

      // Check collision with self
      if (state.snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        state.gameOver = true;
        if (state.score > state.highScore) {
          state.highScore = state.score;
        }
        return;
      }

      const newSnake = [newHead, ...state.snake];
      let foodEaten = false;

      // Check if regular food is eaten
      if (newHead.x === state.food.x && newHead.y === state.food.y) {
        state.score += 10;
        foodEaten = true;

        // Generate new food position
        let newFoodPos: { x: number; y: number };
        do {
          newFoodPos = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
          };
        } while (
          newSnake.some((segment) => segment.x === newFoodPos.x && segment.y === newFoodPos.y) ||
          (state.bonusFood && state.bonusFood.x === newFoodPos.x && state.bonusFood.y === newFoodPos.y)
        );

        state.food = newFoodPos;

        // Chance to spawn bonus food
        if (Math.random() < BONUS_SPAWN_CHANCE && !state.bonusFood) {
          let bonusFoodPos: { x: number; y: number };

          do {
            bonusFoodPos = {
              x: Math.floor(Math.random() * GRID_SIZE),
              y: Math.floor(Math.random() * GRID_SIZE),
            };
          } while (
            newSnake.some((segment) => segment.x === bonusFoodPos.x && segment.y === bonusFoodPos.y) ||
            (bonusFoodPos.x === state.food.x && bonusFoodPos.y === state.food.y)
          );

          state.bonusFood = {
            ...bonusFoodPos,
            spawnTime: Date.now(),
          };
        }
      }

      // Check if bonus food is eaten
      if (state.bonusFood && newHead.x === state.bonusFood.x && newHead.y === state.bonusFood.y) {
        state.score += BONUS_POINTS;
        state.bonusFood = null;
        foodEaten = true;
      }

      // If no food was eaten, remove tail
      if (!foodEaten) {
        newSnake.pop();
      }

      state.snake = newSnake;
    },
    checkBonusFoodExpiry: (state) => {
      if (state.bonusFood && Date.now() - state.bonusFood.spawnTime > BONUS_DURATION) {
        state.bonusFood = null;
      }
    },
    togglePause: (state) => {
      if (!state.gameOver) {
        state.isPaused = !state.isPaused;
      }
    },
    resetGame: (state) => {
      state.snake = INITIAL_SNAKE;
      state.direction = INITIAL_DIRECTION;
      state.nextDirection = INITIAL_DIRECTION;
      state.food = { x: 15, y: 15 };
      state.bonusFood = null;
      state.score = 0;
      state.gameOver = false;
      state.isPaused = false;
    },
  },
});

const { setDirection, moveSnake, togglePause, resetGame, checkBonusFoodExpiry } = gameSlice.actions;

// Redux Store
export const store = configureStore({
  reducer: {
    game: gameSlice.reducer,
  },
});

const SnakeGame = () => {
  const dispatch = useDispatch();
  const { snake, food, bonusFood, score, gameOver, isPaused, highScore } = useSelector(
    (state: { game: any }) => state.game
  );

  // Handle keyboard input
  const handleKeyPress = useCallback(
    (e: { preventDefault: () => void; key: any; }) => {
      e.preventDefault();
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          dispatch(setDirection({ x: 0, y: -1 }));
          break;
        case "ArrowDown":
        case "s":
        case "S":
          dispatch(setDirection({ x: 0, y: 1 }));
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          dispatch(setDirection({ x: -1, y: 0 }));
          break;
        case "ArrowRight":
        case "d":
        case "D":
          dispatch(setDirection({ x: 1, y: 0 }));
          break;
        case " ":
          dispatch(togglePause());
          break;
        case "r":
        case "R":
          if (gameOver) dispatch(resetGame());
          break;
      }
    },
    [dispatch, gameOver]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(moveSnake());
      dispatch(checkBonusFoodExpiry());
    }, GAME_SPEED);

    return () => clearInterval(interval);
  }, [dispatch]);

  return (
    <div className="min-h-screen  from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center p-8 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
            animation: "gridScroll 20s linear infinite",
          }}
        ></div>
      </div>

      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap");

        @keyframes gridScroll {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes bonusPulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        @keyframes bonusGlow {
          0%,
          100% {
            box-shadow: 0 0 30px rgba(251, 191, 36, 0.9), 0 0 60px rgba(251, 191, 36, 0.6),
              0 0 90px rgba(251, 191, 36, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(251, 191, 36, 1), 0 0 80px rgba(251, 191, 36, 0.8),
              0 0 120px rgba(251, 191, 36, 0.5);
          }
        }

        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3),
              inset 0 0 20px rgba(139, 92, 246, 0.2);
          }
          50% {
            box-shadow: 0 0 30px rgba(236, 72, 153, 0.6), 0 0 60px rgba(236, 72, 153, 0.4),
              inset 0 0 30px rgba(236, 72, 153, 0.3);
          }
        }

        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .neon-text {
          text-shadow: 0 0 10px rgba(139, 92, 246, 0.8), 0 0 20px rgba(139, 92, 246, 0.6),
            0 0 30px rgba(139, 92, 246, 0.4);
        }

        .neon-border {
          border: 2px solid rgba(139, 92, 246, 0.6);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3), inset 0 0 20px rgba(139, 92, 246, 0.1);
        }
      `}</style>

      <div className="relative z-10 flex flex-col items-center gap-8" style={{ animation: "slideIn 0.8s ease-out" }}>
        {/* Header */}
        <div className="text-center">
          <h1
            className="text-7xl font-black mb-2 neon-text tracking-wider"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            SNAKE<span className="text-pink-500">_</span>NEON
          </h1>
          <p
            className="text-purple-300 text-sm tracking-widest"
            style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 500 }}
          >
            RETRO ARCADE EXPERIENCE
          </p>
        </div>

        {/* Score Display */}
        <div className="flex gap-8 text-center" style={{ fontFamily: "Orbitron, sans-serif" }}>
          <div className="bg-black/40 backdrop-blur-sm px-8 py-4 rounded-lg neon-border">
            <div className="text-purple-400 text-xs tracking-wider mb-1">SCORE</div>
            <div className="text-4xl font-bold text-cyan-400 neon-text">{score}</div>
          </div>
          <div className="bg-black/40 backdrop-blur-sm px-8 py-4 rounded-lg neon-border">
            <div className="text-purple-400 text-xs tracking-wider mb-1">HIGH SCORE</div>
            <div className="text-4xl font-bold text-pink-400 neon-text">{highScore}</div>
          </div>
        </div>

        {/* Bonus Food Info */}
        {bonusFood && (
          <div
            className="bg-amber-500/20 backdrop-blur-sm px-6 py-3 rounded-lg border-2 border-amber-500/60"
            style={{
              animation: "bonusPulse 1s ease-in-out infinite",
              fontFamily: "Rajdhani, sans-serif",
            }}
          >
            <div className="text-amber-300 text-sm font-bold tracking-wider flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              BONUS FOOD ACTIVE! +{BONUS_POINTS} POINTS
              <span className="text-2xl">⭐</span>
            </div>
          </div>
        )}

        {/* Game Board */}
        <div className="relative">
          <div
            className="neon-border bg-black/60 backdrop-blur-sm rounded-lg p-2 relative"
            style={{
              width: GRID_SIZE * CELL_SIZE + 16,
              height: GRID_SIZE * CELL_SIZE + 16,
              animation: "glow 3s ease-in-out infinite",
            }}
          >
            {/* Grid cells */}
            <div className="relative" style={{ width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE }}>
              {/* Snake */}
              {snake.map((segment: { x: number; y: number; }, index: React.Key | null | undefined) => (
                <div
                  key={index}
                  className="absolute transition-all duration-100"
                  style={{
                    left: segment.x * CELL_SIZE,
                    top: segment.y * CELL_SIZE,
                    width: CELL_SIZE - 2,
                    height: CELL_SIZE - 2,
                    background:
                      index === 0
                        ? "linear-gradient(135deg, #ec4899, #a855f7)"
                        : "linear-gradient(135deg, #8b5cf6, #6366f1)",
                    borderRadius: "4px",
                    boxShadow:
                      index === 0
                        ? "0 0 20px rgba(236, 72, 153, 0.8), 0 0 40px rgba(236, 72, 153, 0.4)"
                        : "0 0 15px rgba(139, 92, 246, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                />
              ))}

              {/* Regular Food */}
              <div
                className="absolute"
                style={{
                  left: food.x * CELL_SIZE,
                  top: food.y * CELL_SIZE,
                  width: CELL_SIZE - 2,
                  height: CELL_SIZE - 2,
                  background: "radial-gradient(circle, #22d3ee, #06b6d4)",
                  borderRadius: "50%",
                  boxShadow: "0 0 30px rgba(34, 211, 238, 0.9), 0 0 60px rgba(34, 211, 238, 0.5)",
                  animation: "pulse 1s ease-in-out infinite",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                }}
              />

              {/* Bonus Food */}
              {bonusFood && (
                <div
                  className="absolute flex items-center justify-center"
                  style={{
                    left: bonusFood.x * CELL_SIZE,
                    top: bonusFood.y * CELL_SIZE,
                    width: CELL_SIZE - 2,
                    height: CELL_SIZE - 2,
                    background: "radial-gradient(circle, #fbbf24, #f59e0b, #d97706)",
                    borderRadius: "50%",
                    animation: "bonusGlow 1s ease-in-out infinite",
                    border: "3px solid rgba(255, 255, 255, 0.5)",
                    fontSize: "16px",
                  }}
                >
                  <span style={{ filter: "drop-shadow(0 0 2px rgba(0, 0, 0, 0.8))" }}>⭐</span>
                </div>
              )}

              {/* Game Over Overlay */}
              {gameOver && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center rounded-lg">
                  <div className="text-center" style={{ animation: "slideIn 0.5s ease-out" }}>
                    <div
                      className="text-6xl font-black text-pink-500 mb-4 neon-text"
                      style={{ fontFamily: "Orbitron, sans-serif" }}
                    >
                      GAME OVER
                    </div>
                    <div className="text-2xl text-purple-300 mb-6" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                      Final Score: <span className="text-cyan-400 font-bold">{score}</span>
                    </div>
                    <button
                      onClick={() => dispatch(resetGame())}
                      className="from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 neon-border"
                      style={{ fontFamily: "Orbitron, sans-serif" }}
                    >
                      RESTART [R]
                    </button>
                  </div>
                </div>
              )}

              {/* Pause Overlay */}
              {isPaused && !gameOver && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center rounded-lg">
                  <div
                    className="text-5xl font-black text-purple-400 neon-text"
                    style={{ fontFamily: "Orbitron, sans-serif" }}
                  >
                    PAUSED
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="text-center space-y-4" style={{ fontFamily: "Rajdhani, sans-serif" }}>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => dispatch(togglePause())}
              disabled={gameOver}
              className="bg-purple-600/50 hover:bg-purple-600/70 disabled:opacity-30 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 neon-border"
            >
              {isPaused ? "RESUME" : "PAUSE"} [SPACE]
            </button>
            <button
              onClick={() => dispatch(resetGame())}
              className="bg-pink-600/50 hover:bg-pink-600/70 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 neon-border"
            >
              RESET [R]
            </button>
          </div>

          <div className="text-purple-300 text-sm space-y-1">
            <div>↑ ↓ ← → or W A S D to move</div>
            <div>SPACE to pause • R to restart</div>
            <div className="text-amber-300 font-bold mt-2">⭐ Bonus Food: +{BONUS_POINTS} pts (5s duration)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;
