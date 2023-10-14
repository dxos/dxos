//
// Copyright 2023 DXOS.org
//

import { Kanban } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { Node } from '@braneframe/plugin-graph';
import { type Kanban as KanbanType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';

import { KANBAN_PLUGIN, type Location } from './types';

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

export const objectToGraphNode = (parent: Node<Space>, object: KanbanType, index: string): Node<KanbanType> => {
  const [child] = parent.addNode(KANBAN_PLUGIN, {
    id: object.id,
    label: object.title ?? ['kanban title placeholder', { ns: KANBAN_PLUGIN }],
    icon: (props) => <Kanban {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
      persistenceClass: 'spaceObject', // TODO(burdon): ???
    },
  });

  return child;
};
