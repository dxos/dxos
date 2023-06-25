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

// TODO(burdon): Pluggable content (e.g., support text document for title).
export type KanbanItem = { id: string; content: string };

// TODO(burdon): Use protobuf typedefs?
export type GenericKanbanItem = KanbanItem & { [key: string]: any };

// TODO(burdon): Implement ColumnModel with callbacks.
export type KanbanColumn<T extends KanbanItem = GenericKanbanItem> = {
  id: string;
  title: string;
  items: ObservableArray<T>;
};

export type KanbanColumns<T extends KanbanItem = GenericKanbanItem> = ObservableArray<KanbanColumn<T>>;

// TODO(burdon): When to use Model suffix?
export type KanbanModel<T extends KanbanItem = GenericKanbanItem> = {
  id: string;
  title: string;
  // TODO(burdon): How is this mapped onto ECHO?
  columns: KanbanColumns<T>;
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

export type Cell = {
  column: KanbanColumn;
  item?: KanbanItem;
  idx?: number;
};

// TODO(burdon): Move to model.
export const findCell = (columns: KanbanColumn[], id: string): Cell | undefined => {
  let cell: Cell | undefined;
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
