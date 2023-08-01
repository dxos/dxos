//
// Copyright 2023 DXOS.org
//

import { CompassTool, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { GraphNode } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Drawing as DrawingType } from '@braneframe/types';

import { DRAWING_PLUGIN } from './types';

export const objectToGraphNode = (parent: GraphNode, object: DrawingType, index: string): GraphNode => ({
  id: object.id,
  index: get(object, 'meta.index', index), // TODO(burdon): Data should not be on object?
  label: object.title ?? ['drawing title placeholder', { ns: DRAWING_PLUGIN }],
  icon: (props) => <CompassTool {...props} />,
  data: object,
  parent,
  pluginActions: {
    [DRAWING_PLUGIN]: [
      {
        id: 'delete',
        index: 'a1',
        label: ['delete drawing label', { ns: DRAWING_PLUGIN }],
        icon: (props) => <Trash {...props} />,
        intent: {
          action: SpaceAction.REMOVE_OBJECT,
          data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
        },
      },
    ],
  },
});
