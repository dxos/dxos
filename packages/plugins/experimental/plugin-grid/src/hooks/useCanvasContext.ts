//
// Copyright 2024 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { CanvasContext } from '../components';

export const useCanvasContext = (): CanvasContext => {
  return useContext(CanvasContext) ?? raise(new Error('Missing CanvasContext'));
};
