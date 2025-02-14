//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type BoardModel, type PieceRecord } from './types';

export type BoardContextType = {
  model?: BoardModel;
  dragging?: boolean; // TODO(burdon): Change to PieceRecord.
  promoting?: PieceRecord;
};

export const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const useBoardContext = () => {
  return useContext(BoardContext) ?? raise(new Error('Missing BoardContext'));
};
