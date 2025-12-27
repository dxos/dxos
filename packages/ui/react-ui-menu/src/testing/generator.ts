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

export type CreateActionsParams = Partial<{
  type?: typeof Graph.ACTION_TYPE | typeof Graph.ACTION_GROUP_TYPE;
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

export const createActions = (params?: CreateActionsParams) => {
  // eslint-disable-next-line no-console
  const { callback = () => console.log('invoke'), count = 12, type = Graph.ACTION_TYPE } = params ?? {};
  return faker.helpers.multiple(
    () =>
      live({
        id: faker.string.uuid(),
        type,
        data: type === Graph.ACTION_GROUP_TYPE ? Node.actionGroupSymbol : callback,
        properties: {
          label: faker.lorem.words(2),
          icon: faker.helpers.arrayElement(icons[faker.helpers.arrayElement(Object.keys(icons)) as keyof typeof icons]),
          disabled: faker.helpers.arrayElement([true, false]),
          ...(type === Graph.ACTION_GROUP_TYPE && { variant: 'dropdownMenu' }),
        },
      }),
    { count },
  );
};

export const createNestedActions = Atom.make(() => {
  const result: ActionGraphProps = { edges: [], nodes: [] };
  const actionGroups = createActions({ type: Graph.ACTION_GROUP_TYPE });
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

export const createNestedActionsResolver = (groupParams?: CreateActionsParams, params?: CreateActionsParams) => {
  const graph = Graph.make();
  const actionGroups = createActions({ type: Graph.ACTION_GROUP_TYPE, ...groupParams });
  actionGroups.forEach((group) => {
    const actions = createActions(params);
    graph.addNodes([group as Node.NodeArg<any>, ...(actions as Node.NodeArg<any>[])]);
    graph.addEdges([
      { source: 'root', target: group.id },
      ...actions.map((action) => ({ source: group.id, target: action.id })),
    ]);
    void graph.expand(group.id);
  });
  const resolveGroupItems = (groupNode?: MenuItemGroup) =>
    (graph.getActions(groupNode?.id ?? Graph.ROOT_ID) || null) as MenuItem[] | null;
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
