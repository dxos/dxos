//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Node } from '@dxos/app-graph';
import { runAndForwardErrors } from '@dxos/effect';
import { type MenuActionProperties, type MenuItemGroupProperties } from '@dxos/ui-types';
import { getHostPlatform } from '@dxos/util';

import { type MenuAction, type MenuItemGroup, type MenuSeparator } from './types';

/**
 * Execute a menu action's Effect with its captured context.
 * This provides the `_actionContext` layer if available.
 */
export const executeMenuAction = async (action: MenuAction, params: Node.InvokeProps = {}): Promise<void> => {
  let effect = action.data(params);

  // Provide captured action context if available.
  if (action._actionContext) {
    effect = effect.pipe(Effect.provide(action._actionContext));
  }

  await runAndForwardErrors(effect);
};

export const getShortcut = (action: Node.ActionLike) => {
  return typeof action.properties?.keyBinding === 'string'
    ? action.properties.keyBinding
    : action.properties?.keyBinding?.[getHostPlatform()];
};

export const fallbackIcon = 'ph--placeholder--regular';

export const createMenuAction = <P extends {} = {}>(
  id: string,
  invoke: () => void,
  properties: P & MenuActionProperties,
) =>
  ({
    id,
    type: Node.ActionType,
    properties,
    data: () => Effect.sync(invoke),
  }) satisfies MenuAction;

export const createMenuItemGroup = <
  P extends MenuItemGroupProperties = MenuItemGroupProperties & Partial<MenuActionProperties>,
>(
  id: string,
  properties: P,
) =>
  ({
    id,
    type: Node.ActionGroupType,
    properties,
    data: Node.actionGroupSymbol,
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
