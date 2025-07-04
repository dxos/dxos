//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { useEffect } from 'react';

import {
  type Action,
  Graph,
  type NodeArg,
  ACTION_TYPE,
  ACTION_GROUP_TYPE,
  actionGroupSymbol,
  ROOT_ID,
} from '@dxos/app-graph';
import { live } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { type DeepWriteable } from '@dxos/util';

import { type ActionGraphProps } from '../hooks/useMenuActions';
import { type MenuAction, type MenuItemGroup, type MenuItem } from '../types';

export type CreateActionsParams = Partial<{
  type?: typeof ACTION_TYPE | typeof ACTION_GROUP_TYPE;
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
  const { callback = () => console.log('invoke'), count = 12, type = ACTION_TYPE } = params ?? {};
  return faker.helpers.multiple(
    () =>
      live({
        id: faker.string.uuid(),
        type,
        data: type === ACTION_GROUP_TYPE ? actionGroupSymbol : callback,
        properties: {
          label: faker.lorem.words(2),
          icon: faker.helpers.arrayElement(icons[faker.helpers.arrayElement(Object.keys(icons)) as keyof typeof icons]),
          disabled: faker.helpers.arrayElement([true, false]),
          ...(type === ACTION_GROUP_TYPE && { variant: 'dropdownMenu' }),
        },
      }),
    { count },
  );
};

export const createNestedActions = Rx.make(() => {
  const result: ActionGraphProps = { edges: [], nodes: [] };
  const actionGroups = createActions({ type: ACTION_GROUP_TYPE });
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
  const graph = new Graph();
  const actionGroups = createActions({ type: ACTION_GROUP_TYPE, ...groupParams });
  actionGroups.forEach((group) => {
    const actions = createActions(params);
    graph.addNodes([group as NodeArg<any>, ...(actions as NodeArg<any>[])]);
    graph.addEdges([
      { source: 'root', target: group.id },
      ...actions.map((action) => ({ source: group.id, target: action.id })),
    ]);
    void graph.expand(group.id);
  });
  const resolveGroupItems = (groupNode?: MenuItemGroup) =>
    (graph.getActions(groupNode?.id ?? ROOT_ID) || null) as MenuItem[] | null;
  return { resolveGroupItems };
};

export const mutateActionsOnInterval = (actions: Action[]) => {
  let cursor = 0;
  return setInterval(() => {
    const action = actions[cursor] as DeepWriteable<Action>;
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
