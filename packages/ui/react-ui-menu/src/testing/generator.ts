//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { useEffect } from 'react';

import { Graph, Node } from '@dxos/app-graph';
import { live } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { type DeepWriteable } from '@dxos/util';

import { type ActionGraphProps } from '../hooks/useMenuActions';
import { type MenuAction, type MenuItem, type MenuItemGroup } from '../types';

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
    () =>
      live({
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

export const createNestedActions = Atom.make(() => {
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
});

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

export const mutateActionsOnInterval = (actions: Node.Action[]) => {
  let cursor = 0;
  return setInterval(() => {
    const action = actions[cursor] as DeepWriteable<Node.Action>;
    action.properties.icon = faker.helpers.arrayElement(
      action.properties.icon.endsWith('regular') ? icons.fill : icons.regular,
    );
    action.properties.disabled = !action.properties.disabled;
    cursor = (cursor + actions.length + 1) % actions.length;
  }, 1_000);
};

export const useMutateActions = (actions: MenuAction[]) =>
  useEffect(() => {
    const interval = mutateActionsOnInterval(actions);
    return () => clearInterval(interval);
  }, []);
