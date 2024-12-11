//
// Copyright 2024 DXOS.org
//
import { signal } from '@preact/signals-core';

import { Resource } from '@dxos/context';
import { type JsonProp, type MutableSchema } from '@dxos/echo-schema';
import type { StackItemRearrangeHandler } from '@dxos/react-ui-stack';

import { type KanbanType } from './kanban';

export type BaseKanbanItem = Record<JsonProp, any> & { id: string };

export type KanbanModelProps = {
  kanban: KanbanType;
  cardSchema: MutableSchema;
};

export type ColumnProps = {
  label: string;
};

export type KanbanArrangement<T extends BaseKanbanItem = { id: string }> = Record<string, T[]>;

export class KanbanModel<T extends BaseKanbanItem = { id: string }> extends Resource {
  private readonly _kanban: KanbanType;
  private readonly _cardSchema: MutableSchema;
  private _items = signal<T[]>([]);

  constructor({ kanban, cardSchema }: KanbanModelProps) {
    super();
    this._kanban = kanban;
    this._cardSchema = cardSchema;
  }

  get items() {
    return this._items.value;
  }

  set items(items: T[]) {
    this._items.value = items;
  }

  get cardSchema() {
    return this._cardSchema;
  }

  get arrangement(): KanbanArrangement<T> {
    const pivotField = this._kanban.columnPivotField;
    const knownColumns = this._kanban.columnOrder;
    if (pivotField && knownColumns) {
      const result = knownColumns.reduce((acc: KanbanArrangement<T>, columnId) => {
        acc[columnId] = [];
        return acc;
      }, {});
      this._items.value.forEach((item) => {
        const pivotValue = item[pivotField as keyof typeof item] as string;
        if (knownColumns.includes(pivotValue)) {
          result[pivotValue] ??= [];
          result[pivotValue].push(item);
        }
      });
      // TODO(thure): Sort by manual sort order available in KanbanType.
      return result;
    }
    return {};
  }

  public onRearrange: StackItemRearrangeHandler = (source, target, closestEdge) => {
    const arrangement = Object.entries(this.arrangement);
    const sourceColumn = arrangement.find(
      ([colId, items]) => colId === source.id || items.some((card) => card.id === source.id),
    );
    const targetColumn = arrangement.find(
      ([colId, items]) => colId === target.id || items.some((card) => card.id === target.id),
    );

    if (sourceColumn && targetColumn) {
      if (source.type === 'column' && target.type === 'column') {
        // Reordering columns
        const sourceIndex = arrangement.findIndex(([colId]) => colId === source.id);
        const targetIndex = arrangement.findIndex(([colId]) => colId === target.id);
        const [movedColumn] = arrangement.splice(sourceIndex, 1);
        const insertIndex = closestEdge === 'right' ? targetIndex + 1 : targetIndex;
        arrangement.splice(insertIndex, 0, movedColumn);
      } else {
        // Reordering cards within a column
        const sourceCardIndex = sourceColumn[1].findIndex((card) => card.id === source.id);
        const targetCardIndex = targetColumn[1].findIndex((card) => card.id === target.id);
        if (
          typeof sourceCardIndex === 'number' &&
          typeof targetCardIndex === 'number' &&
          sourceColumn[1] &&
          targetColumn[1]
        ) {
          const [movedCard] = sourceColumn[1].splice(sourceCardIndex, 1);

          let insertIndex;
          if (sourceColumn === targetColumn && sourceCardIndex < targetCardIndex) {
            insertIndex = closestEdge === 'bottom' ? targetCardIndex : targetCardIndex - 1;
          } else {
            insertIndex = closestEdge === 'bottom' ? targetCardIndex + 1 : targetCardIndex;
          }
          targetColumn[1].splice(insertIndex, 0, movedCard);
        }
      }
    }
  };
}
