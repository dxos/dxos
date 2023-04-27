//
// Copyright 2023 DXOS.org
//
import get from 'lodash.get';

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import {
  buttonAppRoot,
  buttonOsRoot,
  inputAppInput,
  inputOsInput,
  dropdownMenuItem,
  listItemAppDragHandle,
  listItemOsDragHandle,
  listItemAppOpenTrigger,
  listItemOsOpenTrigger,
  buttonGroup,
  listRoot,
  listItemEndcap,
  listItemHeading,
  listItemDragHandleIcon,
  listItemOpenTriggerIcon,
  listItem
} from './components';

export const theme: Theme = {
  themeName: () => 'aurora',
  button: { root: buttonAppRoot, group: buttonGroup },
  input: { input: inputAppInput },
  dropdownMenu: { item: dropdownMenuItem },
  list: {
    root: listRoot,
    item: {
      root: listItem,
      endcap: listItemEndcap,
      heading: listItemHeading,
      dragHandle: listItemAppDragHandle,
      dragHandleIcon: listItemDragHandleIcon,
      openTrigger: listItemAppOpenTrigger,
      openTriggerIcon: listItemOpenTriggerIcon
    }
  }
};

export const osTheme: Theme = {
  ...theme,
  themeName: () => 'dxos',
  button: { ...theme.button, root: buttonOsRoot },
  input: { ...theme.input, input: inputOsInput },
  list: {
    ...theme.list,
    item: {
      ...(theme.list as Theme).item,
      dragHandle: listItemOsDragHandle,
      openTrigger: listItemOsOpenTrigger
    }
  }
};

export const tx = <P extends Record<string, any>>(
  path: string,
  defaultClassName: string,
  styleProps: P,
  ...options: any[]
): string => {
  const result: Theme | ComponentFunction<P> = get(theme, path);
  return typeof result === 'function' ? result(styleProps, ...options) : defaultClassName;
};

export const osTx = <P extends Record<string, any>>(
  path: string,
  defaultClassName: string,
  styleProps: P,
  ...options: any[]
): string => {
  const result: Theme | ComponentFunction<P> = get(osTheme, path);
  return typeof result === 'function' ? result(styleProps, ...options) : defaultClassName;
};
