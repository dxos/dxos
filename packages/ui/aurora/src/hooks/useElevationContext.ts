//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { Elevation } from '@dxos/aurora-theme';

import { ElevationContext } from '../components';
import { useThemeContext } from './useThemeContext';

export const useElevationContext = () => useContext(ElevationContext);

export const useButtonShadow = (propsElevation?: Elevation) => {
  const { elevation } = useElevationContext();
  const { themeVariant } = useThemeContext();
  const resolvedElevation = propsElevation ?? elevation;
  return themeVariant === 'os'
    ? 'shadow-none'
    : resolvedElevation === 'group'
    ? 'shadow'
    : resolvedElevation === 'chrome'
    ? 'shadow-none'
    : 'shadow-md';
};
