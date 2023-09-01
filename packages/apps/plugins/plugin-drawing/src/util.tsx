//
// Copyright 2023 DXOS.org
//

import { CompassTool, PencilSimpleLine, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { Graph } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { getPersistenceParent } from '@braneframe/plugin-treeview'; // TODO(burdon): Move to graph.
import { Drawing as DrawingType } from '@braneframe/types';
import { Space } from '@dxos/client/echo';

import { DRAWING_PLUGIN } from './types';

export const objectToGraphNode = (
  parent: Graph.Node<Space>,
  object: DrawingType,
  index: string,
): Graph.Node<DrawingType> => {
  const [child] = parent.add({
    id: object.id,
    label: object.title ?? ['drawing title placeholder', { ns: DRAWING_PLUGIN }],
    icon: (props) => <CompassTool {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index), // TODO(burdon): Data should not be on object?
    },
  });

  child.addAction({
    id: 'rename',
    label: ['rename document label', { ns: DRAWING_PLUGIN }],
    icon: (props) => <PencilSimpleLine {...props} />,
    intent: {
      action: SpaceAction.RENAME_OBJECT,
      data: { spaceKey: getPersistenceParent(child, 'spaceObject')?.data?.key.toHex(), objectId: document.id },
    },
  });

  child.addAction({
    id: 'delete',
    label: ['delete drawing label', { ns: DRAWING_PLUGIN }],
    icon: (props) => <Trash {...props} />,
    intent: {
      action: SpaceAction.REMOVE_OBJECT,
      data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
    },
  });

  return child;
};
