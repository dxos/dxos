//
// Copyright 2026 DXOS.org
//

/**
 * Creates an empty board represented as a flat string of '-' characters.
 * Length is size * size.
 */
export const makeBoard = (size: number): string => '-'.repeat(size * size);

/**
 * Returns whose turn it is based on the current board state.
 * X always goes first; turns alternate based on counts of X and O.
 */
export const currentTurn = (board: string): 'X' | 'O' => {
  const xCount = board.split('').filter((cell) => cell === 'X').length;
  const oCount = board.split('').filter((cell) => cell === 'O').length;
  return xCount <= oCount ? 'X' : 'O';
};

/**
 * Returns indices of all empty ('-') cells on the board.
 */
export const getValidMoves = (board: string): number[] =>
  board
    .split('')
    .map((cell, index) => (cell === '-' ? index : -1))
    .filter((index) => index !== -1);

/**
 * Places a marker on the board at the given row/column.
 * Returns the new board string, or the original board with an error code.
 */
export const placeMarker = (
  board: string,
  size: number,
  row: number,
  col: number,
  marker: 'X' | 'O',
): { board: string; error?: string } => {
  if (row < 0 || row >= size || col < 0 || col >= size) {
    return { board, error: 'OutOfBounds' };
  }

  const index = row * size + col;
  if (board[index] !== '-') {
    return { board, error: 'CellOccupied' };
  }

  return { board: board.slice(0, index) + marker + board.slice(index + 1) };
};

/**
 * Generates all possible winning lines of length `winCondition` on a board of `size`.
 * Returns an array of index arrays.
 */
const generateLines = (size: number, winCondition: number): number[][] => {
  const lines: number[][] = [];

  // Rows.
  for (let row = 0; row < size; row++) {
    for (let colStart = 0; colStart <= size - winCondition; colStart++) {
      const line: number[] = [];
      for (let offset = 0; offset < winCondition; offset++) {
        line.push(row * size + colStart + offset);
      }
      lines.push(line);
    }
  }

  // Columns.
  for (let col = 0; col < size; col++) {
    for (let rowStart = 0; rowStart <= size - winCondition; rowStart++) {
      const line: number[] = [];
      for (let offset = 0; offset < winCondition; offset++) {
        line.push((rowStart + offset) * size + col);
      }
      lines.push(line);
    }
  }

  // Main diagonals (top-left to bottom-right).
  for (let rowStart = 0; rowStart <= size - winCondition; rowStart++) {
    for (let colStart = 0; colStart <= size - winCondition; colStart++) {
      const line: number[] = [];
      for (let offset = 0; offset < winCondition; offset++) {
        line.push((rowStart + offset) * size + colStart + offset);
      }
      lines.push(line);
    }
  }

  // Anti-diagonals (top-right to bottom-left).
  for (let rowStart = 0; rowStart <= size - winCondition; rowStart++) {
    for (let colStart = winCondition - 1; colStart < size; colStart++) {
      const line: number[] = [];
      for (let offset = 0; offset < winCondition; offset++) {
        line.push((rowStart + offset) * size + colStart - offset);
      }
      lines.push(line);
    }
  }

  return lines;
};

/**
 * Finds the first winning line on the board, or null if none exists.
 */
const findWinningLine = (board: string, size: number, winCondition: number): number[] | null => {
  const lines = generateLines(size, winCondition);
  for (const line of lines) {
    const first = board[line[0]];
    if (first !== '-' && line.every((index) => board[index] === first)) {
      return line;
    }
  }
  return null;
};

/**
 * Checks the current game state.
 */
export type GameStatus = 'playing' | 'x-wins' | 'o-wins' | 'draw';

export const checkWin = (board: string, size: number, winCondition: number): GameStatus => {
  const winningLine = findWinningLine(board, size, winCondition);
  if (winningLine !== null) {
    const winner = board[winningLine[0]];
    return winner === 'X' ? 'x-wins' : 'o-wins';
  }

  if (board.includes('-')) {
    return 'playing';
  }

  return 'draw';
};

/**
 * Returns the indices of the winning line, or an empty array if there is no winner.
 */
export const getWinningCells = (board: string, size: number, winCondition: number): number[] =>
  findWinningLine(board, size, winCondition) ?? [];
