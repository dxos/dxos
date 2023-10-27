//
// Copyright 2023 DXOS.org
//

import { Image } from '@phosphor-icons/react';
import React from 'react';

import type { Node } from '@braneframe/plugin-graph';
import { type TypedObject, type Space } from '@dxos/client/echo';

import { IPFS_PLUGIN } from './types';

export const objectToGraphNode = (parent: Node<Space>, object: TypedObject) => {
  const [child] = parent.addNode(IPFS_PLUGIN, {
    id: object.id,
    label: object.title ?? ['object title placeholder', { ns: IPFS_PLUGIN }],
    icon: (props) => <Image {...props} />,
    data: object,
    properties: {
      persistenceClass: 'spaceObject',
    },
  });

  return child;
};
