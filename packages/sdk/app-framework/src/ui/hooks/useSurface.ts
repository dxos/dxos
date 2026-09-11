//
// Copyright 2025 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { Surface } from '../components/index.ts';

export const useSurface = (): Surface.Context => {
  return useContext(Surface.Context) ?? raise(new Error('Missing SurfaceContext'));
};
