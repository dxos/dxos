//
// Copyright 2025 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import { useContext, useEffect } from 'react';

import { Graph, Node } from '@dxos/app-graph';
import { faker } from '@dxos/random';

import { type ActionGraphProps } from '../hooks/useMenuActions';
import { type MenuItem, type MenuItemGroup } from '../types';

export type CreateActionsProps = Partial<{
  type?: typeof Node.ActionType | typeof Node.ActionGroupType;
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
  const { callback = () => console.log('invoke'), count = 12, type = Node.ActionType } = params ?? {};
  return faker.helpers.multiple(
    () => ({
      id: faker.string.uuid(),
      type,
      data: type === Node.ActionGroupType ? Node.actionGroupSymbol : callback,
      properties: {
        label: faker.lorem.words(2),
        icon: faker.helpers.arrayElement(icons[faker.helpers.arrayElement(Object.keys(icons)) as keyof typeof icons]),
        disabled: faker.helpers.arrayElement([true, false]),
        ...(type === Node.ActionGroupType && { variant: 'dropdownMenu' }),
      },
    }),
    { count },
  );
};

const buildNestedActions = (): ActionGraphProps => {
  const result: ActionGraphProps = { edges: [], nodes: [] };
  const actionGroups = createActions({ type: Node.ActionGroupType });
  actionGroups.forEach((group) => {
    const actions = createActions();
    result.nodes.push(group, ...actions);
    result.edges.push(
      { source: 'root', target: group.id },
      ...actions.map((action) => ({ source: group.id, target: action.id })),
    );
  });
  return result;
};

export const createNestedActions = Atom.make(buildNestedActions()).pipe(Atom.keepAlive);

export const createNestedActionsResolver = (groupParams?: CreateActionsProps, params?: CreateActionsProps) => {
  const graph = Graph.make();
  const actionGroups = createActions({ type: Node.ActionGroupType, ...groupParams });
  actionGroups.forEach((group) => {
    const actions = createActions(params);
    graph.pipe(
      Graph.addNodes([group as Node.NodeArg<any>, ...(actions as Node.NodeArg<any>[])]),
      Graph.addEdges([
        { source: 'root', target: group.id },
        ...actions.map((action) => ({ source: group.id, target: action.id })),
      ]),
      Graph.expand(group.id),
    );
  });
  const resolveGroupItems = (groupNode?: MenuItemGroup) =>
    (Graph.getActions(graph, groupNode?.id ?? Node.RootId) || null) as MenuItem[] | null;
  return { resolveGroupItems };
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
            icon: faker.helpers.arrayElement(node.properties?.icon?.endsWith('regular') ? icons.fill : icons.regular),
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
