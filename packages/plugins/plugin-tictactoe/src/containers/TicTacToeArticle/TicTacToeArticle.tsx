//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { TicTacToeBoard, computeAiMove, checkWin, currentTurn, getWinningCells, makeBoard, placeMarker } from '#components';
import { meta } from '#meta';
import { type TicTacToe } from '#types';

export type TicTacToeArticleProps = AppSurface.ObjectArticleProps<TicTacToe.Game>;

export const TicTacToeArticle = ({ role, subject: game }: TicTacToeArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [aiThinking, setAiThinking] = useState(false);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Subscribe to reactive ECHO properties.
  const [board] = useObject(game, 'board');
  const [moves] = useObject(game, 'moves');
  const [size] = useObject(game, 'size');
  const [winCondition] = useObject(game, 'winCondition');
  const [level] = useObject(game, 'level');

  const status = checkWin(board, size, winCondition);
  const turn = currentTurn(board);
  const winningCells = getWinningCells(board, size, winCondition);
  const isGameOver = status !== 'playing';

  // Handle cell click — place marker and update ECHO object.
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (isGameOver || aiThinking) {
        return;
      }

      const marker = currentTurn(board);
      const result = placeMarker(board, size, row, col, marker);
      if (result.error) {
        return;
      }

      const moveEntry = `${marker}:${row},${col}`;
      const newMoves = moves ? `${moves};${moveEntry}` : moveEntry;

      Obj.change(game, (draft) => {
        const mutable = draft as Obj.Mutable<typeof draft>;
        mutable.board = result.board;
        mutable.moves = newMoves;
      });
    },
    [board, size, moves, isGameOver, aiThinking, game],
  );

  // AI turn effect — when level is set and it's O's turn.
  useEffect(() => {
    if (!level || isGameOver || aiThinking) {
      return;
    }

    const nextTurn = currentTurn(board);
    if (nextTurn !== 'O') {
      return;
    }

    setAiThinking(true);
    aiTimeoutRef.current = setTimeout(() => {
      const moveIndex = computeAiMove(board, size, winCondition, 'O', level);
      if (moveIndex === -1) {
        setAiThinking(false);
        return;
      }

      const row = Math.floor(moveIndex / size);
      const col = moveIndex % size;
      const newBoard = board.substring(0, moveIndex) + 'O' + board.substring(moveIndex + 1);
      const moveEntry = `O:${row},${col}`;
      const newMoves = moves ? `${moves};${moveEntry}` : moveEntry;

      Obj.change(game, (draft) => {
        const mutable = draft as Obj.Mutable<typeof draft>;
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
  }, [board, level, size, winCondition, isGameOver, aiThinking, moves, game]);

  // New game handler.
  const handleNewGame = useCallback(() => {
    const newBoard = makeBoard(size);
    Obj.change(game, (draft) => {
      const mutable = draft as Obj.Mutable<typeof draft>;
      mutable.board = newBoard;
      mutable.moves = '';
    });
  }, [game, size]);

  const statusText = (() => {
    if (aiThinking) {
      return t('ai-thinking.label');
    }
    switch (status) {
      case 'x-wins':
        return t('x-wins.label');
      case 'o-wins':
        return t('o-wins.label');
      case 'draw':
        return t('draw.label');
      default:
        return turn === 'X' ? t('x-turn.label') : t('o-turn.label');
    }
  })();

  return (
    <Panel.Root role={role} classNames='@container'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={handleNewGame}>{t('new-game.button')}</Toolbar.Button>
          <div className='grow' />
          <span className={mx('text-sm', isGameOver && 'font-semibold')}>{statusText}</span>
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
            board={board}
            size={size}
            winningCells={winningCells}
            disabled={isGameOver || aiThinking}
            onCellClick={handleCellClick}
          />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
