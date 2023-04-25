//
// Copyright 2023 DXOS.org
//
import get from 'lodash.get';

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import { buttonAppStyles, buttonOsStyles } from './components';

export const theme: Theme = {
  button: buttonAppStyles
};

export const osTheme: Theme = {
  button: buttonOsStyles
};

export const tx = <P extends Record<string, any>>(path: string, defaultClassName: string, styleProps: P): string => {
  const result: Theme | ComponentFunction<P> = get(theme, path);
  return typeof result === 'function' ? result(styleProps) : defaultClassName;
};

export const osTx = <P extends Record<string, any>>(path: string, defaultClassName: string, styleProps: P): string => {
  const result: Theme | ComponentFunction<P> = get(osTheme, path);
  return typeof result === 'function' ? result(styleProps) : defaultClassName;
};
