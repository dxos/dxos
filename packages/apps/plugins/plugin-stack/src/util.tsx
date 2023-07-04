//
// Copyright 2023 DXOS.org
//

import { Article, Trash } from '@phosphor-icons/react';
import React from 'react';

import type { GraphNode } from '@braneframe/plugin-graph';
import { Stack } from '@braneframe/types';
import { Space } from '@dxos/client';
import { subscribe } from '@dxos/observable-object';

import { GenericStackObject, StackModel, StackObject, StackProperties } from './types';

export const STACK_PLUGIN = 'dxos:stack';

export const isStack = <T extends StackObject = GenericStackObject>(datum: unknown): datum is StackModel<T> =>
  datum && typeof datum === 'object'
    ? 'id' in datum &&
      typeof datum.id === 'string' &&
      typeof (datum as { [key: string]: any }).sections === 'object' &&
      typeof (datum as { [key: string]: any }).sections?.length === 'number'
    : false;

export const isStackProperties = (datum: unknown): datum is StackProperties =>
  datum && typeof datum === 'object' ? subscribe in datum : false;

export const stackToGraphNode = (obj: Stack, parent: GraphNode<Space>): GraphNode => ({
  id: obj.id,
  label: obj.title ?? 'Untitled Stack',
  icon: (props) => <Article {...props} />,
  data: obj,
  parent,
  pluginActions: {
    [STACK_PLUGIN]: [
      {
        id: 'delete',
        label: ['delete stack label', { ns: STACK_PLUGIN }],
        icon: (props) => <Trash {...props} />,
        invoke: async () => {
          parent.data?.db.remove(obj);
        },
      },
    ],
  },
});
