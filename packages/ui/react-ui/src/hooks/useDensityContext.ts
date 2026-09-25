//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { type Density } from '@dxos/ui-types';

import { DensityContext } from '../providers/index.ts';

export const useDensityContext = (densityProp?: Density): Density | undefined => {
  const { density } = useContext(DensityContext);
  return densityProp ?? density;
};
