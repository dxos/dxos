//
// Copyright 2023 DXOS.org
//

import { Chat, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Thread as ThreadType } from '@braneframe/types';
import { Space } from '@dxos/client/echo';

import { THREAD_PLUGIN } from './types';

export const objectToGraphNode = (
  parent: Graph.Node<Space>,
  object: ThreadType,
  index: string,
): Graph.Node<ThreadType> => {
  const [child] = parent.add({
    id: object.id,
    label: object.title ?? ['thread title placeholder', { ns: THREAD_PLUGIN }],
    icon: (props) => <Chat {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
    },
  });

  child.addAction({
    id: 'delete', // TODO(burdon): Namespace.
    label: ['delete thread label', { ns: THREAD_PLUGIN }],
    icon: (props) => <Trash {...props} />,
    intent: {
      action: SpaceAction.REMOVE_OBJECT,
      data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
    },
  });

  return child;
};
