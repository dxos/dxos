//
// Copyright 2023 DXOS.org
//

import { ShieldChevron } from '@phosphor-icons/react';
import React from 'react';

import type { Node } from '@braneframe/plugin-graph';
import { type Space, type TypedObject } from '@dxos/client/echo';

import { CHESS_PLUGIN } from './types';

export const objectToGraphNode = (parent: Node<Space>, object: TypedObject): Node<TypedObject> => {
  const [child] = parent.addNode(CHESS_PLUGIN, {
    id: object.id,
    label: object.title ?? ['game title placeholder', { ns: CHESS_PLUGIN }],
    icon: (props) => <ShieldChevron {...props} />,
    data: object,
    properties: {
      persistenceClass: 'spaceObject',
    },
  });

  return child;
};
