//
// Copyright 2023 DXOS.org
//

import { CompassTool } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { Node } from '@braneframe/plugin-graph';
import { type Sketch as SketchType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';

import { SKETCH_PLUGIN } from './types';

export const objectToGraphNode = (parent: Node<Space>, object: SketchType, index: string): Node<SketchType> => {
  const [child] = parent.addNode(SKETCH_PLUGIN, {
    id: object.id,
    label: object.title ?? ['object title placeholder', { ns: SKETCH_PLUGIN }],
    icon: (props) => <CompassTool {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
      persistenceClass: 'spaceObject',
    },
  });

  return child;
};
