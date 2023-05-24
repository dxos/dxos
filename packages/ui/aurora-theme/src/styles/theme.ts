//
// Copyright 2023 DXOS.org
//
import get from 'lodash.get';

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import {
  avatarTheme,
  buttonTheme,
  buttonOsTheme,
  dialogTheme,
  dialogOsTheme,
  dropdownMenuTheme,
  inputTheme,
  inputOsTheme,
  listTheme,
  listOsTheme,
  mainTheme,
  messageTheme,
  toastTheme,
  tooltipTheme,
  tagTheme,
} from './components';

export const theme: Theme<Record<string, any>> = {
  themeName: () => 'aurora',

  avatar: avatarTheme,
  button: buttonTheme,
  dialog: dialogTheme,
  dropdownMenu: dropdownMenuTheme,
  input: inputTheme,
  list: listTheme,
  main: mainTheme,
  message: messageTheme,
  tag: tagTheme,
  toast: toastTheme,
  tooltip: tooltipTheme,
};

export const osTheme: Theme<Record<string, any>> = {
  ...theme,
  themeName: () => 'dxos',

  button: buttonOsTheme,
  dialog: dialogOsTheme,
  input: inputOsTheme,
  list: listOsTheme,
};

export const appTx = <P extends Record<string, any>>(
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
