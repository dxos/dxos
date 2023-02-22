//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { DensityContext } from '../components';
import { Density } from '../props';

export const useDensityContext = (propsDensity?: Density) => {
  const { density } = useContext(DensityContext);
  return propsDensity ?? density;
};
