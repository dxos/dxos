//
// Copyright 2023 DXOS.org
//

import { SquaresFour } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { Node } from '@braneframe/plugin-graph';
import type { Grid as GridType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';

import { GRID_PLUGIN } from './types';

export const objectToGraphNode = (parent: Node<Space>, object: GridType, index: string): Node<GridType> => {
  const [child] = parent.addNode(GRID_PLUGIN, {
    id: object.id,
    label: object.title ?? ['grid title placeholder', { ns: GRID_PLUGIN }],
    icon: (props) => <SquaresFour {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
      persistenceClass: 'spaceObject',
    },
  });

  return child;
};
