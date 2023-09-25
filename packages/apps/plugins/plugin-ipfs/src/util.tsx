//
// Copyright 2023 DXOS.org
//

import { Image, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { Node } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Kanban as KanbanType } from '@braneframe/types';
import { Space } from '@dxos/client/echo';

import { IPFS_PLUGIN } from './types';

export const objectToGraphNode = (parent: Node<Space>, object: KanbanType, index: string): Node<KanbanType> => {
  const [child] = parent.addNode(IPFS_PLUGIN, {
    id: object.id,
    label: object.title ?? ['object title placeholder', { ns: IPFS_PLUGIN }],
    icon: (props) => <Image {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
      persistenceClass: 'spaceObject',
    },
  });

  child.addAction({
    id: 'delete',
    label: ['delete object label', { ns: IPFS_PLUGIN }],
    icon: (props) => <Trash {...props} />,
    intent: {
      action: SpaceAction.REMOVE_OBJECT,
      data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
    },
  });

  return child;
};
