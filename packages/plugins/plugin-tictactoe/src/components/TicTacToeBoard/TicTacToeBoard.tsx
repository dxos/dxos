//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { type ThemedClassName } from '@dxos/react-ui';
import { useSoundEffect } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/ui-theme';

import { type TicTacToe } from '../../types';
import { canMove, deriveState } from '../../types';

import { TicTacToeBoardContext, useTicTacToeBoardContext } from './context';

//
// Root
//

type RootProps = PropsWithChildren<{
  game: TicTacToe.Game;
}>;

const Root = ({ game, children }: RootProps) => {
  const [moves, updateMoves] = useObject(game, 'moves');
  const currentMoves = useMemo(() => moves ?? [], [moves]);
  const state = useMemo(() => deriveState(currentMoves), [currentMoves]);
  const click = useSoundEffect('Click');

  const handleMove = useCallback(
    (cell: number) => {
      if (!canMove(currentMoves, cell)) {
        return;
      }
      const updated = [...currentMoves, cell];
      updateMoves(() => updated);
      void click.play();
    },
    [currentMoves, updateMoves, click],
  );

  const handleNewGame = useCallback(() => {
    updateMoves(() => []);
    Obj.change(game, (obj) => {
      obj.players = {};
    });
  }, [game, updateMoves]);

  return (
    <TicTacToeBoardContext.Provider value={{ ...state, game, onMove: handleMove, onNewGame: handleNewGame }}>
      {children}
    </TicTacToeBoardContext.Provider>
  );
};

//
// Content
//

type ContentProps = ThemedClassName<PropsWithChildren<{ role?: 'card--content' }>>;

const Content = ({ classNames, children, role }: ContentProps) => (
  <div
    className={mx(
      'flex flex-col justify-center items-center',
      role === 'card--content' ? 'dx-size-container dx-card-square' : 'h-full',
      classNames,
    )}
  >
    {children}
  </div>
);

//
// Board
//

type BoardProps = ThemedClassName;

const Board = ({ classNames }: BoardProps) => {
  const { cells, winningLine, isGameOver, onMove } = useTicTacToeBoardContext();

  return (
    <div
      className={mx('grid grid-cols-3 gap-1 aspect-square w-full max-w-xs', classNames)}
      data-testid='tictactoe-board'
    >
      {cells.map((cell, index) => {
        const isWinningCell = winningLine?.includes(index) ?? false;
        const isEmpty = cell === null;
        const isClickable = isEmpty && !isGameOver;

        return (
          <button
            key={index}
            data-testid={`tictactoe-cell-${index}`}
            className={mx(
              'flex items-center justify-center aspect-square rounded-sm text-3xl font-bold',
              'border border-separator transition-colors',
              isWinningCell && 'ring-2 ring-green-500 bg-green-500/10',
              isClickable && 'hover:bg-hoverSurface cursor-pointer',
              !isClickable && 'cursor-default',
              cell === 'X' && 'text-primary-500',
              cell === 'O' && 'text-accent-500',
            )}
            disabled={!isClickable}
            onClick={() => isClickable && onMove(index)}
            aria-label={cell ?? `Cell ${index}`}
          >
            {cell}
          </button>
        );
      })}
    </div>
  );
};

//
// Export
//

export const TicTacToeBoard = {
  Root,
  Content,
  Board,
};

export type { RootProps as TicTacToeBoardRootProps, ContentProps as TicTacToeBoardContentProps };
