//
// Copyright 2023 DXOS.org
//

import { ObservableArray, subscribe } from '@dxos/observable-object';

/**
 * Kanban data model.
 * A Kanban board is a collection of columns, each of which contains a collection of items.
 * The layout of columns and items is controlled by models.
 * The underlying data model may be represented by direct object relationships
 * (e.g., a column object containing an array of ordered items) or projections constructed
 * by the model (e.g., a query of items based on metadata within a column object).
 */

// TODO(burdon): How are types mapped onto ECHO? I.e., relationship between ECHO object/array and Observable.
// TODO(burdon): Can the plugin configure the object based on the datum? E.g., how are the models constructed?

// TODO(burdon): Create models. Simple first based on actual data.
//  Model is always a projection since the dragging state is tentative.
//  Can plugin inject context for model?

// NEXT:
//  - Discuss mapping of objects onto models (esp. Observable).
//  - E.g., Observable as part of the model data interface.
//  - E.g., Can methods be added to Observables or should a model contain an Observable.
//  - E.g., Add/move/remove columns and items.

// TODO(burdon): Pluggable content (e.g., support text document for title).
export type KanbanItem = { id: string; content: string };

// TODO(burdon): Use protobuf typedefs?
export type GenericKanbanItem = KanbanItem & { [key: string]: any };

// TODO(burdon): Implement ColumnModel with callbacks.
export type KanbanColumnModel<T extends KanbanItem = GenericKanbanItem> = {
  id: string;
  title: string;
  items: ObservableArray<T>;
};

// TODO(burdon): When to use Model suffix?
export type KanbanModel<T extends KanbanItem = GenericKanbanItem> = {
  id: string;
  title: string;
  // TODO(burdon): How is this mapped onto ECHO?
  columns: ObservableArray<KanbanColumnModel<T>>;
};

// TODO(burdon): Why array? Test data type?
export const isKanban = <T extends KanbanItem = GenericKanbanItem>(datum: unknown): datum is KanbanModel<T> =>
  datum && typeof datum === 'object'
    ? 'id' in datum &&
      typeof datum.id === 'string' &&
      'columns' in datum &&
      Array.isArray(datum.columns) &&
      subscribe in datum.columns
    : false;

export type Location = {
  column: KanbanColumnModel;
  item?: KanbanItem;
  idx?: number;
};

// TODO(burdon): Move to model.
export const findLocation = (columns: KanbanColumnModel[], id: string): Location | undefined => {
  let cell: Location | undefined;
  for (const column of columns) {
    if (column.id === id) {
      cell = { column };
      break;
    } else {
      const idx = column.items.findIndex((item) => item.id === id);
      if (idx !== -1) {
        cell = { column, item: column.items[idx], idx };
        break;
      }
    }
  }

  return cell;
};
