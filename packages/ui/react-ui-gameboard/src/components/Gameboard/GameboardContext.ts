//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type GameboardModel, type Move, type PieceRecord } from './types.ts';

// Kept out of `Gameboard.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type GameboardContextValue<M extends GameboardModel<any>> = {
  model: M;
  dragging?: boolean; // TODO(burdon): Change to PieceRecord.
  promoting?: PieceRecord;
  onPromotion: (move: Move) => void;
};

export const [GameboardContextProvider, useRadixGameboardContext] =
  createContext<GameboardContextValue<any>>('Gameboard');

export const useGameboardContext = <M extends GameboardModel<any>>(consumerName: string): GameboardContextValue<M> => {
  return useRadixGameboardContext(consumerName);
};
