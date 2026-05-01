//
// Copyright 2026 DXOS.org
//

import { checkWin, getValidMoves } from './game-logic';

/** Returns the opposing marker. */
const opponent = (marker: 'X' | 'O'): 'X' | 'O' => (marker === 'X' ? 'O' : 'X');

/** Returns a new board string with the marker placed at index. */
const tryPlace = (board: string, index: number, marker: string): string =>
  board.slice(0, index) + marker + board.slice(index + 1);

/** Returns a random valid move. */
const easyMove = (validMoves: number[]): number => {
  const index = Math.floor(Math.random() * validMoves.length);
  return validMoves[index];
};

/**
 * Heuristic move selection:
 * 1. Win if possible.
 * 2. Block opponent's win.
 * 3. Prefer center.
 * 4. Prefer corners.
 * 5. Random.
 */
const mediumMove = (
  board: string,
  size: number,
  winCondition: number,
  marker: 'X' | 'O',
  validMoves: number[],
): number => {
  const opp = opponent(marker);

  // Win if possible.
  for (const move of validMoves) {
    const next = tryPlace(board, move, marker);
    const result = checkWin(next, size, winCondition);
    if (result === `${marker.toLowerCase()}-wins`) {
      return move;
    }
  }

  // Block opponent's win.
  for (const move of validMoves) {
    const next = tryPlace(board, move, opp);
    const result = checkWin(next, size, winCondition);
    if (result === `${opp.toLowerCase()}-wins`) {
      return move;
    }
  }

  // Prefer center.
  const center = Math.floor((size * size) / 2);
  if (validMoves.includes(center)) {
    return center;
  }

  // Prefer corners.
  const corners = [0, size - 1, size * (size - 1), size * size - 1];
  const availableCorners = corners.filter((c) => validMoves.includes(c));
  if (availableCorners.length > 0) {
    return easyMove(availableCorners);
  }

  // Random.
  return easyMove(validMoves);
};

/**
 * Minimax with alpha-beta pruning.
 * Score: win = 10-depth, loss = depth-10, draw = 0.
 */
const minimax = (
  board: string,
  size: number,
  winCondition: number,
  depth: number,
  isMaximizing: boolean,
  aiMarker: 'X' | 'O',
  alpha: number,
  beta: number,
): number => {
  const result = checkWin(board, size, winCondition);
  const opp = opponent(aiMarker);

  if (result === `${aiMarker.toLowerCase()}-wins`) {
    return 10 - depth;
  }
  if (result === `${opp.toLowerCase()}-wins`) {
    return depth - 10;
  }
  if (result === 'draw') {
    return 0;
  }

  const validMoves = getValidMoves(board);
  if (validMoves.length === 0) {
    return 0;
  }

  if (isMaximizing) {
    let best = -Infinity;
    for (const move of validMoves) {
      const next = tryPlace(board, move, aiMarker);
      const score = minimax(next, size, winCondition, depth + 1, false, aiMarker, alpha, beta);
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) {break;}
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of validMoves) {
      const next = tryPlace(board, move, opp);
      const score = minimax(next, size, winCondition, depth + 1, true, aiMarker, alpha, beta);
      best = Math.min(best, score);
      beta = Math.min(beta, best);
      if (beta <= alpha) {break;}
    }
    return best;
  }
};

/**
 * Hard move using minimax. Falls back to medium for boards with >16 valid moves.
 */
const hardMove = (
  board: string,
  size: number,
  winCondition: number,
  marker: 'X' | 'O',
  validMoves: number[],
): number => {
  if (validMoves.length > 16) {
    return mediumMove(board, size, winCondition, marker, validMoves);
  }

  let bestScore = -Infinity;
  let bestMove = validMoves[0];

  for (const move of validMoves) {
    const next = tryPlace(board, move, marker);
    const score = minimax(next, size, winCondition, 0, false, marker, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
};

/**
 * Computes an AI move for the given board state.
 *
 * @param board - Flat string of size*size cells ('-', 'X', or 'O').
 * @param size - Board dimension (e.g. 3 for 3x3).
 * @param winCondition - Number of consecutive markers needed to win.
 * @param marker - The AI's marker ('X' or 'O').
 * @param difficulty - 'easy' | 'medium' | 'hard'.
 * @returns Board index (0 to size*size-1), or -1 if no moves available.
 */
export const computeAiMove = (
  board: string,
  size: number,
  winCondition: number,
  marker: 'X' | 'O',
  difficulty: string,
): number => {
  const validMoves = getValidMoves(board);
  if (validMoves.length === 0) {
    return -1;
  }

  switch (difficulty) {
    case 'easy':
      return easyMove(validMoves);
    case 'medium':
      return mediumMove(board, size, winCondition, marker, validMoves);
    case 'hard':
      return hardMove(board, size, winCondition, marker, validMoves);
    default:
      return easyMove(validMoves);
  }
};
