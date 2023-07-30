//
// Copyright 2023 DXOS.org
//

import { Chat, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import { GraphNode } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Thread as ThreadType } from '@braneframe/types';

import { THREAD_PLUGIN } from './types';

export const objectToGraphNode = (parent: GraphNode, object: ThreadType, index: string): GraphNode => ({
  id: object.id,
  index: get(object, 'meta.index', index), // TODO(burdon): Data should not be on object?
  label: object.title ?? ['thread title placeholder', { ns: THREAD_PLUGIN }],
  icon: (props) => <Chat {...props} />,
  data: object,
  parent,
  pluginActions: {
    [THREAD_PLUGIN]: [
      {
        id: 'delete', // TODO(burdon): Namespace.
        index: 'a1',
        label: ['delete thread label', { ns: THREAD_PLUGIN }],
        icon: (props) => <Trash {...props} />,
        intent: {
          action: SpaceAction.REMOVE_OBJECT,
          data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
        },
      },
    ],
  },
});
