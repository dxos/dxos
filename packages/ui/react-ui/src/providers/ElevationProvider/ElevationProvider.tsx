//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import React, { type PropsWithChildren, createContext } from 'react';

import { type Elevation } from '@dxos/ui-types';

export interface ElevationContextValue {
  elevation?: Elevation;
}

type ElevationProviderProps = PropsWithChildren<{
  elevation?: Elevation;
}>;

export const ElevationContext = createContext<ElevationContextValue>({ elevation: 'base' });

const ElevationProvider = ({ elevation, children }: ElevationProviderProps) => (
  <ElevationContext.Provider value={{ elevation }}>{children}</ElevationContext.Provider>
);

export { ElevationProvider as Root };
export type { ElevationProviderProps as RootProps };
export * from '../../hooks/useElevationContext.ts';
