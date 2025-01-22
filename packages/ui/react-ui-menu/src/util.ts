//
// Copyright 2025 DXOS.org
//

import { ACTION_GROUP_TYPE, ACTION_TYPE, actionGroupSymbol, type ActionLike } from '@dxos/app-graph';
import { getHostPlatform } from '@dxos/util';

import {
  type MenuAction,
  type MenuActionProperties,
  type MenuItemGroup,
  type MenuItemGroupProperties,
  type MenuSeparator,
} from './defs';

export const getShortcut = (action: ActionLike) => {
  return typeof action.properties?.keyBinding === 'string'
    ? action.properties.keyBinding
    : action.properties?.keyBinding?.[getHostPlatform()];
};

export const fallbackIcon = 'ph--placeholder--regular';

const noop = () => {};

export const createMenuAction = <P extends {} = {}>(id: string, properties: P & MenuActionProperties) =>
  ({
    id,
    type: ACTION_TYPE,
    properties,
    data: noop,
  }) satisfies MenuAction;

export const createMenuItemGroup = <
  P extends MenuItemGroupProperties = MenuItemGroupProperties & Partial<MenuActionProperties>,
>(
  id: string,
  properties: P,
) =>
  ({
    id,
    type: ACTION_GROUP_TYPE,
    properties,
    data: actionGroupSymbol,
  }) satisfies MenuItemGroup;

export const createGapSeparator = (id: string = 'gap') =>
  ({
    id,
    type: '@dxos/react-ui-toolbar/separator',
    properties: { variant: 'gap' },
    data: undefined as never,
  }) satisfies MenuSeparator;

export const createLineSeparator = (id: string = 'line') =>
  ({
    id,
    type: '@dxos/react-ui-toolbar/separator',
    properties: { variant: 'line' },
    data: undefined as never,
  }) satisfies MenuSeparator;
