//
// Copyright 2023 DXOS.org
//

import { CompassTool, PencilSimpleLine, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { Graph } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { getPersistenceParent } from '@braneframe/plugin-treeview'; // TODO(burdon): Move to graph?
import { Sketch as SketchType } from '@braneframe/types';
import { Space } from '@dxos/client/echo';

import { SKETCH_PLUGIN } from './types';

export const objectToGraphNode = (
  parent: Graph.Node<Space>,
  object: SketchType,
  index: string,
): Graph.Node<SketchType> => {
  const [child] = parent.add({
    id: object.id,
    label: object.title ?? ['object title placeholder', { ns: SKETCH_PLUGIN }],
    icon: (props) => <CompassTool {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
      persistenceClass: 'spaceObject',
    },
  });

  child.addAction({
    id: 'rename',
    label: ['rename object label', { ns: SKETCH_PLUGIN }],
    icon: (props) => <PencilSimpleLine {...props} />,
    intent: {
      action: SpaceAction.RENAME_OBJECT,
      data: { spaceKey: getPersistenceParent(child, 'spaceObject')?.data?.key.toHex(), objectId: object.id },
    },
  });

  child.addAction({
    id: 'delete',
    label: ['delete object label', { ns: SKETCH_PLUGIN }],
    icon: (props) => <Trash {...props} />,
    intent: {
      action: SpaceAction.REMOVE_OBJECT,
      data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
    },
  });

  return child;
};
