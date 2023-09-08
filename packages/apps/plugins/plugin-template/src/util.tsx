//
// Copyright 2023 DXOS.org
//

import { Asterisk, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Space, TypedObject } from '@dxos/client/echo';

import { TEMPLATE_PLUGIN } from './types';

// TODO(burdon): Anti-pattern to have util.ts?
// TODO(burdon): Generic "object" var name?
export const objectToGraphNode = (
  parent: Graph.Node<Space>,
  object: TypedObject,
  index: string,
): Graph.Node<TypedObject> => {
  const [child] = parent.add({
    id: object.id,
    label: object.title ?? ['object title placeholder', { ns: TEMPLATE_PLUGIN }],
    icon: (props) => <Asterisk {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
      persistenceClass: 'spaceObject',
    },
  });

  child.addAction({
    id: 'delete',
    label: ['delete object label', { ns: TEMPLATE_PLUGIN }],
    icon: (props) => <Trash {...props} />,
    intent: {
      action: SpaceAction.REMOVE_OBJECT,
      data: { spaceKey: parent.data?.key.toHex(), objectId: object.id }, // TODO(burdon): Auto-detect keys?
    },
  });

  return child;
};
