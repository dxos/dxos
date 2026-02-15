//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/ui-types';
import { get } from '@dxos/util';

import {
  anchoredOverflowTheme,
  avatarTheme,
  breadcrumbTheme,
  buttonTheme,
  dialogTheme,
  iconButtonTheme,
  iconTheme,
  inputTheme,
  linkTheme,
  listTheme,
  mainTheme,
  menuTheme,
  messageTheme,
  popoverTheme,
  scrollAreaTheme,
  selectTheme,
  separatorTheme,
  skeletonTheme,
  statusTheme,
  tagTheme,
  toastTheme,
  toolbarTheme,
  tooltipTheme,
  treegridTheme,
} from './components';
import { containerTheme } from './primitives';

export const defaultTheme: Theme<Record<string, any>> = {
  themeName: () => 'default',

  //
  // Primitives
  //

  container: containerTheme,

  //
  // Components
  //

  anchoredOverflow: anchoredOverflowTheme,
  avatar: avatarTheme,
  breadcrumb: breadcrumbTheme,
  button: buttonTheme,
  dialog: dialogTheme,
  icon: iconTheme,
  iconButton: iconButtonTheme,
  input: inputTheme,
  link: linkTheme,
  list: listTheme,
  main: mainTheme,
  message: messageTheme,
  menu: menuTheme,
  popover: popoverTheme,
  scrollArea: scrollAreaTheme,
  select: selectTheme,
  separator: separatorTheme,
  skeleton: skeletonTheme,
  status: statusTheme,
  tag: tagTheme,
  toast: toastTheme,
  toolbar: toolbarTheme,
  tooltip: tooltipTheme,
  treegrid: treegridTheme,
};

export const bindTheme = <P extends Record<string, any>>(theme: Theme<Record<string, any>>) => {
  return (path: string, defaultClassName: string, styleProps: P, ...options: any[]): string => {
    const result: Theme<P> | ComponentFunction<P> = get(theme, path);
    return typeof result === 'function' ? result(styleProps, ...options) : defaultClassName;
  };
};

export const defaultTx = bindTheme(defaultTheme);
