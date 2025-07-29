//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type PieceRecord, type GameboardModel, type Move } from './types';

export type GameboardContextType = {
  model?: GameboardModel;
  dragging?: boolean; // TODO(burdon): Change to PieceRecord.
  promoting?: PieceRecord;
  onPromotion: (move: Move) => void;
};

export const GameboardContext = createContext<GameboardContextType | undefined>(undefined);

export const useBoardContext = () => {
  return useContext(GameboardContext) ?? raise(new Error('Missing BoardContext'));
};
