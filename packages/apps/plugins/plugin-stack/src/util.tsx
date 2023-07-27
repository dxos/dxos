//
// Copyright 2023 DXOS.org
//

import { Article, IconProps, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { GraphNode } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Stack } from '@braneframe/types';
import { EchoObject, Space } from '@dxos/client/echo';

import { GenericStackObject, STACK_PLUGIN, StackModel, StackObject, StackProperties } from './types';

export const isStack = <T extends StackObject = GenericStackObject>(datum: unknown): datum is StackModel<T> =>
  datum && typeof datum === 'object'
    ? 'id' in datum &&
      typeof datum.id === 'string' &&
      typeof (datum as { [key: string]: any }).sections === 'object' &&
      typeof (datum as { [key: string]: any }).sections?.length === 'number'
    : false;

export const isStackProperties = (datum: unknown): datum is StackProperties => datum instanceof EchoObject;

export const stackToGraphNode = (parent: GraphNode<Space>, obj: Stack, index: string): GraphNode => ({
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
        intent: {
          action: SpaceAction.REMOVE_OBJECT,
          data: { spaceKey: parent.data?.key.toHex(), objectId: obj.id },
        },
      },
    ],
  },
});
