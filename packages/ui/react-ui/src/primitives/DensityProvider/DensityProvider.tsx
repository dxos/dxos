//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, createContext } from 'react';

import { type Density } from '@dxos/ui-types';

export interface DensityContextValue {
  density?: Density;
}

export type DensityProviderProps = PropsWithChildren<{
  density?: Density;
}>;

export const DensityContext = createContext<DensityContextValue>({ density: 'md' });

/**
 * Provides density two ways: the React context (read by controls that need the value) and a
 * `dx-density-*` class on a `display: contents` wrapper, which sets the `--dx-control*` knobs for
 * the whole subtree. The class is what makes density reach components that never read the context
 * — `react-ui-menu` items, for instance — without threading a prop through every layer.
 * `display: contents` keeps the wrapper out of layout, so it is safe inside a grid or flex parent.
 */
export const DensityProvider = ({ density, children }: DensityProviderProps) => (
  <DensityContext.Provider value={{ density }}>
    <div role='none' className={density ? `contents dx-density-${density}` : 'contents'}>
      {children}
    </div>
  </DensityContext.Provider>
);
