//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type PieceRecord, type BoardModel, type Move } from './types';

export type BoardContextType = {
  model?: BoardModel;
  dragging?: boolean; // TODO(burdon): Change to PieceRecord.
  promoting?: PieceRecord;
  onPromotion: (move: Move) => void;
};

export const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const useBoardContext = () => {
  return useContext(BoardContext) ?? raise(new Error('Missing BoardContext'));
};
