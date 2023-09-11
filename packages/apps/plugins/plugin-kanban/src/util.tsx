//
// Copyright 2023 DXOS.org
//

import { Kanban, PencilSimpleLine, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { Graph } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { getPersistenceParent } from '@braneframe/plugin-treeview';
import { Kanban as KanbanType } from '@braneframe/types';
import { Space } from '@dxos/client/echo';

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

export const objectToGraphNode = (
  parent: Graph.Node<Space>,
  object: KanbanType,
  index: string,
): Graph.Node<KanbanType> => {
  const [child] = parent.add({
    id: object.id,
    label: object.title ?? ['kanban title placeholder', { ns: KANBAN_PLUGIN }],
    icon: (props) => <Kanban {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
      persistenceClass: 'spaceObject',
    },
  });

  child.addAction({
    id: 'rename',
    label: ['rename kanban label', { ns: KANBAN_PLUGIN }],
    icon: (props) => <PencilSimpleLine {...props} />,
    intent: {
      action: SpaceAction.RENAME_OBJECT,
      data: { spaceKey: getPersistenceParent(child, 'spaceObject')?.data?.key.toHex(), objectId: object.id },
    },
  });

  child.addAction({
    id: 'delete',
    label: ['delete kanban label', { ns: KANBAN_PLUGIN }],
    icon: (props) => <Trash {...props} />,
    intent: {
      action: SpaceAction.REMOVE_OBJECT,
      data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
    },
  });

  return child;
};
