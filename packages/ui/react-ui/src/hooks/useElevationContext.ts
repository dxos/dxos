//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { type Elevation } from '@dxos/ui-types';

import * as ElevationProvider from '../providers/ElevationProvider/ElevationProvider.tsx';

export const useElevationContext = (propsElevation?: Elevation) => {
  const { elevation } = useContext(ElevationProvider.ElevationContext);
  return propsElevation ?? elevation;
};
