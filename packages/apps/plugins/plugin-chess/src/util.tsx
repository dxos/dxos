//
// Copyright 2023 DXOS.org
//

import { ShieldChevron, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import { GraphNode } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Space, TypedObject } from '@dxos/client/echo';

import { CHESS_PLUGIN } from './types';

export const objectToGraphNode = (parent: GraphNode<Space>, object: TypedObject, index: string): GraphNode => ({
  id: object.id,
  index: get(object, 'meta.index', index),
  label: object.title ?? 'New game',
  icon: (props) => <ShieldChevron {...props} />,
  data: object,
  parent,
  pluginActions: {
    [CHESS_PLUGIN]: [
      {
        id: 'delete',
        index: 'a1',
        label: ['delete object label', { ns: CHESS_PLUGIN }],
        icon: (props) => <Trash {...props} />,
        intent: {
          action: SpaceAction.REMOVE_OBJECT,
          data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
        },
      },
    ],
  },
});
