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

export const DensityContext = createContext<DensityContextValue>({ density: 'fine' });

export const DensityProvider = ({ density, children }: DensityProviderProps) => (
  <DensityContext.Provider value={{ density }}>{children}</DensityContext.Provider>
);
