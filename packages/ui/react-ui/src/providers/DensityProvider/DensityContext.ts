//
// Copyright 2023 DXOS.org
//

import { createContext } from 'react';

import { type Density } from '@dxos/ui-types';

export interface DensityContextValue {
  density?: Density;
}

// Kept out of `DensityProvider.tsx`: react-refresh only fast-refreshes a module whose exports are
// all components, so a context exported beside one forces a full page reload on every edit.
export const DensityContext = createContext<DensityContextValue>({ density: 'md' });
