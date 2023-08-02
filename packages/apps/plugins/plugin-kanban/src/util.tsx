//
// Copyright 2023 DXOS.org
//

import { Kanban, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { GraphNode } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Kanban as KanbanType } from '@braneframe/types';

import { KANBAN_PLUGIN, Location } from './types';

/**
 * Find the column or item within the model.
 */
// TODO(burdon): Move to model.
export const findLocation = (columns: KanbanType.Column[], id: string): Location | undefined => {
  for (const column of columns) {
    // TODO(burdon): Need transient ID for UX.
    if (column.id === id) {
      return { column };
    } else {
      const idx = column.items!.findIndex((item) => item.id === id);
      if (idx !== -1) {
        return { column, item: column.items![idx], idx };
      }
    }
  }
};

export const objectToGraphNode = (parent: GraphNode, object: KanbanType, index: string): GraphNode => ({
  id: object.id,
  index: get(object, 'meta.index', index), // TODO(burdon): Data should not be on object?
  label: object.title ?? ['kanban title placeholder', { ns: KANBAN_PLUGIN }],
  icon: (props) => <Kanban {...props} />,
  data: object,
  parent,
  pluginActions: {
    [KANBAN_PLUGIN]: [
      {
        id: 'delete', // TODO(burdon): Namespac@e.
        index: 'a1',
        label: ['delete kanban label', { ns: KANBAN_PLUGIN }],
        icon: (props) => <Trash {...props} />,
        intent: {
          action: SpaceAction.REMOVE_OBJECT,
          data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
        },
      },
    ],
  },
});
