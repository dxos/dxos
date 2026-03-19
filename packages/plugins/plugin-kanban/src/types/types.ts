//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';

import { type Kanban } from './Kanban';

export type Location = {
  idx?: number;
};

/** Snapshot shape used when reading kanban arrangement from atoms. */
export type KanbanArrangementSnapshot = Kanban | Obj.Snapshot<Kanban>;

/** Minimal item shape for arrangement; Obj.Unknown satisfies this. */
export type BaseKanbanItem = { id: string };

/** Column structure without cards; used for board model column type and derived atoms. */
export type ColumnStructure = {
  columnValue: string;
  ids: string[];
};

export type KanbanColumn<T extends BaseKanbanItem = BaseKanbanItem> = {
  columnValue: string;
  cards: T[];
};

export type ArrangedCards<T extends BaseKanbanItem = BaseKanbanItem> = KanbanColumn<T>[];

/**
 * Callback type for wrapping mutations in Obj.change().
 * Contains separate callbacks for kanban object and item mutations.
 */
export type KanbanChangeCallback<T extends BaseKanbanItem> = {
  /** Callback to wrap kanban object mutations. */
  kanban: (mutate: (mutableKanban: Obj.Mutable<Kanban>) => void) => void;

  /** Sets a field on an item, wrapping in Obj.change() if needed. */
  setItemField: (item: T, field: string, value: unknown) => void;
};
