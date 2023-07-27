//
// Copyright 2023 DXOS.org
//

import { Kanban, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { GraphNode, GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import { SpaceAction } from '@braneframe/plugin-space';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { Kanban as KanbanType } from '@braneframe/types';
import { isTypedObject } from '@dxos/client/echo';

/**
 * Kanban data model.
 * A Kanban board is a collection of columns, each of which contains a collection of items.
 * The layout of columns and items is controlled by models.
 * The underlying data model may be represented by direct object relationships
 * (e.g., a column object containing an array of ordered items) or projections constructed
 * by the model (e.g., a query of items based on metadata within a column object).
 */

// TODO(burdon): Make id consistent with other plugins.
export const KANBAN_PLUGIN = 'dxos.org/plugin/kanban';

const KANBAN_ACTION = `${KANBAN_PLUGIN}/action`;
export enum KanbanAction {
  CREATE = `${KANBAN_ACTION}/create`,
}

export type KanbanPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;

// TODO(burdon): Undo?
// TODO(burdon): Typescript types (replace proto with annotations?)
// TODO(burdon): Should pure components depend on ECHO? Relationship between ECHO object/array and Observable.
// TODO(burdon): Can the plugin configure the object based on the datum? E.g., how are the models constructed?
// TODO(burdon): Create models. Simple first based on actual data.
//  Model is always a projection since the dragging state is tentative.

// TODO(burdon): Extend model for moving items (in and across columns).
export interface KanbanModel {
  root: KanbanType;
  createColumn(): KanbanType.Column;
  createItem(column: KanbanType.Column): KanbanType.Item;
}

export const isKanban = (datum: unknown): datum is KanbanType => {
  return isTypedObject(datum) && KanbanType.type.name === datum.__typename;
};

export type Location = {
  column: KanbanType.Column;
  item?: KanbanType.Item;
  idx?: number;
};

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

export const kanbanToGraphNode = (parent: GraphNode, object: KanbanType, index: string): GraphNode => ({
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
