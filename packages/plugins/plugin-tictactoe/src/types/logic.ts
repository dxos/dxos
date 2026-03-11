//
// Copyright 2026 DXOS.org
//

/** Cell values. */
export type CellValue = 'X' | 'O' | null;

/** Derived game state from moves array. */
export type GameState = {
  cells: CellValue[];
  currentTurn: 'X' | 'O';
  winner: 'X' | 'O' | null;
  isDraw: boolean;
  isGameOver: boolean;
  winningLine: number[] | null;
};

const WIN_CONDITIONS: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/**
 * Derives full game state from an ordered list of cell indices.
 * Even-indexed moves are X; odd-indexed moves are O.
 */
export const deriveState = (moves: number[]): GameState => {
  const cells: CellValue[] = Array(9).fill(null);
  moves.forEach((cell, index) => {
    cells[cell] = index % 2 === 0 ? 'X' : 'O';
  });

  let winner: 'X' | 'O' | null = null;
  let winningLine: number[] | null = null;
  for (const line of WIN_CONDITIONS) {
    const [a, b, c] = line;
    if (cells[a] !== null && cells[a] === cells[b] && cells[a] === cells[c]) {
      winner = cells[a] as 'X' | 'O';
      winningLine = line;
      break;
    }
  }

  const isDraw = moves.length === 9 && winner === null;
  const isGameOver = winner !== null || isDraw;
  const currentTurn = moves.length % 2 === 0 ? 'X' : 'O';

  return { cells, currentTurn, winner, isDraw, isGameOver, winningLine };
};

/**
 * Returns true if placing a mark at the given cell index is legal.
 */
export const canMove = (moves: number[], cell: number): boolean => {
  if (cell < 0 || cell > 8) {
    return false;
  }
  const state = deriveState(moves);
  if (state.isGameOver) {
    return false;
  }
  return !moves.includes(cell);
};

/** Returns a fresh empty moves array for a new game. */
export const newGameMoves = (): number[] => [];
