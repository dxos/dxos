//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { EffectEx } from '@dxos/effect';
import {
  type MenuActionProperties,
  type MenuEntry,
  type MenuGroupEntry,
  type MenuItemGroupProperties,
} from '@dxos/ui-types';

import {
  type MenuAction,
  type MenuGroupContext,
  type MenuItem,
  type MenuItemGroup,
  type MenuSeparator,
  isMenuGroup,
  isSeparator,
} from './types';

/**
 * Execute a menu action's Effect with its captured context.
 * This provides the `_actionContext` layer if available.
 */
export const executeMenuAction = async (action: MenuAction, params: AppGraphNode.InvokeProps = {}): Promise<void> => {
  let effect = action.data(params);

  // Provide captured action context if available.
  if (action._actionContext) {
    effect = effect.pipe(Effect.provide(action._actionContext));
  }

  await EffectEx.runAndForwardErrors(effect);
};

//
// Entries: the graph nodes projected onto the plain model `@dxos/react-ui` renders. The node behind
// an entry is kept beside it (not on it), so the model stays free of graph types while an
// invocation can still reach the node's Effect.
//

const entryNodes = new WeakMap<MenuEntry, MenuItem | MenuGroupContext>();

/** The plain entry for a menu node. */
export const toMenuEntry = (item: MenuItem): MenuEntry => {
  const entry: MenuEntry = isSeparator(item)
    ? { id: item.id, kind: 'separator', properties: { variant: item.properties.variant } }
    : isMenuGroup(item)
      ? // A graph group's properties are an open record, validated by the plugin that contributed them.
        { id: item.id, kind: 'group', properties: item.properties as MenuItemGroupProperties }
      : { id: item.id, kind: 'action', properties: item.properties as MenuActionProperties };
  entryNodes.set(entry, item);
  return entry;
};

/** A group entry for any node whose connections are a menu's items, not only an action group. */
export const toMenuGroupEntry = (node: MenuGroupContext): MenuGroupEntry => {
  const entry: MenuGroupEntry = { id: node.id, kind: 'group', properties: node.properties as MenuItemGroupProperties };
  entryNodes.set(entry, node);
  return entry;
};

/** The node an entry was projected from; undefined for an entry this package did not produce. */
export const menuEntryNode = (entry: MenuEntry): MenuItem | MenuGroupContext | undefined => entryNodes.get(entry);

export const fallbackIcon = 'ph--circle-dashed--regular';

export const createMenuAction = <P extends {} = {}>(
  id: string,
  invoke: (params?: AppGraphNode.InvokeProps) => void,
  properties: P & MenuActionProperties,
) =>
  ({
    id,
    type: AppGraphNode.ActionType,
    properties,
    data: (params?: AppGraphNode.InvokeProps) => Effect.sync(() => invoke(params)),
  }) satisfies MenuAction;

export const createMenuItemGroup = <P extends MenuItemGroupProperties>(id: string, properties: P) =>
  ({
    id,
    type: AppGraphNode.ActionGroupType,
    properties,
    data: AppGraphNode.actionGroupSymbol,
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
      relation: 'child' as const,
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
  edges: [{ source, target: id, relation: 'child' as const }],
});
