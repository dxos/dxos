//
// Copyright 2023 DXOS.org
//

import { type ClassNameArray, type ComponentFunction, type Theme, type ThemeFunction } from '@dxos/ui-types';
import { getDeep } from '@dxos/util';

import {
  avatarTheme,
  breadcrumbTheme,
  buttonTheme,
  cardTheme,
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
  splitterTheme,
  statusTheme,
  tagTheme,
  toastTheme,
  toolbarTheme,
  tooltipTheme,
  treegridTheme,
} from './components';
import { columnTheme, panelTheme } from './primitives';

export const defaultTheme: Theme<Record<string, any>> = {
  themeName: () => 'default',

  //
  // Primitives
  //

  column: columnTheme,
  panel: panelTheme,

  //
  // Components
  //

  avatar: avatarTheme,
  breadcrumb: breadcrumbTheme,
  button: buttonTheme,
  card: cardTheme,
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
  splitter: splitterTheme,
  status: statusTheme,
  tag: tagTheme,
  toast: toastTheme,
  toolbar: toolbarTheme,
  tooltip: tooltipTheme,
  treegrid: treegridTheme,
};

export const bindTheme = <P extends Record<string, any>>(theme: Theme<Record<string, any>>): ThemeFunction<P> => {
  return (path: string, styleProps?: P, ...etc: ClassNameArray) => {
    const result = getDeep<Theme<P> | ComponentFunction<P>>(theme, path.split('.'));
    return typeof result === 'function' ? result(styleProps ?? ({} as P), ...etc) : undefined;
  };
};

export const defaultTx = bindTheme(defaultTheme);
