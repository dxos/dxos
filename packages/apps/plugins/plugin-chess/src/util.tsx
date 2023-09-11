//
// Copyright 2023 DXOS.org
//

import { ShieldChevron, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { Graph } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Space, TypedObject } from '@dxos/client/echo';

import { CHESS_PLUGIN } from './types';

export const objectToGraphNode = (
  parent: Graph.Node<Space>,
  object: TypedObject,
  index: string,
): Graph.Node<TypedObject> => {
  const [child] = parent.add({
    id: object.id,
    label: object.title ?? ['game title placeholder', { ns: CHESS_PLUGIN }],
    icon: (props) => <ShieldChevron {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
      persistenceClass: 'spaceObject',
    },
  });

  child.addAction({
    id: 'delete',
    label: ['delete game label', { ns: CHESS_PLUGIN }],
    icon: (props) => <Trash {...props} />,
    intent: {
      action: SpaceAction.REMOVE_OBJECT,
      data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
    },
  });

  return child;
};
