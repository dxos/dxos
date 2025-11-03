//
// Copyright 2025 DXOS.org
//

import { ACTION_GROUP_TYPE, ACTION_TYPE, type ActionLike, actionGroupSymbol } from '@dxos/app-graph';
import { getHostPlatform } from '@dxos/util';

import {
  type MenuAction,
  type MenuActionProperties,
  type MenuItemGroup,
  type MenuItemGroupProperties,
  type MenuSeparator,
} from './types';

export const getShortcut = (action: ActionLike) =>
  typeof action.properties?.keyBinding === 'string'
    ? action.properties.keyBinding
    : action.properties?.keyBinding?.[getHostPlatform()];

export const fallbackIcon = 'ph--placeholder--regular';

export const createMenuAction = <P extends {} = {}>(
  id: string,
  invoke: () => void,
  properties: P & MenuActionProperties,
) =>
  ({
    id,
    type: ACTION_TYPE,
    properties,
    data: invoke,
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

export const createGapSeparator = (id: string = 'gap', source: string = 'root') => ({
  nodes: [
    {
      id,
      type: '@dxos/react-ui-toolbar/separator',
      properties: { variant: 'gap' },
      data: undefined as never,
    } satisfies MenuSeparator,
  ],
  edges: [
    {
      source,
      target: id,
    },
  ],
});

export const createLineSeparator = (id: string = 'line', source: string = 'root') => ({
  nodes: [
    {
      id,
      type: '@dxos/react-ui-toolbar/separator',
      properties: { variant: 'line' },
      data: undefined as never,
    } satisfies MenuSeparator,
  ],
  edges: [{ source, target: id }],
});
