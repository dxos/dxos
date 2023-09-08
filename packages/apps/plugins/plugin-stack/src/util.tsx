//
// Copyright 2023 DXOS.org
//

import { IconProps, StackSimple, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { Graph } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Stack as StackType } from '@braneframe/types';
import { EchoObject, Space } from '@dxos/client/echo';

import { GenericStackObject, STACK_PLUGIN, StackModel, StackObject, StackProperties } from './types';

export const isStack = <T extends StackObject = GenericStackObject>(data: unknown): data is StackModel<T> =>
  data && typeof data === 'object'
    ? 'id' in data &&
      typeof data.id === 'string' &&
      typeof (data as { [key: string]: any }).sections === 'object' &&
      typeof (data as { [key: string]: any }).sections?.length === 'number'
    : false;

export const isStackProperties = (data: unknown): data is StackProperties => data instanceof EchoObject;

export const stackToGraphNode = (parent: Graph.Node<Space>, object: StackType, index: string): Graph.Node => {
  const [child] = parent.add({
    id: object.id,
    label: object.title ?? ['stack title placeholder', { ns: STACK_PLUGIN }],
    icon: (props: IconProps) => <StackSimple {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
      persistenceClass: 'spaceObject',
    },
  });

  child.addAction({
    id: 'delete',
    label: ['delete stack label', { ns: STACK_PLUGIN }],
    icon: (props: IconProps) => <Trash {...props} />,
    intent: {
      action: SpaceAction.REMOVE_OBJECT,
      data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
    },
  });

  return child;
};
