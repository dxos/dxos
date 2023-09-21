//
// Copyright 2023 DXOS.org
//

import { CompassTool } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { Graph } from '@braneframe/plugin-graph';
// TODO(burdon): Move to graph?
import { Sketch as SketchType } from '@braneframe/types';
import { Space } from '@dxos/client/echo';

import { SKETCH_PLUGIN } from './types';

export const objectToGraphNode = (
  parent: Graph.Node<Space>,
  object: SketchType,
  index: string,
): Graph.Node<SketchType> => {
  const [child] = parent.addNode({
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
