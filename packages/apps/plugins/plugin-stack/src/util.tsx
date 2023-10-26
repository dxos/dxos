//
// Copyright 2023 DXOS.org
//

import { type IconProps, StackSimple } from '@phosphor-icons/react';
import React from 'react';

import type { Node } from '@braneframe/plugin-graph';
import { type Stack as StackType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';

import { STACK_PLUGIN } from './types';

// TODO(wittjosiah): Assume typed object and just check for typename?
export const isStack = (data: unknown): data is StackType =>
  data && typeof data === 'object'
    ? 'id' in data &&
      typeof data.id === 'string' &&
      typeof (data as { [key: string]: any }).sections === 'object' &&
      typeof (data as { [key: string]: any }).sections?.length === 'number'
    : false;

export const stackToGraphNode = (parent: Node<Space>, object: StackType): Node => {
  const [child] = parent.addNode(STACK_PLUGIN, {
    id: object.id,
    label: object.title || ['stack title placeholder', { ns: STACK_PLUGIN }],
    icon: (props: IconProps) => <StackSimple {...props} />,
    data: object,
    properties: {
      persistenceClass: 'spaceObject',
    },
  });

  return child;
};
