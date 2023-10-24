//
// Copyright 2023 DXOS.org
//

import { Chat } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import { type Node } from '@braneframe/plugin-graph';
import { type Thread as ThreadType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';

import { THREAD_PLUGIN } from './types';

export const objectToGraphNode = (parent: Node<Space>, object: ThreadType, index: string): Node<ThreadType> => {
  const [child] = parent.addNode(THREAD_PLUGIN, {
    id: object.id,
    label: object.title ?? ['thread title placeholder', { ns: THREAD_PLUGIN }],
    icon: (props) => <Chat {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
      persistenceClass: 'spaceObject',
    },
  });

  return child;
};
