//
// Copyright 2023 DXOS.org
//

import { Compass, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Space, TypedObject } from '@dxos/client/echo';

import { MAP_PLUGIN } from './types';

export const objectToGraphNode = (
  parent: Graph.Node<Space>,
  object: TypedObject,
  index: string,
): Graph.Node<TypedObject> => {
  const [child] = parent.add({
    id: object.id,
    label: object.title ?? ['object title placeholder', { ns: MAP_PLUGIN }],
    icon: (props) => <Compass {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
    },
  });

  child.addAction({
    id: 'delete',
    label: ['delete object label', { ns: MAP_PLUGIN }],
    icon: (props) => <Trash {...props} />,
    intent: {
      action: SpaceAction.REMOVE_OBJECT,
      data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
    },
  });

  return child;
};
