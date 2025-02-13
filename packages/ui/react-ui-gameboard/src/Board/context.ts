//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type BoardModel } from './types';

export const BoardContext = createContext<{ model?: BoardModel; dragging: boolean } | undefined>(undefined);

export const useBoardContext = () => {
  return useContext(BoardContext) ?? raise(new Error('Missing BoardContext'));
};
