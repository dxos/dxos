//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { type Density } from '@dxos/ui-types';

import * as DensityProvider from '../providers/DensityProvider/DensityProvider.tsx';

export const useDensityContext = (densityProp?: Density): Density | undefined => {
  const { density } = useContext(DensityProvider.DensityContext);
  return densityProp ?? density;
};
