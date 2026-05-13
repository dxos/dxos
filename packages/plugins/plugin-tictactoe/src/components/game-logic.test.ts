//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { checkWin, currentTurn, getValidMoves, getWinningCells, makeBoard, placeMarker } from './game-logic';

describe('makeBoard', () => {
  test('creates a 3x3 board of dashes', ({ expect }) => {
    expect(makeBoard(3)).toBe('---------');
  });

  test('creates a 5x5 board of dashes', ({ expect }) => {
    expect(makeBoard(5)).toBe('-------------------------');
    expect(makeBoard(5)).toHaveLength(25);
  });
});

describe('currentTurn', () => {
  test('X goes first on empty board', ({ expect }) => {
    expect(currentTurn('---------')).toBe('X');
  });

  test('O goes after one X move', ({ expect }) => {
    expect(currentTurn('X--------')).toBe('O');
  });

  test('X goes after X and O have both moved', ({ expect }) => {
    expect(currentTurn('XO-------')).toBe('X');
  });

  test('handles mid-game board', ({ expect }) => {
    // 2 X, 2 O → X's turn
    expect(currentTurn('XOXO-----')).toBe('X');
    // 3 X, 2 O → O's turn
    expect(currentTurn('XOXXO----')).toBe('O');
  });
});

describe('getValidMoves', () => {
  test('returns all indices on empty board', ({ expect }) => {
    expect(getValidMoves('---------')).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test('returns only empty cell indices', ({ expect }) => {
    expect(getValidMoves('X-O------')).toEqual([1, 3, 4, 5, 6, 7, 8]);
  });

  test('returns empty array on full board', ({ expect }) => {
    expect(getValidMoves('XOXOXOXOX')).toEqual([]);
  });
});

describe('placeMarker', () => {
  test('places marker on empty cell', ({ expect }) => {
    const result = placeMarker('---------', 3, 0, 0, 'X');
    expect(result.board).toBe('X--------');
    expect(result.error).toBeUndefined();
  });

  test('places marker at correct position', ({ expect }) => {
    const result = placeMarker('---------', 3, 1, 1, 'O');
    expect(result.board).toBe('----O----');
    expect(result.error).toBeUndefined();
  });

  test('returns error when cell is occupied', ({ expect }) => {
    const result = placeMarker('X--------', 3, 0, 0, 'O');
    expect(result.error).toBe('CellOccupied');
    expect(result.board).toBe('X--------');
  });

  test('returns error when out of bounds', ({ expect }) => {
    const result = placeMarker('---------', 3, 3, 0, 'X');
    expect(result.error).toBe('OutOfBounds');
  });

  test('returns error for negative indices', ({ expect }) => {
    const result = placeMarker('---------', 3, -1, 0, 'X');
    expect(result.error).toBe('OutOfBounds');
  });
});

describe('checkWin', () => {
  test('empty board returns playing', ({ expect }) => {
    expect(checkWin('---------', 3, 3)).toBe('playing');
  });

  test('X wins top row', ({ expect }) => {
    expect(checkWin('XXX------', 3, 3)).toBe('x-wins');
  });

  test('O wins a column', ({ expect }) => {
    // O in column 0: indices 0, 3, 6
    expect(checkWin('O--O--O--', 3, 3)).toBe('o-wins');
  });

  test('X wins diagonal', ({ expect }) => {
    // X on main diagonal: 0, 4, 8
    expect(checkWin('X-O-X-O-X', 3, 3)).toBe('x-wins');
  });

  test('O wins anti-diagonal', ({ expect }) => {
    // O on anti-diagonal: 2, 4, 6
    expect(checkWin('--O-O-O--', 3, 3)).toBe('o-wins');
  });

  test('draw on full board with no winner', ({ expect }) => {
    // XOXOOXXXO — no winner
    expect(checkWin('XOXOOXXXO', 3, 3)).toBe('draw');
  });

  test('still playing when board is not full and no winner', ({ expect }) => {
    expect(checkWin('XO-------', 3, 3)).toBe('playing');
  });

  test('4-in-a-row on 5x5 with winCondition=4', ({ expect }) => {
    // Row 0: XXXX-
    const board = 'XXXX-' + '-----' + '-----' + '-----' + '-----';
    expect(checkWin(board, 5, 4)).toBe('x-wins');
  });

  test('3-in-a-row is not enough when winCondition is 4', ({ expect }) => {
    // Row 0: XXX--
    const board = 'XXX--' + '-----' + '-----' + '-----' + '-----';
    expect(checkWin(board, 5, 4)).toBe('playing');
  });
});

describe('getWinningCells', () => {
  test('returns empty array when no winner', ({ expect }) => {
    expect(getWinningCells('---------', 3, 3)).toEqual([]);
  });

  test('returns winning row indices', ({ expect }) => {
    // X wins top row
    expect(getWinningCells('XXX------', 3, 3)).toEqual([0, 1, 2]);
  });

  test('returns winning column indices', ({ expect }) => {
    // O wins column 1
    expect(getWinningCells('-O--O--O-', 3, 3)).toEqual([1, 4, 7]);
  });

  test('returns winning main diagonal indices', ({ expect }) => {
    // X wins main diagonal
    expect(getWinningCells('X---X---X', 3, 3)).toEqual([0, 4, 8]);
  });

  test('returns winning anti-diagonal indices', ({ expect }) => {
    // O wins anti-diagonal: 2, 4, 6
    expect(getWinningCells('--O-O-O--', 3, 3)).toEqual([2, 4, 6]);
  });

  test('returns empty array when draw', ({ expect }) => {
    expect(getWinningCells('XOXOOXXXO', 3, 3)).toEqual([]);
  });
});
