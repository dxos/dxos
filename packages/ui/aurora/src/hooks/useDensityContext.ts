//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { Density } from '@dxos/aurora-types';

import { DensityContext } from '../components';

export const useDensityContext = (propsDensity?: Density) => {
  const { density } = useContext(DensityContext);
  return propsDensity ?? density;
};
