//
// Copyright 2023 DXOS.org
//

import { ObservableArray, subscribe } from '@dxos/observable-object';

// TODO(burdon): Pluggable content (e.g., support text document for title).
export type KanbanItem = { id: string; content: string };

// TODO(burdon): Why?
export type GenericKanbanItem = KanbanItem & { [key: string]: any };

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
  columns: KanbanColumns<T>;
};

// TODO(burdon): Why array?
export const isKanban = <T extends KanbanItem = GenericKanbanItem>(datum: unknown): datum is KanbanModel<T> =>
  datum && typeof datum === 'object'
    ? 'id' in datum &&
      typeof datum.id === 'string' &&
      'columns' in datum &&
      Array.isArray(datum.columns) &&
      subscribe in datum.columns
    : false;
