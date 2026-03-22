//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { canMove, deriveState, newGameMoves } from './logic';

describe('deriveState', () => {
  test('empty board', ({ expect }) => {
    const state = deriveState([]);
    expect(state.cells).toEqual(Array(9).fill(null));
    expect(state.currentTurn).toBe('X');
    expect(state.winner).toBeNull();
    expect(state.isDraw).toBe(false);
    expect(state.isGameOver).toBe(false);
    expect(state.winningLine).toBeNull();
  });

  test('X goes first, O goes second', ({ expect }) => {
    const state = deriveState([4]);
    expect(state.cells[4]).toBe('X');
    expect(state.currentTurn).toBe('O');

    const state2 = deriveState([4, 0]);
    expect(state2.cells[4]).toBe('X');
    expect(state2.cells[0]).toBe('O');
    expect(state2.currentTurn).toBe('X');
  });

  test('X wins - top row [0,1,2]', ({ expect }) => {
    const state = deriveState([0, 3, 1, 4, 2]);
    expect(state.winner).toBe('X');
    expect(state.winningLine).toEqual([0, 1, 2]);
    expect(state.isGameOver).toBe(true);
  });

  test('O wins - middle column [1,4,7]', ({ expect }) => {
    const state = deriveState([0, 1, 2, 4, 3, 7]);
    expect(state.winner).toBe('O');
    expect(state.winningLine).toEqual([1, 4, 7]);
    expect(state.isGameOver).toBe(true);
  });

  test('X wins - diagonal [0,4,8]', ({ expect }) => {
    const state = deriveState([0, 1, 4, 2, 8]);
    expect(state.winner).toBe('X');
    expect(state.winningLine).toEqual([0, 4, 8]);
  });

  test('O wins - anti-diagonal [2,4,6]', ({ expect }) => {
    const state = deriveState([0, 2, 1, 4, 3, 6]);
    expect(state.winner).toBe('O');
    expect(state.winningLine).toEqual([2, 4, 6]);
  });

  test('draw - full board no winner', ({ expect }) => {
    const moves = [0, 1, 2, 5, 3, 6, 4, 8, 7];
    const state = deriveState(moves);
    expect(state.winner).toBeNull();
    expect(state.isDraw).toBe(true);
    expect(state.isGameOver).toBe(true);
  });

  test('all 8 winning lines detected', ({ expect }) => {
    const lines = [
      { moves: [0, 3, 1, 4, 2], line: [0, 1, 2] },
      { moves: [3, 0, 4, 1, 5], line: [3, 4, 5] },
      { moves: [6, 0, 7, 1, 8], line: [6, 7, 8] },
      { moves: [0, 1, 3, 2, 6], line: [0, 3, 6] },
      { moves: [1, 0, 4, 2, 7], line: [1, 4, 7] },
      { moves: [2, 0, 5, 1, 8], line: [2, 5, 8] },
      { moves: [0, 1, 4, 2, 8], line: [0, 4, 8] },
      { moves: [2, 0, 4, 1, 6], line: [2, 4, 6] },
    ];
    for (const { moves, line } of lines) {
      const state = deriveState(moves);
      expect(state.winner).toBe('X');
      expect(state.winningLine).toEqual(line);
    }
  });
});

describe('canMove', () => {
  test('can move to empty cell on active game', ({ expect }) => {
    expect(canMove([], 4)).toBe(true);
    expect(canMove([0, 1], 4)).toBe(true);
  });

  test('cannot move to occupied cell', ({ expect }) => {
    expect(canMove([4], 4)).toBe(false);
    expect(canMove([0, 4], 4)).toBe(false);
  });

  test('cannot move out of range', ({ expect }) => {
    expect(canMove([], -1)).toBe(false);
    expect(canMove([], 9)).toBe(false);
  });

  test('cannot move when game is over', ({ expect }) => {
    const winMoves = [0, 3, 1, 4, 2];
    expect(canMove(winMoves, 5)).toBe(false);
  });

  test('cannot move on draw board', ({ expect }) => {
    const drawMoves = [0, 1, 2, 5, 3, 6, 4, 8, 7];
    expect(canMove(drawMoves, 0)).toBe(false);
  });
});

describe('newGameMoves', () => {
  test('returns empty array', ({ expect }) => {
    expect(newGameMoves()).toEqual([]);
  });
});
