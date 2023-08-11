//
// Copyright 2023 DXOS.org
//
import get from 'lodash.get';

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import {
  avatarTheme,
  buttonTheme,
  dialogTheme,
  dropdownMenuTheme,
  inputTheme,
  linkTheme,
  listTheme,
  mainTheme,
  messageTheme,
  popoverTheme,
  scrollAreaTheme,
  separatorTheme,
  toastTheme,
  tooltipTheme,
  tagTheme,
} from './components';

export const auroraTheme: Theme<Record<string, any>> = {
  themeName: () => 'aurora',

  avatar: avatarTheme,
  button: buttonTheme,
  dialog: dialogTheme,
  dropdownMenu: dropdownMenuTheme,
  input: inputTheme,
  link: linkTheme,
  list: listTheme,
  main: mainTheme,
  message: messageTheme,
  popover: popoverTheme,
  select: buttonTheme, // TODO(burdon): ???
  scrollArea: scrollAreaTheme,
  separator: separatorTheme,
  tag: tagTheme,
  toast: toastTheme,
  tooltip: tooltipTheme,
};

export const bindTheme = <P extends Record<string, any>>(theme: Theme<Record<string, any>>) => {
  return (path: string, defaultClassName: string, styleProps: P, ...options: any[]): string => {
    const result: Theme<P> | ComponentFunction<P> = get(theme, path);
    return typeof result === 'function' ? result(styleProps, ...options) : defaultClassName;
  };
};

export const auroraTx = bindTheme(auroraTheme);
