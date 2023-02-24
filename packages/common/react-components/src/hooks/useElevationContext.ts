//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { ElevationContext } from '../components';
import { Elevation } from '../props';
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
