//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { type Density } from '@dxos/ui-types';

import { DensityContext } from '../components';

export const useDensityContext = (propsDensity?: Density) => {
  const { density } = useContext(DensityContext);
  return propsDensity ?? density;
};
