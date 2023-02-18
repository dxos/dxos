//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { ElevationContext } from '../components';
import { useThemeContext } from './useThemeContext';

export const useElevationContext = () => useContext(ElevationContext);

export const useButtonShadow = () => {
  const { elevation } = useElevationContext();
  const { themeVariant } = useThemeContext();
  return themeVariant === 'os'
    ? 'shadow-none'
    : elevation === 'group'
    ? 'shadow'
    : elevation === 'chrome'
    ? 'shadow-none'
    : 'shadow-md';
};
