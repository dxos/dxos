//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { type GameVariantSurfaceProps } from '@dxos/plugin-game/types';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import {
  TicTacToeBoard,
  computeAiMove,
  checkWin,
  currentTurn,
  getWinningCells,
  makeBoard,
  placeMarker,
} from '#components';
import { meta } from '#meta';
import { TicTacToe } from '#types';

export type TicTacToeArticleProps = GameVariantSurfaceProps;

export const TicTacToeArticle = ({ role, variant }: TicTacToeArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [aiThinking, setAiThinking] = useState(false);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const boardRef = useRef<string>('');
  const movesRef = useRef<string>('');

  const state = Obj.instanceOf(TicTacToe.State, variant) ? variant : undefined;

  const [board] = useObject(state, 'board');
  const [moves] = useObject(state, 'moves');
  boardRef.current = board ?? '';
  movesRef.current = moves ?? '';
  const [size] = useObject(state, 'size');
  const [winCondition] = useObject(state, 'winCondition');
  const [level] = useObject(state, 'level');

  const status = state ? checkWin(board ?? '', size ?? 3, winCondition ?? 3) : 'playing';
  const winningCells = state ? getWinningCells(board ?? '', size ?? 3, winCondition ?? 3) : [];
  const isGameOver = status !== 'playing';

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!state || isGameOver || aiThinking) {
        return;
      }

      const marker = currentTurn(board ?? '');
      const result = placeMarker(board ?? '', size ?? 3, row, col, marker);
      if (result.error) {
        return;
      }

      const moveEntry = `${marker}:${row},${col}`;
      const newMoves = moves ? `${moves};${moveEntry}` : moveEntry;

      Obj.update(state, (state) => {
        const mutable = state as Obj.Mutable<typeof state>;
        mutable.board = result.board;
        mutable.moves = newMoves;
      });
    },
    [board, size, moves, isGameOver, aiThinking, state],
  );

  useEffect(() => {
    if (!state || !level || isGameOver || aiThinking) {
      return;
    }

    const nextTurn = currentTurn(board ?? '');
    if (nextTurn !== 'O') {
      return;
    }

    setAiThinking(true);
    aiTimeoutRef.current = setTimeout(() => {
      const currentBoard = boardRef.current;
      const currentMoves = movesRef.current;
      const currentStatus = checkWin(currentBoard, size ?? 3, winCondition ?? 3);
      if (currentStatus !== 'playing' || currentTurn(currentBoard) !== 'O') {
        setAiThinking(false);
        return;
      }

      const moveIndex = computeAiMove(currentBoard, size ?? 3, winCondition ?? 3, 'O', level);
      if (moveIndex === -1) {
        setAiThinking(false);
        return;
      }

      const row = Math.floor(moveIndex / (size ?? 3));
      const col = moveIndex % (size ?? 3);
      const newBoard = currentBoard.substring(0, moveIndex) + 'O' + currentBoard.substring(moveIndex + 1);
      const moveEntry = `O:${row},${col}`;
      const newMoves = currentMoves ? `${currentMoves};${moveEntry}` : moveEntry;

      Obj.update(state, (state) => {
        const mutable = state as Obj.Mutable<typeof state>;
        mutable.board = newBoard;
        mutable.moves = newMoves;
      });
      setAiThinking(false);
    }, 400);

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [board, level, size, winCondition, isGameOver, aiThinking, moves, state]);

  const handleNewGame = useCallback(() => {
    if (!state) {
      return;
    }
    const newBoard = makeBoard(size ?? 3);
    Obj.update(state, (state) => {
      const mutable = state as Obj.Mutable<typeof state>;
      mutable.board = newBoard;
      mutable.moves = '';
    });
  }, [state, size]);

  if (!state) {
    return null;
  }

  return (
    <Panel.Root role={role} classNames='@container'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          {isGameOver && <Toolbar.Button onClick={handleNewGame}>{t('new-game.button')}</Toolbar.Button>}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <div
          className={mx(
            'flex items-center justify-center h-full w-full',
            role === 'article' && 'p-4',
            role === 'section' && 'aspect-square',
          )}
        >
          <TicTacToeBoard
            board={board ?? ''}
            size={size ?? 3}
            winningCells={winningCells}
            disabled={isGameOver || aiThinking}
            onCellClick={handleCellClick}
          />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
