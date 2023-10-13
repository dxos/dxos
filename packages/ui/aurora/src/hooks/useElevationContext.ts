//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { type Elevation } from '@dxos/aurora-types';

import { ElevationContext } from '../components';

export const useElevationContext = (propsElevation?: Elevation) => {
  const { elevation } = useContext(ElevationContext);
  return propsElevation ?? elevation;
};
