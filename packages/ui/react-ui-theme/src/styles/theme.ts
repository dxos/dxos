//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';
import { get } from '@dxos/util';

import {
  alertTheme,
  anchoredOverflowTheme,
  avatarTheme,
  breadcrumbTheme,
  buttonTheme,
  dialogTheme,
  menuTheme,
  iconTheme,
  iconButtonTheme,
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
  tagTheme,
  toastTheme,
  toolbarTheme,
  tooltipTheme,
  treegridTheme,
} from './components';

export const defaultTheme: Theme<Record<string, any>> = {
  themeName: () => 'default',

  alert: alertTheme,
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
  select: selectTheme,
  scrollArea: scrollAreaTheme,
  separator: separatorTheme,
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
