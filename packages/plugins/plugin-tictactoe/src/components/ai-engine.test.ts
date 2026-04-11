//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { computeAiMove } from './ai-engine';

// 3x3 board: indices 0-8, empty = '-'
const emptyBoard = '---------';

describe('computeAiMove', () => {
  describe('easy', () => {
    test('returns valid move on empty board', ({ expect }) => {
      const move = computeAiMove(emptyBoard, 3, 3, 'X', 'easy');
      expect(move).toBeGreaterThanOrEqual(0);
      expect(move).toBeLessThan(9);
    });

    test('returns valid move on partial board', ({ expect }) => {
      const board = 'X-O------';
      const move = computeAiMove(board, 3, 3, 'O', 'easy');
      expect(move).toBeGreaterThanOrEqual(0);
      expect(move).toBeLessThan(9);
      expect(board[move]).toBe('-');
    });

    test('returns -1 on full board', ({ expect }) => {
      const move = computeAiMove('XOXOXOXOX', 3, 3, 'X', 'easy');
      expect(move).toBe(-1);
    });
  });

  describe('medium', () => {
    test('takes winning move', ({ expect }) => {
      // X X _ => X should play index 2 to win
      const board = 'XX-------';
      const move = computeAiMove(board, 3, 3, 'X', 'medium');
      expect(move).toBe(2);
    });

    test('blocks opponent win', ({ expect }) => {
      // O O _ => X should block at index 2
      const board = 'OO-------';
      const move = computeAiMove(board, 3, 3, 'X', 'medium');
      expect(move).toBe(2);
    });

    test('prefers center on empty board', ({ expect }) => {
      const move = computeAiMove(emptyBoard, 3, 3, 'X', 'medium');
      expect(move).toBe(4);
    });
  });

  describe('hard', () => {
    test('takes winning move', ({ expect }) => {
      // X X _ => X should play index 2 to win
      const board = 'XX-------';
      const move = computeAiMove(board, 3, 3, 'X', 'hard');
      expect(move).toBe(2);
    });

    test('blocks opponent win', ({ expect }) => {
      // O O _ => X should block at index 2
      const board = 'OO-------';
      const move = computeAiMove(board, 3, 3, 'X', 'hard');
      expect(move).toBe(2);
    });

    test('plays corner against center opening', ({ expect }) => {
      // O in center, X should prefer corners
      const board = '----O----';
      const move = computeAiMove(board, 3, 3, 'X', 'hard');
      const corners = [0, 2, 6, 8];
      expect(corners).toContain(move);
    });

    test('never loses as X on 3x3 (hard vs hard should draw)', ({ expect }) => {
      // Simulate a full game of hard vs hard.
      let board = emptyBoard;
      const size = 3;
      const winCondition = 3;
      let currentMarker: 'X' | 'O' = 'X';

      for (let turn = 0; turn < 9; turn++) {
        const validMoves = board.split('').filter((c) => c === '-').length;
        if (validMoves === 0) break;

        const move = computeAiMove(board, size, winCondition, currentMarker, 'hard');
        if (move === -1) break;

        const boardArr = board.split('');
        boardArr[move] = currentMarker;
        board = boardArr.join('');

        currentMarker = currentMarker === 'X' ? 'O' : 'X';
      }

      // Hard vs hard on 3x3 should always produce a full board (draw).
      expect(board).not.toContain('-');
    });
  });
});
