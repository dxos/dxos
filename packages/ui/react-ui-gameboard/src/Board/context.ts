//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

export const BoardContext = createContext<{ dragging: boolean } | undefined>(undefined);

export const useBoardContext = () => {
  return useContext(BoardContext) ?? raise(new Error('Missing BoardContext'));
};
