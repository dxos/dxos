//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { useContext, useEffect } from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as GraphNode from '@dxos/graph/GraphNode';
import { random } from '@dxos/random';

import { type ActionGraphProps } from '../hooks/useMenuActions.ts';
import { type MenuItem, type MenuItemGroup, type MenuItemsAccessor } from '../types.ts';

export type CreateActionsProps = Partial<{
  type?: typeof AppGraphNode.ActionType | typeof AppGraphNode.ActionGroupType;
  callback: () => void;
  count: number;
}>;

const icons = {
  regular: [
    'ph--text-b--regular',
    'ph--text-italic--regular',
    'ph--text-h-five--regular',
    'ph--chat-text--regular',
    'ph--clipboard-text--regular',
    'ph--link-simple--regular',
  ],
  fill: [
    'ph--text-b--fill',
    'ph--text-italic--fill',
    'ph--text-h-five--fill',
    'ph--chat-text--fill',
    'ph--clipboard-text--fill',
    'ph--link-simple--fill',
  ],
};

export const createActions = (params?: CreateActionsProps) => {
  const { callback = () => console.log('invoke'), count = 12, type = AppGraphNode.ActionType } = params ?? {};
  return random.helpers.multiple(
    () => ({
      id: random.string.uuid(),
      type,
      data: type === AppGraphNode.ActionGroupType ? AppGraphNode.actionGroupSymbol : callback,
      properties: {
        label: random.lorem.words(2),
        icon: random.helpers.arrayElement(icons[random.helpers.arrayElement(Object.keys(icons)) as keyof typeof icons]),
        disabled: random.helpers.arrayElement([true, false]),
        ...(type === AppGraphNode.ActionGroupType && { variant: 'dropdownMenu' }),
      },
    }),
    { count },
  );
};

const buildNestedActions = (): ActionGraphProps => {
  const result: ActionGraphProps = { edges: [], nodes: [] };
  const actionGroups = createActions({ type: AppGraphNode.ActionGroupType });
  actionGroups.forEach((group) => {
    const actions = createActions();
    result.nodes.push(group, ...actions);
    result.edges.push(
      { source: 'root', target: group.id, relation: 'child' },
      ...actions.map((action) => ({ source: group.id, target: action.id, relation: 'child' })),
    );
  });
  return result;
};

export const createNestedActions = Atom.make(buildNestedActions()).pipe(Atom.keepAlive);

export const createNestedActionsResolver = (props?: {
  groupParams?: CreateActionsProps;
  params?: CreateActionsProps;
  registry?: Registry.AtomRegistry;
}) => {
  const { groupParams, params, registry } = props ?? {};
  const graph = AppGraph.make({ ...(registry && { registry }) });
  const actionGroups = createActions({ type: AppGraphNode.ActionGroupType, ...groupParams });
  actionGroups.forEach((group) => {
    const actions = createActions(params);
    AppGraph.addNodes(graph, [group as AppGraphNode.NodeArg<any>, ...(actions as AppGraphNode.NodeArg<any>[])]);
    AppGraph.addEdges(graph, [
      { source: 'root', target: group.id, relation: 'child' },
      ...actions.map((action) => ({ source: group.id, target: action.id, relation: 'child' })),
    ]);
    AppGraph.expandSync(graph, group.id, 'child');
  });
  const items: MenuItemsAccessor = (group?: MenuItemGroup) =>
    graph.connections(group?.id ?? GraphNode.RootId, 'child') as Atom.Atom<MenuItem[] | null>;
  return { items };
};

/**
 * Hook to mutate actions in an atom on an interval for testing reactivity.
 */
export const useMutateActions = (actionsAtom: Atom.Writable<ActionGraphProps>) => {
  const registry = useContext(RegistryContext);

  useEffect(() => {
    let cursor = 0;
    const interval = setInterval(() => {
      const current = registry.get(actionsAtom);
      const nodes = current.nodes.map((node, index) => {
        if (index !== cursor) {
          return node;
        }
        return {
          ...node,
          properties: {
            ...node.properties,
            icon: random.helpers.arrayElement(node.properties?.icon?.endsWith('regular') ? icons.fill : icons.regular),
            disabled: !node.properties?.disabled,
          },
        };
      });
      registry.set(actionsAtom, { ...current, nodes });
      cursor = (cursor + 1) % current.nodes.length;
    }, 1_000);

    return () => clearInterval(interval);
  }, [actionsAtom, registry]);
};
