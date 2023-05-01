//
// Copyright 2023 DXOS.org
//
import get from 'lodash.get';

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import {
  listTheme,
  listOsTheme,
  buttonTheme,
  buttonOsTheme,
  dropdownMenuTheme,
  inputTheme,
  inputOsTheme
} from './components';

export const theme: Theme<Record<string, any>> = {
  themeName: () => 'aurora',
  button: buttonTheme,
  input: inputTheme,
  dropdownMenu: dropdownMenuTheme,
  list: listTheme
};

export const osTheme: Theme<Record<string, any>> = {
  ...theme,
  themeName: () => 'dxos',
  button: buttonOsTheme,
  input: inputOsTheme,
  list: listOsTheme
};

export const tx = <P extends Record<string, any>>(
  path: string,
  defaultClassName: string,
  styleProps: P,
  ...options: any[]
): string => {
  const result: Theme<P> | ComponentFunction<P> = get(theme, path);
  return typeof result === 'function' ? result(styleProps, ...options) : defaultClassName;
};

export const osTx = <P extends Record<string, any>>(
  path: string,
  defaultClassName: string,
  styleProps: P,
  ...options: any[]
): string => {
  const result: Theme<P> | ComponentFunction<P> = get(osTheme, path);
  return typeof result === 'function' ? result(styleProps, ...options) : defaultClassName;
};
