//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

import { type GameState, type TicTacToe } from '../../types';

export type TicTacToeBoardContextValue = GameState & {
  game: TicTacToe.Game;
  onMove: (cell: number) => void;
  onNewGame: () => void;
};

export const TicTacToeBoardContext = createContext<TicTacToeBoardContextValue | null>(null);

const CONTEXT_NAME = 'TicTacToeBoard';

export const useTicTacToeBoardContext = (): TicTacToeBoardContextValue => {
  const context = useContext(TicTacToeBoardContext);
  if (!context) {
    throw new Error(`${CONTEXT_NAME} components must be used within TicTacToeBoard.Root`);
  }
  return context;
};
