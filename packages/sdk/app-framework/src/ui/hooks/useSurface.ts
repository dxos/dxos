//
// Copyright 2025 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { SurfaceContext } from '../components/surface/context';

export const useSurface = (): SurfaceContext => {
  return useContext(SurfaceContext) ?? raise(new Error('Missing SurfaceContext'));
};
