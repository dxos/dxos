//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { Elevation } from '@dxos/aurora-types';

import { ElevationContext } from '../components';

export const useElevationContext = () => useContext(ElevationContext);

/**
 * @deprecated use @dxos/aurora-theme instead.
 */
export const useButtonShadow = (propsElevation?: Elevation) => {
  const { elevation } = useElevationContext();
  const resolvedElevation = propsElevation ?? elevation;
  return resolvedElevation === 'group' ? 'shadow' : resolvedElevation === 'chrome' ? 'shadow-none' : 'shadow-md';
};
