//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, createContext } from 'react';

import { type Elevation } from '@dxos/ui-types';

export interface ElevationContextValue {
  elevation?: Elevation;
}

export type ElevationProviderProps = PropsWithChildren<{
  elevation?: Elevation;
}>;

export const ElevationContext = createContext<ElevationContextValue>({ elevation: 'base' });

export const ElevationProvider = ({ elevation, children }: ElevationProviderProps) => (
  <ElevationContext.Provider value={{ elevation }}>{children}</ElevationContext.Provider>
);
