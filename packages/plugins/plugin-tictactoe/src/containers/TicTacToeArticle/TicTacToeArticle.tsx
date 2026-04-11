//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { TicTacToeBoard, computeAiMove, checkWin, currentTurn, getWinningCells, makeBoard, placeMarker } from '#components';
import { meta } from '#meta';
import { type TicTacToe } from '#types';

export type TicTacToeArticleProps = AppSurface.ObjectArticleProps<TicTacToe.Game>;

export const TicTacToeArticle = ({ role, subject: game }: TicTacToeArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [aiThinking, setAiThinking] = useState(false);

  const turn = currentTurn(game.board);
  const status = game.status;
  const winningCells = getWinningCells(game.board, game.size, game.winCondition);
  const isGameOver = status !== 'playing';

  // Handle cell click - place marker and update ECHO object.
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (isGameOver || aiThinking) return;
      const marker = currentTurn(game.board);
      const result = placeMarker(game.board, game.size, row, col, marker);
      if (result.error) return;
      const newStatus = checkWin(result.board, game.size, game.winCondition);
      const moveEntry = `${marker}:${row},${col}`;
      const moves = game.moves ? `${game.moves};${moveEntry}` : moveEntry;
      Obj.change(game, (draft) => {
        const mutable = draft as Obj.Mutable<typeof draft>;
        mutable.board = result.board;
        mutable.status = newStatus;
        mutable.moves = moves;
      });
    },
    [game, isGameOver, aiThinking],
  );

  // AI turn effect - when difficulty is set and it's O's turn.
  useEffect(() => {
    if (!game.difficulty || isGameOver || aiThinking) return;
    const nextTurn = currentTurn(game.board);
    if (nextTurn !== 'O') return; // AI plays as O.
    setAiThinking(true);
    const timeout = setTimeout(() => {
      const moveIndex = computeAiMove(game.board, game.size, game.winCondition, 'O', game.difficulty!);
      if (moveIndex === -1) {
        setAiThinking(false);
        return;
      }
      const row = Math.floor(moveIndex / game.size);
      const col = moveIndex % game.size;
      const newBoard = game.board.substring(0, moveIndex) + 'O' + game.board.substring(moveIndex + 1);
      const newStatus = checkWin(newBoard, game.size, game.winCondition);
      const moveEntry = `O:${row},${col}`;
      const moves = game.moves ? `${game.moves};${moveEntry}` : moveEntry;
      Obj.change(game, (draft) => {
        const mutable = draft as Obj.Mutable<typeof draft>;
        mutable.board = newBoard;
        mutable.status = newStatus;
        mutable.moves = moves;
      });
      setAiThinking(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [game.board, game.difficulty, game.size, game.winCondition, isGameOver, aiThinking]);

  // New game handler.
  const handleNewGame = useCallback(() => {
    const newBoard = makeBoard(game.size);
    Obj.change(game, (draft) => {
      const mutable = draft as Obj.Mutable<typeof draft>;
      mutable.board = newBoard;
      mutable.status = 'playing';
      mutable.moves = '';
    });
  }, [game]);

  // Status text from translations.
  const statusText = (() => {
    if (aiThinking) return t('ai-thinking.label');
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
            board={game.board}
            size={game.size}
            winningCells={winningCells}
            disabled={isGameOver || aiThinking}
            onCellClick={handleCellClick}
          />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
