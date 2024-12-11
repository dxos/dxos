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

export type KanbanArrangement<T extends BaseKanbanItem = { id: string }> = { columnValue: string; cards: T[] }[];

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
    const pivotField = this._kanban.columnField;
    const kanbanArrangement = this._kanban.arrangement;
    if (pivotField && kanbanArrangement) {
      return kanbanArrangement.map(({ columnValue, ids }) => {
        const orderMap = new Map(ids.map((id, index) => [id, index]));

        const prioritizedItems: T[] = [];
        const remainingItems: T[] = [];

        // Categorize items
        for (const item of this.items) {
          if (orderMap.has(item.id)) {
            prioritizedItems.push(item);
          } else {
            remainingItems.push(item);
          }
        }

        prioritizedItems.sort((a, b) => {
          const indexA = orderMap.get(a.id) ?? Infinity;
          const indexB = orderMap.get(b.id) ?? Infinity;
          return indexA - indexB;
        });

        return { columnValue, cards: [...prioritizedItems, ...remainingItems] };
      });
    }
    return [];
  }

  public onRearrange: StackItemRearrangeHandler = (source, target, closestEdge) => {
    const arrangement = this.arrangement;
    const sourceColumn = arrangement.find(
      ({ columnValue, cards }) => columnValue === source.id || cards.some((card) => card.id === source.id),
    );
    const targetColumn = arrangement.find(
      ({ columnValue, cards }) => columnValue === target.id || cards.some((card) => card.id === target.id),
    );

    if (sourceColumn && targetColumn) {
      if (source.type === 'column' && target.type === 'column') {
        // Reordering columns
        const sourceIndex = arrangement.findIndex(({ columnValue }) => columnValue === source.id);
        const targetIndex = arrangement.findIndex(({ columnValue }) => columnValue === target.id);
        const [movedColumn] = arrangement.splice(sourceIndex, 1);
        const insertIndex = closestEdge === 'right' ? targetIndex + 1 : targetIndex;
        arrangement.splice(insertIndex, 0, movedColumn);
      } else {
        // Reordering cards within a column
        const sourceCardIndex = sourceColumn.cards.findIndex((card) => card.id === source.id);
        const targetCardIndex = targetColumn.cards.findIndex((card) => card.id === target.id);
        if (
          typeof sourceCardIndex === 'number' &&
          typeof targetCardIndex === 'number' &&
          sourceColumn.cards &&
          targetColumn.cards
        ) {
          const [movedCard] = sourceColumn.cards.splice(sourceCardIndex, 1);

          let insertIndex;
          if (sourceColumn === targetColumn && sourceCardIndex < targetCardIndex) {
            insertIndex = closestEdge === 'bottom' ? targetCardIndex : targetCardIndex - 1;
          } else {
            insertIndex = closestEdge === 'bottom' ? targetCardIndex + 1 : targetCardIndex;
          }
          targetColumn.cards.splice(insertIndex, 0, movedCard);
        }
      }

      this._kanban.arrangement = arrangement.map(({ columnValue, cards }) => {
        return { columnValue, ids: cards.map(({ id }) => id) };
      });
    }
  };
}
