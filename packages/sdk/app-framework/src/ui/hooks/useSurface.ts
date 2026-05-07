//
// Copyright 2025 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

// Import the context primitive directly. Going through `../components/Surface`
// (the namespace barrel) creates a cycle with `SurfaceComponent` →
// `SurfaceInfo` → this hook, which webkit's strict TDZ refuses to honour.
// See `./useApp.tsx` for the full explanation.
import { SurfaceContext } from '../components/Surface/context';

export const useSurface = (): SurfaceContext => {
  return useContext(SurfaceContext) ?? raise(new Error('Missing SurfaceContext'));
};
