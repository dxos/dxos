//
// Copyright 2024 DXOS.org
//
import { signal } from '@preact/signals-core';

import { Resource } from '@dxos/context';
import { type JsonProp, type MutableSchema } from '@dxos/echo-schema';

import { type KanbanType } from './kanban';

export type BaseKanbanItem = Record<JsonProp, any> & { id: string };

export type KanbanModelProps = {
  kanban: KanbanType;
  cardSchema: MutableSchema;
};

export type ColumnProps = {
  label: string;
};

export class KanbanModel<T extends BaseKanbanItem = { id: string }> extends Resource {
  private readonly _kanban: KanbanType;
  private readonly _cardSchema: MutableSchema;
  private _items = signal<T[]>([]);

  constructor({ kanban, cardSchema }: KanbanModelProps) {
    super();
    this._kanban = kanban;
    this._cardSchema = cardSchema;
  }

  public setItems = (items: T[]): void => {
    this._items.value = items;
  };

  public cardSchema = () => {
    return this._cardSchema;
  };

  public itemsByColumn = (): Record<string, T[]> => {
    const pivotField = this._kanban.columnPivotField;
    const knownColumns = this._kanban.columnOrder;
    if (pivotField && knownColumns) {
      const result = knownColumns.reduce((acc: Record<string, T[]>, columnId) => {
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
  };
}
