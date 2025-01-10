//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { type Action, Graph, type NodeArg, ACTION_TYPE, ACTION_GROUP_TYPE, actionGroupSymbol } from '@dxos/app-graph';
import { create } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { type DeepWriteable } from '@dxos/util';

import { type ToolbarItem } from '../components';
import { type MenuAction } from '../defs';

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
  const { callback = () => console.log('invoke'), count = 12, type = ACTION_TYPE } = params ?? {};
  return faker.helpers.multiple(
    () =>
      create({
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

export const createNestedActionGraph = (groupParams?: CreateActionsParams, params?: CreateActionsParams) => {
  const graph = new Graph();
  const actionGroups = createActions({ type: ACTION_GROUP_TYPE, ...groupParams });
  actionGroups.forEach((group) => {
    const actions = createActions(params);
    graph._addNodes([group as NodeArg<any>, ...(actions as NodeArg<any>[])]);
    graph._addEdges(actions.map((action) => ({ source: group.id, target: action.id })));
    void graph.expand(group);
  });
  console.log('[graph]', graph.toJSON());
  return { graph, topLevelActions: actionGroups as ToolbarItem[] };
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
