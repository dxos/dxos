//
// Copyright 2023 DXOS.org
//

import React, { createContext, PropsWithChildren } from 'react';

import { Density } from '../../props';

export interface DensityContextValue {
  density?: Density;
}

export type DensityProviderProps = PropsWithChildren<{
  density?: Density;
}>;

export const DensityContext = createContext<DensityContextValue>({ density: 'coarse' });

export const DensityProvider = ({ density, children }: DensityProviderProps) => (
  <DensityContext.Provider value={{ density }}>{children}</DensityContext.Provider>
);
