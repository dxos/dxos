//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';

import {
  anchoredOverflowTheme,
  avatarTheme,
  breadcrumbTheme,
  buttonTheme,
  dialogTheme,
  menuTheme,
  inputTheme,
  linkTheme,
  listTheme,
  mainTheme,
  messageTheme,
  popoverTheme,
  scrollAreaTheme,
  selectTheme,
  separatorTheme,
  statusTheme,
  toastTheme,
  toolbarTheme,
  tooltipTheme,
  tagTheme,
} from './components';
import { hueTheme } from './fragments';

export const defaultTheme: Theme<Record<string, any>> = {
  themeName: () => 'default',

  anchoredOverflow: anchoredOverflowTheme,
  avatar: avatarTheme,
  breadcrumb: breadcrumbTheme,
  button: buttonTheme,
  dialog: dialogTheme,
  menu: menuTheme,
  input: inputTheme,
  link: linkTheme,
  list: listTheme,
  main: mainTheme,
  message: messageTheme,
  popover: popoverTheme,
  select: selectTheme,
  scrollArea: scrollAreaTheme,
  separator: separatorTheme,
  status: statusTheme,
  tag: tagTheme,
  toast: toastTheme,
  toolbar: toolbarTheme,
  tooltip: tooltipTheme,
  hue: hueTheme,
};

export const bindTheme = <P extends Record<string, any>>(theme: Theme<Record<string, any>>) => {
  return (path: string, defaultClassName: string, styleProps: P, ...options: any[]): string => {
    const result: Theme<P> | ComponentFunction<P> = get(theme, path);
    return typeof result === 'function' ? result(styleProps, ...options) : defaultClassName;
  };
};

export const defaultTx = bindTheme(defaultTheme);
