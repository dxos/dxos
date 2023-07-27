//
// Copyright 2023 DXOS.org
//

import { Asterisk, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import { GraphNode } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Space, TypedObject } from '@dxos/client/echo';

import { TEMPLATE_PLUGIN } from './types';

// TODO(burdon): Generic "object" var name?
export const objectToGraphNode = (parent: GraphNode<Space>, object: TypedObject, index: string): GraphNode => ({
  id: object.id,
  index: get(object, 'meta.index', index),
  label: object.title ?? 'New Object', // TODO(burdon): Translation.
  icon: (props) => <Asterisk {...props} />,
  data: object,
  parent,
  pluginActions: {
    [TEMPLATE_PLUGIN]: [
      {
        id: 'delete',
        index: 'a1',
        label: ['delete object label', { ns: TEMPLATE_PLUGIN }],
        icon: (props) => <Trash {...props} />,
        intent: {
          action: SpaceAction.REMOVE_OBJECT,
          data: { spaceKey: parent.data?.key.toHex(), objectId: object.id }, // TODO(burdon): Auto-detect keys?
        },
      },
    ],
  },
});
