//
// Copyright 2023 DXOS.org
//

import { Graph } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { Node } from '@braneframe/plugin-graph';
import { type View as ViewType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';

import { EXPLORER_PLUGIN } from './types';

export const objectToGraphNode = (parent: Node<Space>, object: ViewType, index: string): Node<ViewType> => {
  const [child] = parent.addNode(EXPLORER_PLUGIN, {
    id: object.id,
    label: object.title ?? ['object title placeholder', { ns: EXPLORER_PLUGIN }],
    icon: (props) => <Graph {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
      persistenceClass: 'spaceObject',
    },
  });

  return child;
};
