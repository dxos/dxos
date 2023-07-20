//
// Copyright 2023 DXOS.org
//

import { Article, IconProps, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { GraphNode } from '@braneframe/plugin-graph';
import { Stack } from '@braneframe/types';
import { EchoObject, Space } from '@dxos/client';

import { GenericStackObject, StackModel, StackObject, StackProperties } from './types';

export const STACK_PLUGIN = 'dxos:stack';

export const isStack = <T extends StackObject = GenericStackObject>(datum: unknown): datum is StackModel<T> =>
  datum && typeof datum === 'object'
    ? 'id' in datum &&
      typeof datum.id === 'string' &&
      typeof (datum as { [key: string]: any }).sections === 'object' &&
      typeof (datum as { [key: string]: any }).sections?.length === 'number'
    : false;

export const isStackProperties = (datum: unknown): datum is StackProperties => datum instanceof EchoObject;

export const stackToGraphNode = (obj: Stack, parent: GraphNode<Space>, index: string): GraphNode => ({
  id: obj.id,
  index: get(obj, 'meta.index', index), // TODO(burdon): Data should not be on object?
  label: obj.title ?? 'New Stack', // TODO(burdon): Translation.
  icon: (props: IconProps) => <Article {...props} />,
  data: obj,
  parent,
  pluginActions: {
    [STACK_PLUGIN]: [
      {
        id: 'delete',
        index: 'a1',
        label: ['delete stack label', { ns: STACK_PLUGIN }],
        icon: (props: IconProps) => <Trash {...props} />,
        invoke: async () => {
          parent.data?.db.remove(obj);
        },
      },
    ],
  },
});
