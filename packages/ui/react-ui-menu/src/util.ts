//
// Copyright 2025 DXOS.org
//

import { ACTION_GROUP_TYPE, ACTION_TYPE, actionGroupSymbol, type ActionLike } from '@dxos/app-graph';
import { getHostPlatform } from '@dxos/util';

import { type MenuAction, type MenuActionProperties, type MenuItemGroup, type MenuItemGroupProperties } from './defs';

export const getShortcut = (action: ActionLike) => {
  return typeof action.properties?.keyBinding === 'string'
    ? action.properties.keyBinding
    : action.properties?.keyBinding?.[getHostPlatform()];
};

export const fallbackIcon = 'ph--placeholder--regular';

const noop = () => {};

export const createMenuAction = <P extends MenuActionProperties = MenuActionProperties>(id: string, properties: P) =>
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
