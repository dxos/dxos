//
// Copyright 2023 DXOS.org
//

import React, { createContext, PropsWithChildren } from 'react';

import { Elevation } from '@dxos/aurora-types';

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
